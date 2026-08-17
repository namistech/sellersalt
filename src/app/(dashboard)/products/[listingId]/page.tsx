import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { createEtsyClient } from "@/connectors/etsy";
import { ProductDetailClient, type ProductDetailData } from "./product-detail-client";

/** Etsy's listing image resource exposes several pre-sized CDN URLs; prefer the
 * largest that's actually populated, matching the same priority order already
 * used elsewhere in the app (product-hunting.ts / seo-engine.ts) when
 * normalizing raw Etsy image objects. */
function extractEtsyImageUrls(rawImages: unknown): string[] {
  const urls: string[] = [];
  if (Array.isArray(rawImages)) {
    for (const img of rawImages) {
      const url = img?.url_570xN || img?.url_fullxfull || img?.url_75x75;
      if (url) urls.push(url);
    }
  }
  return urls;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session);
  const { listingId } = await params;
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  const prospect = await prisma.prospect.findFirst({
    where: {
      OR: [
        { id: listingId },
        { listingExternalId: listingId },
      ],
    },
  });

  // Live Etsy fetch: the source of the real, complete multi-image gallery (the local
  // Prospect row only ever stores one thumbnail URL captured at search time), and —
  // when no matching Prospect row exists at all — the only possible source of real
  // data for this listing. Failures here (rate limit, listing pulled from Etsy,
  // network error) are caught and just leave liveListing/liveShop null; the fields
  // below fall back to Prospect data, and if neither source resolved anything we
  // render a genuine not-found state rather than fabricated content.
  const externalListingId = prospect?.listingExternalId ?? listingId;
  const isNumericListingId = /^\d+$/.test(String(externalListingId).trim());

  let liveListing: any = null;
  let liveShop: any = null;
  if (isNumericListingId && organizationId) {
    try {
      const active = await getActiveConnectorWithCredentials(organizationId, "ETSY");
      const apiKey = active?.credentials?.apiKey || process.env.ETSY_API_KEY || "";
      const sharedSecret = active?.credentials?.sharedSecret || process.env.ETSY_SHARED_SECRET || "";

      if (apiKey) {
        const client = createEtsyClient(apiKey, sharedSecret);
        liveListing = await client.getListing(externalListingId, { organizationId });

        if (liveListing?.shop_id) {
          try {
            liveShop = await client.getShop(liveListing.shop_id, { organizationId });
          } catch {
            // Shop enrichment is optional — listing data alone is still usable.
            liveShop = null;
          }
        }
      }
    } catch {
      liveListing = null;
      liveShop = null;
    }
  }

  // Nothing real to show: no local record and the live Etsy fetch also came back
  // empty. Do not fabricate a placeholder product — genuinely 404.
  if (!prospect && !liveListing) {
    notFound();
  }

  const liveImages = extractEtsyImageUrls(liveListing?.images);
  const images = liveImages.length > 0 ? liveImages : prospect?.listingImageUrl ? [prospect.listingImageUrl] : [];
  const imageUrl = images[0] ?? "";

  const title = prospect?.listingTitle ?? liveListing?.title ?? "Untitled Listing";
  const price =
    prospect?.price ??
    (liveListing?.price ? liveListing.price.amount / (liveListing.price.divisor || 100) : 0);

  const shopId = prospect?.shopExternalId ?? String(liveListing?.shop_id ?? listingId);
  const shopName = prospect?.shopName ?? liveShop?.shop_name ?? `Shop ${shopId}`;
  const shopUrl = prospect?.shopUrl ?? liveShop?.url ?? `https://www.etsy.com/shop/${shopName}`;
  const shopTotalSales = prospect?.totalSales ?? liveShop?.transaction_sold_count ?? 0;
  const shopReviewCount = prospect?.reviewCount ?? liveShop?.review_count ?? 0;
  const shopAgeMonths =
    prospect?.shopAgeMonths ??
    (liveShop?.create_date
      ? Math.max(1, Math.round((Date.now() - liveShop.create_date * 1000) / (30.44 * 24 * 3600 * 1000)))
      : 1);

  const numFavorers = prospect?.numFavorers ?? liveListing?.num_favorers ?? 0;
  const views = liveListing?.views ?? 0;

  const liveTags = Array.isArray(liveListing?.tags) ? liveListing.tags.filter(Boolean) : [];
  const tags: string[] = liveTags.length > 0 ? liveTags : prospect?.keyword ? [prospect.keyword] : [];

  const category = prospect?.keyword ?? (liveListing?.taxonomy_path ? String(liveListing.taxonomy_path) : "Uncategorized");

  const createdTimestampSeconds: number | undefined =
    liveListing?.created_timestamp ?? (prospect ? Math.floor(prospect.createdAt.getTime() / 1000) : undefined);
  const createdDate = createdTimestampSeconds
    ? new Date(createdTimestampSeconds * 1000).toLocaleDateString()
    : "Recent";
  const listingAgeDays = createdTimestampSeconds
    ? Math.max(1, Math.round((Date.now() - createdTimestampSeconds * 1000) / (24 * 3600 * 1000)))
    : 1;

  const estDailySales =
    prospect?.estDailySales ?? (shopTotalSales > 0 ? shopTotalSales / (shopAgeMonths * 30.44) : 0);
  const estMonthlySales = Math.round(estDailySales * 30.44);
  const estMonthlyRevenue = Math.round(estMonthlySales * price);
  const feeEstimate = price * 0.095 + 0.2;
  const estNetProfit = Math.max(0, price - feeEstimate - price * 0.25);
  const profitMarginPercent = price > 0 ? Math.round((estNetProfit / price) * 100) : 0;

  // Deterministic, explainable SEO score derived from the same three signals the
  // "Listing Content & Visual Audit" section below already benchmarks against
  // (image count out of 10 slots, tag count out of Etsy's 13 tag slots, title
  // length out of Etsy's 140-char limit) — not a fabricated fixed number. Badged
  // as SELLERSALT_SCORE (not ACTUAL_ETSY_DATA) in the client component.
  const seoScore = Math.min(
    100,
    Math.round(
      Math.min(40, (title.length / 140) * 40) +
        Math.min(40, (tags.length / 13) * 40) +
        Math.min(20, (Math.max(images.length, imageUrl ? 1 : 0) / 10) * 20)
    )
  );

  // opportunityScore is currently an unused field on ProductDetailData (the client
  // component recomputes its own live score via evaluateProductOpportunity from
  // the same real inputs), kept here only for interface completeness — sourced
  // from real resolved values rather than a fixed placeholder.
  const opportunityScore = Math.min(
    100,
    Math.max(0, Math.round((estDailySales / 4) * 60 + (numFavorers > 0 ? 20 : 0) + (shopReviewCount > 50 ? 20 : 0)))
  );

  const product: ProductDetailData = {
    listingId: prospect?.id ?? listingId,
    title,
    price,
    currency: "USD",
    images,
    imageUrl,
    listingUrl: prospect?.listingUrl ?? liveListing?.url ?? `https://www.etsy.com/listing/${listingId}`,
    shopId,
    shopName,
    shopUrl,
    shopTotalSales,
    shopReviewCount,
    shopAgeMonths,
    category,
    tags,
    createdDate,
    listingAgeDays,
    numFavorers,
    views,
    opportunityScore,
    estDailySales,
    estMonthlySales,
    estMonthlyRevenue,
    estNetProfit,
    profitMarginPercent,
    seoScore,
  };

  return <ProductDetailClient product={product} isAuthenticated={isAuthenticated} />;
}
