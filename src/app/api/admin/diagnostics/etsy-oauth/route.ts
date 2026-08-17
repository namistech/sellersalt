import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { getSetting } from "@/lib/app-settings";
import { resolveEtsyOAuthConfiguration, DEFAULT_ETSY_SCOPES } from "@/services/connectors/etsy-oauth-helper";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";

  const configuredClientId = await getSetting("etsy_seller_client_id");
  const configuredRedirectUri = await getSetting("etsy_redirect_uri");
  const configuredScopes = (await getSetting("etsy_oauth_scopes")) || DEFAULT_ETSY_SCOPES;
  const source: "APP_SETTING" | "CONNECTOR_TABLE" | "ENVIRONMENT" | "NONE" = configuredClientId ? "APP_SETTING" : "NONE";

  const diagnostic = resolveEtsyOAuthConfiguration({
    reqHost: host,
    reqProto: proto,
    overrideClientId: configuredClientId || undefined,
    overrideRedirectUri: configuredRedirectUri || undefined,
    credentialSource: source,
    scopes: configuredScopes,
  });

  return NextResponse.json({
    status: "ok",
    diagnostic,
    instructions: {
      productionCallback: "https://sellersalt.com/api/seller-channels/etsy/callback",
      stagingCallback: `${proto}://${host}/api/seller-channels/etsy/callback`,
      etsyDeveloperConsole: "https://www.etsy.com/developers/your-apps",
      requiredScopes: DEFAULT_ETSY_SCOPES.split(" "),
    },
  });
}
