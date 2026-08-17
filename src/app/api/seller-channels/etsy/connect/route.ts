import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { checkLimit } from "@/lib/plan-limits";
import { createConnectToken } from "@/lib/store-connect-token";
import { getSetting } from "@/lib/app-settings";

import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { resolveEtsyOAuthRedirectUri } from "@/services/connectors/etsy-oauth-helper";

// Scopes per Rule 7 & Section 1: listings_w, listings_r, shops_w, shops_r, transactions_r, billing_r
const SCOPES = "listings_w listings_r shops_w shops_r transactions_r billing_r";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";

  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  let configuredClientId = await getSetting("etsy_seller_client_id");
  if (!configuredClientId && organizationId) {
    const active = await getActiveConnectorWithCredentials(organizationId, "ETSY");
    configuredClientId = active?.credentials?.apiKey || null;
  }

  const oauthConfig = resolveEtsyOAuthRedirectUri({
    reqHost: host,
    reqProto: proto,
    overrideClientId: configuredClientId || undefined,
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

  // PKCE — Etsy requires this for OAuth v3
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());

  const token = createConnectToken({
    organizationId,
    storeUrl: "",
    label: "",
    codeVerifier,
  });

  const redirectUri = oauthConfig.redirectUri;
  const authorizeUrl = new URL("https://www.etsy.com/oauth/connect");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", SCOPES);
  authorizeUrl.searchParams.set("state", token);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authorizeUrl);
}
