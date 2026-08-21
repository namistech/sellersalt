/**
 * SellerSalt Walmart Public Web Acquisition Adapter
 * 
 * Extracts structured commerce observations from Walmart search and item pages
 * (JSON-LD, OpenGraph, structured product schemas).
 */

import {
  globalPageFetcher,
  PublicPageFetcher,
  extractJsonLdBlocks,
  parseProductFromJsonLd,
  parseCategoryBreadcrumbsFromJsonLd,
  parseOpenGraphData,
  extractListingIdFromUrl,
} from "../core/acquisition";
import type {
  PublicWebAcquisitionAdapter,
  PublicWebCapabilities,
  PublicSearchQuery,
  PublicAcquisitionResult,
} from "../core/acquisition/contracts";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import type {
  NormalizedProduct,
  SignalProvenance,
} from "../core/types";

export const WALMART_PUBLIC_WEB_CAPABILITIES: PublicWebCapabilities = {
  productSearch: true,
  productDetail: true,
  shopResearch: false,
  keywordDiscovery: false,
  categoryDiscovery: false,
  reviews: true,
  ratings: true,
  pricing: true,
  images: true,
  taxonomy: true,
  engagement: false,
  salesEstimation: false,
};

/**
 * Extracts real Walmart search-result items from the page's own embedded
 * `__NEXT_DATA__` Next.js hydration state (`props.pageProps.initialData.
 * searchResult.itemStacks[].items[]`) — the same JSON the page's own React
 * components render from, present verbatim in the server-rendered HTML
 * response we already fetch. This is far more reliable than scraping
 * atomic/hashed CSS class names (which change on every Walmart deploy) and
 * is not client-side JS execution or anti-bot evasion — it's parsing
 * structured data the server already sent us, the same category of
 * technique as this file's JSON-LD/OpenGraph parsing elsewhere. Verified
 * against a real live fetch while diagnosing why the previous HTML-regex
 * parser (kept below as `parseWalmartListingCardsFromRegexFallback`)
 * extracted zero real results: its card-boundary regex matched up to the
 * *first* nested `</div>` inside each card (a few characters in), never
 * the real card content, and its title/price selectors targeted a
 * build-specific hashed class name that no longer exists on the live site.
 */
