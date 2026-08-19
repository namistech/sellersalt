import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  discoverNichesFromDatabase,
  discoverLiveMarketplaceNiches,
} from "@/services/intelligence/niche-discovery";
import type { MarketplaceId } from "@/marketplaces/core/types";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || undefined;
  const marketplace = (searchParams.get("marketplace") as MarketplaceId) || "etsy";

  try {
    const summary = await discoverNichesFromDatabase(organizationId, marketplace, query);
    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("[NicheDiscoveryError]", err);
    return NextResponse.json({ error: err.message || "Failed to discover niches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const marketplace = (body.marketplace as MarketplaceId) || "etsy";
    const mode = body.mode === "database" ? "database" : "live";

    let summary;
    if (mode === "live" && query) {
      summary = await discoverLiveMarketplaceNiches(organizationId, marketplace, query, 30);
    } else {
      summary = await discoverNichesFromDatabase(organizationId, marketplace, query || undefined);
    }

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("[NicheDiscoveryError]", err);
    return NextResponse.json({ error: err.message || "Failed to discover niches" }, { status: 500 });
  }
}
