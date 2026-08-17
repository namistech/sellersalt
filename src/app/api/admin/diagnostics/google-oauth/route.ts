import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { getSetting } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/diagnostics/google-oauth
 *
 * Safe admin diagnostic endpoint to inspect Google OAuth configuration.
 * Returns masked credentials, resolved callbacks, and setup status without
 * ever exposing plaintext secrets.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Forbidden — Admin access required" }, { status: 403 });
    }

    const dbClientId = await getSetting("google_client_id");
    const dbClientSecret = await getSetting("google_client_secret");

    const clientId = (dbClientId || process.env.GOOGLE_CLIENT_ID || "").trim();
    const clientSecret = (dbClientSecret || process.env.GOOGLE_CLIENT_SECRET || "").trim();

    const isPlaceholder =
      clientId.includes("placeholder") ||
      clientId.includes("your-google-client-id") ||
      !clientId.includes(".apps.googleusercontent.com");

    const isConfigured = Boolean(clientId && clientSecret && !isPlaceholder);

    const maskedClientId = clientId
      ? clientId.length > 16
        ? `${clientId.substring(0, 8)}••••••••${clientId.substring(clientId.length - 8)}`
        : "••••••••"
      : "NOT CONFIGURED";

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "sellersalt.com";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const currentOrigin = `${proto}://${host}`;

    return NextResponse.json({
      diagnostic: {
        configured: isConfigured,
        isPlaceholder,
        environment: process.env.NODE_ENV || "production",
        maskedClientId,
        hasClientSecret: Boolean(clientSecret && !clientSecret.includes("placeholder")),
        currentOriginCallback: `${currentOrigin}/api/auth/callback/google`,
        productionCallback: "https://sellersalt.com/api/auth/callback/google",
        stagingCallback: "https://staging.sellersalt.com/api/auth/callback/google",
        instructions: {
          step1: "Visit Google Cloud Console (https://console.cloud.google.com/apis/credentials)",
          step2: "Create or select your project, go to 'Credentials' -> 'Create Credentials' -> 'OAuth client ID'",
          step3: "Select 'Web application' as the Application type",
          step4: "Add Authorized redirect URIs matching both Production and Staging callbacks",
          step5: "Paste the Client ID and Client Secret into SellerSalt Admin Integration Hub",
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Diagnostic failed", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