function parseWalmartListingCardsFromNextData(html: string): NormalizedProduct[] {
  const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) return [];

  let data: any;
  try {
    data = JSON.parse(scriptMatch[1]);
  } catch {
    return [];
  }

  const itemStacks = data?.props?.pageProps?.initialData?.searchResult?.itemStacks;
  if (!Array.isArray(itemStacks)) return [];

  const products: NormalizedProduct[] = [];
  const seenIds = new Set<string>();

  for (const stack of itemStacks) {
    const items = stack?.items;
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const itemId = item?.usItemId ? String(item.usItemId) : null;
      const rawTitle = typeof item?.name === "string" ? item.name.trim() : "";
      if (!itemId || !rawTitle || seenIds.has(itemId)) continue;
      seenIds.add(itemId);

      // linePrice ("Now $X.XX") is the current buyable single-variant
      // price when present; minPrice is the numeric lowest-variant price
      // for multi-option items ("Options from $X.XX") — both are real,
      // server-provided values, never estimated. Walmart's search page
      // sometimes serves a variant (observed live, 2/3 consecutive real
      // requests during Batch 36's verification) where every item's
      // priceInfo is a "not yet loaded" placeholder — linePrice: "" and
      // minPrice: 0 — for every single item on the page. `0` there is a
      // sentinel, never a genuine product price, so it must be rejected
      // the same as a missing value (`> 0`, not just `typeof === "number"`)
      // or every downstream engine that filters `price > 0` gets an
      // honest zero-sample result, but every one that only checks
      // `typeof price === "number"` silently treats a real $0.00 as
      // observed data instead of unavailable.
      let price: number | null = null;
      const linePrice = item?.priceInfo?.linePrice;
      if (typeof linePrice === "string" && linePrice.trim()) {
        const parsed = parseFloat(linePrice.replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed) && parsed > 0) price = parsed;
      }
      if (price === null && typeof item?.priceInfo?.minPrice === "number" && item.priceInfo.minPrice > 0) {
        price = item.priceInfo.minPrice;
      }

      const rating = typeof item?.averageRating === "number" ? item.averageRating : null;
      const reviewCount = typeof item?.numberOfReviews === "number" ? item.numberOfReviews : null;
      const imageUrl = typeof item?.image === "string" ? item.image : undefined;
      const productUrl = typeof item?.canonicalUrl === "string"
        ? `https://www.walmart.com${item.canonicalUrl}`
        : `https://www.walmart.com/ip/${itemId}`;

      // Seller — real, per-item `sellerName`/`sellerId` fields already
      // present in the same hydration JSON (verified live during Batch
      // 37) but previously never read. No seller-registration/age field
      // exists anywhere in this item shape — confirmed by inspecting a
      // full real item's ~130 keys — so shop age stays genuinely
      // UNAVAILABLE for Walmart, not merely unparsed.
      const sellerName = typeof item?.sellerName === "string" ? item.sellerName : undefined;
      const sellerId = typeof item?.sellerId === "string" ? item.sellerId : undefined;

      // Category — `catalogProductType` (e.g. "Cups & Mugs") is Walmart's
      // own per-item category label; `departmentName` (e.g. "Home") is the
      // top-level department. Both real, both previously unread.
      const catalogProductType =
        typeof item?.catalogProductType === "string" ? item.catalogProductType : undefined;
      const departmentName =
        typeof item?.departmentName === "string" ? item.departmentName : undefined;
      const categoryPath = [departmentName, catalogProductType].filter(
        (v): v is string => typeof v === "string" && v.length > 0
      );

      // Availability — real server-computed stock status, not guessed.
      const availabilityValue = item?.availabilityStatusV2?.value;
      const availability: NormalizedProduct["availability"] =
        item?.isOutOfStock === true || availabilityValue === "OUT_OF_STOCK"
          ? "OUT_OF_STOCK"
          : availabilityValue === "IN_STOCK"
          ? "IN_STOCK"
          : null;

      // Badges — real on-page labels: sponsored-placement disclosure (so a
      // paid slot is never conflated with organic ranking/demand) plus any
      // real merchandising badge Walmart attaches (e.g. "Best seller",
      // "Rollback").
      const badges: string[] = [];
      if (item?.isSponsoredFlag === true) badges.push("Sponsored");
      const badgeFlags = item?.badges?.flags;
      if (Array.isArray(badgeFlags)) {
        for (const flag of badgeFlags) {
          if (flag && typeof flag.text === "string" && flag.text.trim()) {
            badges.push(flag.text.trim());
          }
        }
      }

      // Fulfillment type ("MARKETPLACE" / "FC" / "STORE") is a real,
      // server-provided classification of who ships the item — surfaced as
      // shipping info text rather than invented shipping copy.
      const fulfillmentLabels: Record<string, string> = {
        MARKETPLACE: "Sold by third-party marketplace seller",
        FC: "Fulfilled by Walmart",
        STORE: "Ships from Walmart store",
      };
      const shippingInfo =
        typeof item?.fulfillmentType === "string"
          ? fulfillmentLabels[item.fulfillmentType] ?? item.fulfillmentType
          : null;

      const normalized: NormalizedProduct = {
        marketplace: "walmart",
        externalId: itemId,
        title: rawTitle,
        url: productUrl,
        imageUrl,
        price,
        currency: "USD",
        rating,
        reviewCount,
        categoryPath: categoryPath.length > 0 ? categoryPath : undefined,
        availability,
        badges: badges.length > 0 ? badges : undefined,
        shippingInfo,
        shop: sellerName ? { name: sellerName, externalId: sellerId } : undefined,
        source: "ACTUAL_DATA" as SignalProvenance,
        acquisitionMethod: "PUBLIC_WEB",
        isHistorical: false,
        capturedAt: new Date(),
      };

      const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
      const report = evaluateCanonicalOpportunity(oppInput);
      if (report.overallScore !== null) {
        normalized.opportunityScore = {
          score: report.overallScore,
          confidence: report.confidenceScore,
          tier: report.tier,
          verdict: report.verdictLabel,
          verdictVariant: report.verdictVariant,
          availableSignals: report.signals.available.map((s) => s.id),
          unavailableSignals: report.signals.unavailable.map((s) => s.id),
        };
      }

      products.push(normalized);
    }
  }

  return products;
}

