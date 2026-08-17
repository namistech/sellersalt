import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSetting } from "@/lib/app-settings";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { resolveEtsyOAuthConfiguration, DEFAULT_ETSY_SCOPES } from "@/services/connectors/etsy-oauth-helper";

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";

  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  let configuredClientId = await getSetting("etsy_seller_client_id");
  let configuredRedirectUri = await getSetting("etsy_redirect_uri");
  let configuredScopes = (await getSetting("etsy_oauth_scopes")) || DEFAULT_ETSY_SCOPES;
  let source: "APP_SETTING" | "CONNECTOR_TABLE" | "ENVIRONMENT" | "NONE" = configuredClientId ? "APP_SETTING" : "NONE";

  if (!configuredClientId && organizationId) {
    const active = await getActiveConnectorWithCredentials(organizationId, "ETSY");
    if (active?.credentials?.apiKey) {
      configuredClientId = active.credentials.apiKey;
      source = "CONNECTOR_TABLE";
    }
  }

  const diagnostic = resolveEtsyOAuthConfiguration({
    reqHost: host,
    reqProto: proto,
    overrideClientId: configuredClientId || undefined,
    overrideRedirectUri: configuredRedirectUri || undefined,
    credentialSource: source,
    scopes: configuredScopes,
  });

  return NextResponse.json(diagnostic);
}
