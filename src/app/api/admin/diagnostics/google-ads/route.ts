import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import {
  getGoogleAdsCredentials,
  testGoogleAdsConnection,
} from "@/services/google-keyword-planner";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/diagnostics/google-ads
 *
 * Inspects Google Ads / Keyword Planner configuration state.
 * Returns masked values without exposing plaintext tokens.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Forbidden — Admin access required" }, { status: 403 });
    }

    const creds = await getGoogleAdsCredentials();
    const isConfigured = creds !== null;

    const maskedClientId = creds?.clientId
      ? creds.clientId.length > 16
        ? `${creds.clientId.substring(0, 8)}••••••••${creds.clientId.substring(creds.clientId.length - 8)}`
        : "••••••••"
      : "NOT CONFIGURED";

    const maskedDevToken = creds?.developerToken
      ? `${creds.developerToken.substring(0, 4)}••••••••`
      : "NOT CONFIGURED";

    return NextResponse.json({
      configured: isConfigured,
      hasDeveloperToken: Boolean(creds?.developerToken),
      hasClientSecret: Boolean(creds?.clientSecret),
      hasRefreshToken: Boolean(creds?.refreshToken),
      maskedClientId,
      maskedDevToken,
      loginCustomerId: creds?.loginCustomerId || null,
      customerId: creds?.customerId || null,
      documentationUrl: "https://developers.google.com/google-ads/api/docs/keyword-planning/generate-keyword-ideas",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to inspect Google Ads diagnostics." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/diagnostics/google-ads
 *
 * Tests the live Google Ads API connection with the configured credentials.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Forbidden — Admin access required" }, { status: 403 });
    }

    const testResult = await testGoogleAdsConnection();
    return NextResponse.json(testResult);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Unexpected error testing Google Ads connection." },
      { status: 500 }
    );
  }
}