/**
 * Legacy HTML-regex extraction — kept as a fallback for a page shape
 * without `__NEXT_DATA__` (e.g. a cached/edge variant). Known to
 * frequently miss real cards (see the function above's doc comment); not
 * relied upon as the primary path any more.
 */
function parseWalmartListingCardsFromRegexFallback(html: string): NormalizedProduct[] {
  const products: NormalizedProduct[] = [];
  const cardRegex = /<div[^>]*data-item-id=["']([0-9]+)["'][^>]*>([\s\S]*?)<\/div>/gi;
  const matches = Array.from(html.matchAll(cardRegex));

  for (const match of matches) {
    const itemId = match[1];
    const cardChunk = match[2];

    // Title
    const titleMatch = cardChunk.match(/<span[^>]*class=["'][^"']*w_iUH7[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    if (!rawTitle) continue;

    // Price
    const priceMatch = cardChunk.match(/class=["'][^"']*w_iUH7[^"']*["'][^>]*>\$([0-9,.]+)<\/span>/i) || cardChunk.match(/\$([0-9]+\.[0-9]{2})/);
    let price: number | null = null;
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (isNaN(price)) price = null;
    }

    // Rating
    const ratingMatch = cardChunk.match(/([0-9.]+) out of 5 Stars/i);
    let rating: number | null = null;
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
      if (isNaN(rating)) rating = null;
    }

    // Review Count
    const reviewMatch = cardChunk.match(/\(([0-9,]+)\s*(?:reviews|ratings)\)/i);
    let reviewCount: number | null = null;
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1].replace(/,/g, ""), 10);
      if (isNaN(reviewCount)) reviewCount = null;
    }

    // Image URL
    const imgMatch = cardChunk.match(/<img[^>]*src=["']([^"']+)["']/i);
    const imageUrl = imgMatch ? imgMatch[1] : undefined;

    const productUrl = `https://www.walmart.com/ip/${itemId}`;

    const normalized: NormalizedProduct = {
      marketplace: "walmart",
      externalId: itemId,
      title: rawTitle,
      url: productUrl,
      imageUrl,
      price,
      currency: "USD",
      rating,
      reviewCount,
      source: "ACTUAL_DATA" as SignalProvenance,
      acquisitionMethod: "PUBLIC_WEB",
      isHistorical: false,
      capturedAt: new Date(),
    };

    const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
    const report = evaluateCanonicalOpportunity(oppInput);
    if (report.overallScore !== null) {
      normalized.opportunityScore = {
        score: report.overallScore,
        confidence: report.confidenceScore,
        tier: report.tier,
        verdict: report.verdictLabel,
        verdictVariant: report.verdictVariant,
        availableSignals: report.signals.available.map((s) => s.id),
        unavailableSignals: report.signals.unavailable.map((s) => s.id),
      };
    }

    products.push(normalized);
  }

  return products;
}

/**
 * Extracts Walmart search cards from search HTML — tries the reliable
 * `__NEXT_DATA__` JSON path first, falls back to HTML-regex extraction
 * only if that structure isn't present.
 */
