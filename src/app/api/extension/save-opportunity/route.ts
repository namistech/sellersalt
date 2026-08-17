import { NextResponse } from "next/server";
import { extractBearerToken, resolveExtensionSessionToken } from "@/lib/extension-pairing";
import { upsertCanonicalOpportunity } from "@/services/opportunity-memory";
import type { ExtensionSaveOpportunityRequest, ExtensionSaveOpportunityResponse } from "@/services/extension/contract";

export async function POST(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const identity = await resolveExtensionSessionToken(token);
  if (!identity) {
    return NextResponse.json({ error: "Session token is invalid or expired." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ExtensionSaveOpportunityRequest;
  const { listing, targetCategory, notes, addToPlanner = true } = body;

  if (!listing || !listing.title) {
    return NextResponse.json({ error: "Listing payload with title is required." }, { status: 400 });
  }

  const { opportunity, isNew } = upsertCanonicalOpportunity(identity.organizationId, {
    source: "EXTENSION",
    listingExternalId: listing.listingId,
    listingTitle: listing.title,
    listingUrl: listing.listingUrl,
    listingImageUrl: listing.imageUrl,
    category: targetCategory || "General",
    shopExternalId: listing.shopId,
    shopName: listing.shopName,
    price: listing.price || 25,
    targetKeywords: listing.tags,
    primaryKeyword: listing.tags && listing.tags.length > 0 ? listing.tags[0] : "etsy opportunity",
    stage: addToPlanner ? "SHORTLISTED" : "RESEARCHED",
  });

  const response: ExtensionSaveOpportunityResponse = {
    success: true,
    opportunityId: opportunity.id,
    plannerItemId: opportunity.relations.plannerItemId ?? undefined,
    isExistingUpdated: !isNew,
    message: isNew
      ? `Saved "${opportunity.listingTitle}" to your Opportunity Inbox & Planner.`
      : `Updated existing opportunity "${opportunity.listingTitle}" with fresh telemetry.`,
    nextBestAction: opportunity.nextBestAction,
  };

  return NextResponse.json(response);
}
