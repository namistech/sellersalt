import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startShopWatch } from "@/lib/queue";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { checkLimit } from "@/lib/plan-limits";
import { extractEtsyShopName } from "@/lib/etsy-url-parser";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;
    if (!organizationId) {
      return NextResponse.json(
        { error: "Please log in to your SellerSalt account to track competitor shops." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { url } = body;
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid Etsy shop link or shop name to start tracking." },
        { status: 400 }
      );
    }

    const shopName = extractEtsyShopName(url);
    if (!shopName) {
      return NextResponse.json(
        {
          error: "Invalid Etsy link format. Please provide a URL like 'etsy.com/shop/ShopName' or enter the shop name directly.",
        },
        { status: 400 }
      );
    }

    const active = await getActiveConnectorWithCredentials(organizationId);
    if (!active || !active.connector.getShopByName) {
      return NextResponse.json(
        { error: "Marketplace connection is temporarily initializing. Please try again in a moment." },
        { status: 503 }
      );
    }

    let stats: any = null;
    try {
      stats = await active.connector.getShopByName(active.credentials, shopName);
    } catch (apiErr: any) {
      console.error("[ETSY_GET_SHOP_BY_NAME_ERROR]", apiErr);
      if (apiErr?.status === 429) {
        return NextResponse.json(
          { error: "Etsy API rate limit reached. Please wait a few seconds and try again." },
          { status: 429 }
        );
      }
    }

    if (!stats) {
      return NextResponse.json(
        { error: `SellerSalt couldn't find a shop named "${shopName}" on Etsy. Please check the shop name or URL and try again.` },
        { status: 404 }
      );
    }

    const existingWatch = await prisma.shopWatch.findUnique({
      where: { organizationId_shopExternalId: { organizationId, shopExternalId: stats.shopExternalId } },
    });

    if (!existingWatch || !existingWatch.isActive) {
      const limitCheck = await checkLimit(organizationId, "trackedShops");
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: `Your plan allows tracking up to ${limitCheck.limit} shop(s) at once. Upgrade to track more competitor stores.` },
          { status: 403 }
        );
      }
    }

    const watch = await prisma.shopWatch.upsert({
      where: { organizationId_shopExternalId: { organizationId, shopExternalId: stats.shopExternalId } },
      create: {
        organizationId,
        connectorId: active.connectorRow.id,
        shopExternalId: stats.shopExternalId,
        shopName: stats.shopName,
        isActive: true,
      },
      update: { isActive: true, shopName: stats.shopName },
    });

    // Capture initial snapshot immediately
    try {
      await prisma.shopSnapshot.create({
        data: {
          shopWatchId: watch.id,
          totalSales: stats.totalSales ?? 0,
          reviewCount: stats.reviewCount ?? 0,
          reviewAverage: stats.reviewAverage ?? null,
          activeListings: stats.activeListings ?? 0,
          numFavorers: stats.numFavorers ?? null,
        },
      });
    } catch (snapErr) {
      console.error("[RESOLVE_INITIAL_SNAPSHOT_ERROR]", snapErr);
    }

    // Schedule 6-hour recurring surveillance
    try {
      await startShopWatch({
        shopWatchId: watch.id,
        organizationId,
        connectorId: active.connectorRow.id,
        shopExternalId: stats.shopExternalId,
      });
    } catch (schedErr) {
      console.error("[RESOLVE_SCHEDULE_ERROR]", schedErr);
    }

    return NextResponse.json({
      success: true,
      shopExternalId: stats.shopExternalId,
      shopName: stats.shopName,
      message: `Started 6-hour competitor tracking for ${stats.shopName}.`,
    });
  } catch (err: any) {
    console.error("[SHOPS_RESOLVE_ERROR]", err);
    return NextResponse.json(
      { error: "SellerSalt couldn't fetch this shop right now. Please check the shop link and try again." },
      { status: 500 }
    );
  }
}
