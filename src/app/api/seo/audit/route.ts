import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  auditListingSeo,
  fetchAndAuditEtsyListing,
  saveListingSeoAuditRecord,
  resolveMarketplaceForAudit,
} from "@/services/seo-engine";
import { getOptimizationRules } from "@/marketplaces/core/optimization-rules";
import type { MarketplaceId } from "@/marketplaces/core/types";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";
import { mapConnectorError } from "@/services/connector-diagnostics";
import { checkQuota } from "@/services/plans/quota-enforcement";

const SUPPORTED: MarketplaceId[] = ["etsy", "shopify", "woocommerce", "amazon", "ebay", "tiktok_shop"];

function resolveMarketplace(raw: unknown): MarketplaceId {
  return SUPPORTED.includes(raw as MarketplaceId) ? (raw as MarketplaceId) : "etsy";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quota = await checkQuota(organizationId, "SEO_AUDIT");
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.upgradeMessage }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Mode A always audits real fetched Etsy data, so it's intentionally
    // pinned to Etsy's rules regardless of `body.marketplace`/sellerChannelId
    // — only Mode B (a supplied draft payload) reflects the resolved
    // marketplace's rules.
    const marketplace = body.listingId
      ? ("etsy" as const)
      : await resolveMarketplaceForAudit(organizationId, body.sellerChannelId, resolveMarketplace(body.marketplace));
    const rules = getOptimizationRules(marketplace);

    // Mode A: Audit an existing live Etsy listing by ID or URL
    if (body.listingId) {
      const parsed = parseEtsyListingInput(body.listingId);
      if (parsed.isShopUrl) {
        return NextResponse.json(
          {
            error: parsed.error || "Pasted input is an Etsy shop rather than a listing.",
            isShopUrl: true,
            shopName: parsed.shopName,
            redirectUrl: parsed.shopName ? `/shops/${encodeURIComponent(parsed.shopName)}` : "/spy",
          },
          { status: 400 }
        );
      }
      if (!parsed.listingId) {
        return NextResponse.json(
          { error: parsed.error || "Invalid listing ID provided." },
          { status: 400 }
        );
      }

      const audit = await fetchAndAuditEtsyListing(organizationId, parsed.listingId);
      if (body.save) {
        await saveListingSeoAuditRecord(organizationId, {
          organizationId,
          title: audit.title,
          tags: audit.tags,
          description: audit.description,
          materials: audit.materials,
          taxonomyId: audit.taxonomyId,
          externalListingId: String(parsed.listingId),
          imageUrl: audit.imageUrl || undefined,
          listingUrl: audit.listingUrl,
          shopName: audit.shopName,
          price: audit.price,
        });
      }
      return NextResponse.json({ audit, marketplace });
    }

    // Mode B: Audit a supplied payload / draft
    if (!body.title && !Array.isArray(body.tags)) {
      return NextResponse.json(
        { error: "Either listingId or title and tags are required to perform an SEO audit." },
        { status: 400 }
      );
    }

    if (body.save) {
      const savedAudit = await saveListingSeoAuditRecord(
        organizationId,
        {
          organizationId,
          title: body.title || "",
          tags: Array.isArray(body.tags) ? body.tags : [],
          description: body.description || "",
          materials: Array.isArray(body.materials) ? body.materials : [],
          taxonomyId: body.taxonomyId,
          attributes: body.attributes,
          plannerItemId: body.plannerItemId,
          listingDraftId: body.listingDraftId,
          sellerChannelId: body.sellerChannelId,
          imageUrl: body.imageUrl,
          listingUrl: body.listingUrl,
          shopName: body.shopName,
          price: body.price,
        },
        rules
      );
      return NextResponse.json({ audit: savedAudit, marketplace });
    }

    const audit = auditListingSeo(
      {
        title: body.title || "",
        tags: Array.isArray(body.tags) ? body.tags : [],
        description: body.description || "",
        materials: Array.isArray(body.materials) ? body.materials : [],
        taxonomyId: body.taxonomyId,
        categoryPath: body.categoryPath,
        attributes: body.attributes,
        imageUrl: body.imageUrl,
        listingUrl: body.listingUrl,
        shopName: body.shopName,
        price: body.price,
        listingId: body.externalListingId,
      },
      rules
    );

    return NextResponse.json({ audit, marketplace });
  } catch (err: any) {
    console.error("SEO audit failed:", err);
    const diagnostic = mapConnectorError(err);
    return NextResponse.json(
      {
        error: diagnostic.explanation || err.message || "Failed to execute SEO diagnostic audit.",
        diagnostic,
      },
      { status: diagnostic.code === "RESOURCE_NOT_FOUND" ? 404 : diagnostic.code === "RATE_LIMITED" ? 429 : 500 }
    );
  }
}
