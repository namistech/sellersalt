import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  auditListingSeo,
  fetchAndAuditEtsyListing,
  saveListingSeoAuditRecord,
} from "@/services/seo-engine";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";
import { mapConnectorError } from "@/services/connector-diagnostics";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

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
      return NextResponse.json({ audit });
    }

    // Mode B: Audit a supplied payload / draft
    if (!body.title && !Array.isArray(body.tags)) {
      return NextResponse.json(
        { error: "Either listingId or title and tags are required to perform an SEO audit." },
        { status: 400 }
      );
    }

    if (body.save) {
      const savedAudit = await saveListingSeoAuditRecord(organizationId, {
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
      });
      return NextResponse.json({ audit: savedAudit });
    }

    const audit = auditListingSeo({
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
    });

    return NextResponse.json({ audit });
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
