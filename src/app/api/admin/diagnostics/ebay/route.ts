import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import {
  getEbayCredentials,
  testEbayBrowseConnection,
} from "@/services/ebay-browse-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/diagnostics/ebay
 *
 * Inspects eBay REST / Browse API configuration state.
 * Returns masked values without exposing plaintext credentials.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Forbidden — Admin access required" }, { status: 403 });
    }

    const creds = await getEbayCredentials();
    const isConfigured = creds !== null;

    const maskedAppId = creds?.appId
      ? creds.appId.length > 12
        ? `${creds.appId.substring(0, 6)}••••••••${creds.appId.substring(creds.appId.length - 4)}`
        : "••••••••"
      : "NOT CONFIGURED";

    return NextResponse.json({
      configured: isConfigured,
      hasAppId: Boolean(creds?.appId),
      hasCertId: Boolean(creds?.certId),
      hasDevId: Boolean(creds?.devId),
      hasRuName: Boolean(creds?.ruName),
      maskedAppId,
      documentationUrl: "https://developer.ebay.com/api-docs/buy/browse/overview.html",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to inspect eBay diagnostics." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/diagnostics/ebay
 *
 * Tests the live eBay Buy Browse API connection with configured credentials.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Forbidden — Admin access required" }, { status: 403 });
    }

    const testResult = await testEbayBrowseConnection();
    return NextResponse.json(testResult);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Unexpected error testing eBay Browse API connection." },
      { status: 500 }
    );
  }
}