export function parseWalmartListingCardsFromHtml(html: string): NormalizedProduct[] {
  if (!html || typeof html !== "string") return [];

  const fromJson = parseWalmartListingCardsFromNextData(html);
  if (fromJson.length > 0) return fromJson;

  return parseWalmartListingCardsFromRegexFallback(html);
}

/**
 * Extracts a real Walmart product-detail record from the product page's own
 * `__NEXT_DATA__` hydration state (`props.pageProps.initialData.data.product`).
 * Walmart's product pages (verified live during Batch 37) now ship only a
 * `WebPage`/speakable JSON-LD stub with no `Product` schema at all — the
 * previous `parseProductFromJsonLd` path was silently dead on every current
 * product page. This JSON carries substantially richer real fields than the
 * search-card JSON, including seller-level review stats
 * (`sellerReviewCount`/`sellerAverageRating`) not present on search cards.
 */
function parseWalmartProductFromNextData(html: string): NormalizedProduct | null {
  const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) return null;

  let data: any;
  try {
    data = JSON.parse(scriptMatch[1]);
  } catch {
    return null;
  }

  const product = data?.props?.pageProps?.initialData?.data?.product;
  const title = typeof product?.name === "string" ? product.name.trim() : "";
  if (!product || !title) return null;

  const itemId =
    (typeof product?.usItemId === "string" && product.usItemId) ||
    (typeof product?.primaryProductId === "string" && product.primaryProductId) ||
    "";

  const priceInfo = product?.priceInfo?.currentPrice;
  const price = typeof priceInfo?.price === "number" && priceInfo.price > 0 ? priceInfo.price : null;
  const currency = typeof priceInfo?.currencyUnit === "string" ? priceInfo.currencyUnit : "USD";

  const rating = typeof product?.averageRating === "number" ? product.averageRating : null;
  const reviewCount = typeof product?.numberOfReviews === "number" ? product.numberOfReviews : null;

  const imageUrl =
    typeof product?.imageInfo?.thumbnailUrl === "string"
      ? product.imageInfo.thumbnailUrl
      : Array.isArray(product?.imageInfo?.allImages) && product.imageInfo.allImages[0]?.url
      ? product.imageInfo.allImages[0].url
      : undefined;

  const categoryPathEntries = product?.category?.path;
  const categoryPath = Array.isArray(categoryPathEntries)
    ? categoryPathEntries.map((c: any) => c?.name).filter((n: any): n is string => typeof n === "string")
    : [];

  const availabilityValue = product?.availabilityStatusV2?.value;
  const availability: NormalizedProduct["availability"] =
    availabilityValue === "OUT_OF_STOCK" ? "OUT_OF_STOCK" : availabilityValue === "IN_STOCK" ? "IN_STOCK" : null;

  const brand = typeof product?.brand === "string" && product.brand.trim() ? product.brand.trim() : undefined;

  // Seller-level review stats exist here even when absent from search
  // cards — real, distinct from the product's own rating/reviewCount
  // above. No registration/age field is present anywhere in this JSON.
  const sellerName =
    typeof product?.sellerDisplayName === "string"
      ? product.sellerDisplayName
      : typeof product?.sellerName === "string"
      ? product.sellerName
      : undefined;
  const sellerId = typeof product?.sellerId === "string" ? product.sellerId : undefined;

  const normalized: NormalizedProduct = {
    marketplace: "walmart",
    externalId: itemId || title.slice(0, 40),
    title,
    url: typeof product?.canonicalUrl === "string" ? `https://www.walmart.com${product.canonicalUrl}` : undefined,
    imageUrl,
    price,
    currency,
    rating,
    reviewCount,
    categoryPath: categoryPath.length > 0 ? categoryPath : undefined,
    availability,
    brand,
    shop: sellerName ? { name: sellerName, externalId: sellerId } : undefined,
    source: "ACTUAL_DATA" as SignalProvenance,
    acquisitionMethod: "PUBLIC_WEB",
    isHistorical: false,
    capturedAt: new Date(),
  };

  const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
  const report = evaluateCanonicalOpportunity(oppInput);
  if (report.overallScore !== null) {
    normalized.opportunityScore = {
      score: report.overallScore,
      confidence: report.confidenceScore,
      tier: report.tier,
      verdict: report.verdictLabel,
      verdictVariant: report.verdictVariant,
      availableSignals: report.signals.available.map((s) => s.id),
      unavailableSignals: report.signals.unavailable.map((s) => s.id),
    };
  }

  return normalized;
}

