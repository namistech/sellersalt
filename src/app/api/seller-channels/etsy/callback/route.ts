import { NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { verifyConnectToken } from "@/lib/store-connect-token";
import { getSetting } from "@/lib/app-settings";
import { getSellerChannelConnector } from "@/seller-channels/registry";
import { startSellerChannelSync } from "@/lib/queue";
import { ETSY_TOKEN_URL, resolveEtsyShopId } from "@/seller-channels/etsy-seller";

import { resolveEtsyOAuthRedirectUri } from "@/services/connectors/etsy-oauth-helper";

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";

  const configuredClientId = await getSetting("etsy_seller_client_id");

  const oauthConfig = resolveEtsyOAuthRedirectUri({
    reqHost: host,
    reqProto: proto,
    overrideClientId: configuredClientId || undefined,
  });

  const baseUrl = oauthConfig.baseUrl;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    const errorCode = oauthError === "access_denied" ? "etsy_access_denied" : "etsy_authorization_failed";
    return NextResponse.redirect(new URL(`/settings/channels?error=${errorCode}`, baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_callback_incomplete", baseUrl));
  }

  const payload = verifyConnectToken(state);
  if (!payload || !payload.codeVerifier) {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_invalid_state", baseUrl));
  }

  const clientId = oauthConfig.clientId;

  if (!clientId) {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_not_configured", baseUrl));
  }

  let accessToken: string, refreshToken: string, expiresIn: number;
  try {
    const redirectUri = oauthConfig.redirectUri;
    const tokenRes = await axios.post(ETSY_TOKEN_URL, {
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: payload.codeVerifier,
    });
    accessToken = tokenRes.data.access_token;
    refreshToken = tokenRes.data.refresh_token;
    expiresIn = tokenRes.data.expires_in;
    if (!accessToken || !refreshToken) throw new Error("Missing tokens in response.");
  } catch (err: any) {
    console.error("Etsy token exchange error:", err?.response?.data || err?.message);
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_token_exchange_failed", baseUrl));
  }

  let shopId: string;
  try {
    shopId = await resolveEtsyShopId(accessToken, clientId);
  } catch {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_no_shop_found", baseUrl));
  }

  const credentials = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    shopId,
    apiKey: clientId,
  };
  const storeUrl = `https://www.etsy.com/shop/${shopId}`;

  const connector = getSellerChannelConnector("ETSY_SELLER");
  const test = await connector.testConnection(credentials as any, storeUrl);
  if (!test.ok) {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_token_invalid", baseUrl));
  }

  const channel = await prisma.sellerChannel.upsert({
    where: { organizationId_storeUrl: { organizationId: payload.organizationId, storeUrl } },
    create: {
      organizationId: payload.organizationId,
      platform: "ETSY_SELLER",
      label: `Etsy shop ${shopId}`,
      storeUrl,
      encryptedCredentials: encrypt(JSON.stringify(credentials)),
      status: "ACTIVE",
    },
    update: {
      encryptedCredentials: encrypt(JSON.stringify(credentials)),
      status: "ACTIVE",
      lastSyncError: null,
    },
  });

  await startSellerChannelSync(channel.id).catch(() => {});

  return NextResponse.redirect(new URL("/settings/channels?connected=1", baseUrl));
}
