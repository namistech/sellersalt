import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchAndAuditShopSeo } from "@/services/shop-seo-audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { mapConnectorError } from "@/services/connector-diagnostics";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate Limiting on Shop SEO Audit (Part 4)
  const rateCheck = checkRateLimit(`seo:${organizationId}`, "EXPENSIVE_SEARCH");
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: `Rate limit reached. Please wait ${rateCheck.resetSeconds}s before auditing another shop.` },
      { status: 429, headers: rateCheck.headers }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { shopQuery, shopName, sellerChannelId } = body;

    if (!shopQuery && !shopName && !sellerChannelId) {
      return NextResponse.json(
        { error: "Please provide an Etsy shop name, shop URL, or select a connected shop." },
        { status: 400 }
      );
    }

    const audit = await fetchAndAuditShopSeo(organizationId, {
      shopQuery,
      shopName,
      sellerChannelId,
    });

    return NextResponse.json({ audit });
  } catch (err: any) {
    console.error("Shop SEO audit failed:", err);
    const diagnostic = mapConnectorError(err);
    return NextResponse.json(
      {
        error: diagnostic.explanation || err.message || "Failed to execute Shop SEO audit.",
        diagnostic,
      },
      { status: diagnostic.code === "RESOURCE_NOT_FOUND" ? 404 : diagnostic.code === "RATE_LIMITED" ? 429 : 500 }
    );
  }
}