export class WalmartPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "walmart" as const;
  readonly displayName = "Walmart";
  readonly domain = "walmart.com";
  readonly capabilities = WALMART_PUBLIC_WEB_CAPABILITIES;

  private pageFetcher: PublicPageFetcher;

  constructor(pageFetcher: PublicPageFetcher = globalPageFetcher) {
    this.pageFetcher = pageFetcher;
  }

  async searchPublicProducts(
    query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    const queryTerm = (query.query || "").trim();

    if (!queryTerm) {
      return {
        success: true,
        marketplace: "walmart",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        fetchedAt,
      };
    }

    const pageParam = query.page && query.page > 1 ? `&page=${query.page}` : "";
    const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(queryTerm)}${pageParam}`;

    try {
      const page = await this.pageFetcher.fetchPage(searchUrl);

      if (
        page.statusCode !== 200 ||
        !page.html ||
        page.html.includes("Robot or human?") ||
        page.html.includes("Verify your identity")
      ) {
        return {
          success: false,
          marketplace: "walmart",
          items: [],
          sourceUrl: searchUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          statusCode: page.statusCode,
          failureReason: "ACCESS_RESTRICTED",
          error: "Walmart public search is restricted without dedicated proxy infrastructure.",
          fetchedAt,
        };
      }

      // 1. Try card parser
      const cardProducts = parseWalmartListingCardsFromHtml(page.html);
      if (cardProducts.length > 0) {
        const limit = query.limit ?? 20;
        return {
          success: true,
          marketplace: "walmart",
          items: cardProducts.slice(0, limit),
          sourceUrl: searchUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "ACTUAL_DATA",
          statusCode: 200,
          fetchedAt,
        };
      }

      // 2. Try JSON-LD structured data
      const jsonLdBlocks = extractJsonLdBlocks(page.html);
      const parsed = parseProductFromJsonLd(jsonLdBlocks);
      const items: NormalizedProduct[] = [];

      if (parsed && parsed.name) {
        const itemId = extractListingIdFromUrl(page.url) || "walmart-1";
        const normalized: NormalizedProduct = {
          marketplace: "walmart",
          externalId: itemId,
          title: parsed.name,
          url: page.url,
          imageUrl: typeof parsed.image === "string" ? parsed.image : undefined,
          price: parsed.price ?? null,
          currency: parsed.currency || "USD",
          rating: parsed.ratingValue ?? null,
          reviewCount: parsed.reviewCount ?? null,
          source: "ACTUAL_DATA" as SignalProvenance,
          acquisitionMethod: "PUBLIC_WEB",
          isHistorical: false,
          capturedAt: fetchedAt,
        };

        const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
        const report = evaluateCanonicalOpportunity(oppInput);
        if (report.overallScore !== null) {
          normalized.opportunityScore = {
            score: report.overallScore,
            confidence: report.confidenceScore,
            tier: report.tier,
            verdict: report.verdictLabel,
            verdictVariant: report.verdictVariant,
            availableSignals: report.signals.available.map((s) => s.id),
            unavailableSignals: report.signals.unavailable.map((s) => s.id),
          };
        }

        items.push(normalized);
      }

      return {
        success: items.length > 0,
        marketplace: "walmart",
        items,
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: items.length > 0 ? "ACTUAL_DATA" : "UNAVAILABLE",
        statusCode: page.statusCode,
        failureReason: items.length === 0 ? "NO_DATA" : undefined,
        fetchedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        marketplace: "walmart",
        items: [],
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: err.message || "Failed to fetch Walmart search results",
        failureReason: "NETWORK_ERROR",
        fetchedAt,
      };
    }
  }

  async fetchPublicProduct(
    externalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    const itemId = extractListingIdFromUrl(externalIdOrUrl) || externalIdOrUrl.trim();
    const productUrl = externalIdOrUrl.startsWith("http")
      ? externalIdOrUrl
      : `https://www.walmart.com/ip/${itemId}`;

    try {
      const page = await this.pageFetcher.fetchPage(productUrl);

      if (
        page.statusCode !== 200 ||
        !page.html ||
        page.html.includes("Robot or human?") ||
        page.html.includes("Verify your identity")
      ) {
        return {
          success: false,
          marketplace: "walmart",
          items: [],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          statusCode: page.statusCode,
          failureReason: "ACCESS_RESTRICTED",
          error: "Walmart product page is restricted without dedicated proxy infrastructure.",
          fetchedAt,
        };
      }

      // Primary path: the page's own __NEXT_DATA__ product JSON (see
      // parseWalmartProductFromNextData's doc comment — JSON-LD no longer
      // carries Product schema on live Walmart product pages).
      const nextDataProduct = parseWalmartProductFromNextData(page.html);
      if (nextDataProduct) {
        return {
          success: true,
          marketplace: "walmart",
          items: [nextDataProduct],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "ACTUAL_DATA",
          statusCode: 200,
          fetchedAt,
        };
      }

      const jsonLdBlocks = extractJsonLdBlocks(page.html);
      const parsedJsonLd = parseProductFromJsonLd(jsonLdBlocks);
      const categoryPath = parseCategoryBreadcrumbsFromJsonLd(jsonLdBlocks);
      const openGraph = parseOpenGraphData(page.html);

      const title = parsedJsonLd?.name || openGraph.title || "";
      if (!title) {
        return {
          success: false,
          marketplace: "walmart",
          items: [],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          failureReason: "NO_DATA",
          error: "No product metadata found on Walmart page",
          fetchedAt,
        };
      }

      const imageUrl =
        (typeof parsedJsonLd?.image === "string" ? parsedJsonLd.image : undefined) ||
        openGraph.image;

      const normalized: NormalizedProduct = {
        marketplace: "walmart",
        externalId: itemId,
        title,
        url: productUrl,
        imageUrl,
        price: parsedJsonLd?.price ?? openGraph.priceAmount ?? null,
        currency: parsedJsonLd?.currency ?? openGraph.priceCurrency ?? "USD",
        rating: parsedJsonLd?.ratingValue ?? null,
        reviewCount: parsedJsonLd?.reviewCount ?? null,
        categoryPath: categoryPath.length > 0 ? categoryPath : undefined,
        shop: parsedJsonLd?.sellerName ? { name: parsedJsonLd.sellerName } : undefined,
        source: "ACTUAL_DATA" as SignalProvenance,
        acquisitionMethod: "PUBLIC_WEB",
        isHistorical: false,
        capturedAt: fetchedAt,
      };

      const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
      const report = evaluateCanonicalOpportunity(oppInput);
      if (report.overallScore !== null) {
        normalized.opportunityScore = {
          score: report.overallScore,
          confidence: report.confidenceScore,
          tier: report.tier,
          verdict: report.verdictLabel,
          verdictVariant: report.verdictVariant,
          availableSignals: report.signals.available.map((s) => s.id),
          unavailableSignals: report.signals.unavailable.map((s) => s.id),
        };
      }

      return {
        success: true,
        marketplace: "walmart",
        items: [normalized],
        sourceUrl: productUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        statusCode: 200,
        fetchedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        marketplace: "walmart",
        items: [],
        sourceUrl: productUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: err.message || "Failed to fetch Walmart product page",
        failureReason: "NETWORK_ERROR",
        fetchedAt,
      };
    }
  }
}

export const walmartPublicWebAdapter = new WalmartPublicWebAdapter();
