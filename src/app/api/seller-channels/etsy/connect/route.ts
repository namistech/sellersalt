import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { checkLimit } from "@/lib/plan-limits";
import { createConnectToken } from "@/lib/store-connect-token";
import { getSetting } from "@/lib/app-settings";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { resolveEtsyOAuthRedirectUri, DEFAULT_ETSY_SCOPES } from "@/services/connectors/etsy-oauth-helper";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";

  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  let configuredClientId = await getSetting("etsy_seller_client_id");
  let configuredRedirectUri = await getSetting("etsy_redirect_uri");
  let configuredScopes = (await getSetting("etsy_oauth_scopes")) || DEFAULT_ETSY_SCOPES;

  if (!configuredClientId && organizationId) {
    const active = await getActiveConnectorWithCredentials(organizationId, "ETSY");
    configuredClientId = active?.credentials?.apiKey || null;
  }

  const oauthConfig = resolveEtsyOAuthRedirectUri({
    reqHost: host,
    reqProto: proto,
    overrideClientId: configuredClientId || undefined,
    overrideRedirectUri: configuredRedirectUri || undefined,
  });

  const baseUrl = oauthConfig.baseUrl;
  if (!organizationId) return NextResponse.redirect(new URL("/login", baseUrl));

  const limitCheck = await checkLimit(organizationId, "sellerChannels");
  if (!limitCheck.allowed) {
    return NextResponse.redirect(new URL("/settings/channels?error=limit_reached", baseUrl));
  }

  if (!oauthConfig.isValid) {
    return NextResponse.redirect(
      new URL(`/settings/channels?error=etsy_not_configured&diag=${oauthConfig.diagnosticCode || "ETSY_OAUTH_CONFIGURATION_ERROR"}`, baseUrl)
    );
  }

  const clientId = oauthConfig.clientId;
  const redirectUri = oauthConfig.redirectUri;

  // PKCE — Etsy Open API v3 RFC 7636
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());

  const token = createConnectToken({
    organizationId,
    storeUrl: "",
    label: "",
    codeVerifier,
  });

  const authorizeUrl = new URL("https://www.etsy.com/oauth/connect");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", configuredScopes);
  authorizeUrl.searchParams.set("state", token);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("prompt", "consent");

  console.log("[ETSY_OAUTH_INITIATED]", {
    environment: oauthConfig.environment,
    redirectUri,
    clientIdMask: clientId.length > 8 ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : "SHORT_KEY",
    scopes: configuredScopes,
    hasPKCE: true,
  });

  return NextResponse.redirect(authorizeUrl);
}

