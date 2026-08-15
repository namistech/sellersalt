import { NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { verifyConnectToken } from "@/lib/store-connect-token";
import { getSetting } from "@/lib/app-settings";
import { getSellerChannelConnector } from "@/seller-channels/registry";
import { startSellerChannelSync } from "@/lib/queue";
import { ETSY_TOKEN_URL } from "@/seller-channels/etsy-seller";

function appUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";
  return url.replace(/\/+$/, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_callback_incomplete", appUrl()));
  }

  const payload = verifyConnectToken(state);
  if (!payload || !payload.codeVerifier) {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_invalid_state", appUrl()));
  }

  const clientId = await getSetting("etsy_seller_client_id");
  if (!clientId) {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_not_configured", appUrl()));
  }

  let accessToken: string, refreshToken: string, expiresIn: number;
  try {
    const tokenRes = await axios.post(ETSY_TOKEN_URL, {
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: `${appUrl()}/api/seller-channels/etsy/callback`,
      code,
      code_verifier: payload.codeVerifier,
    });
    accessToken = tokenRes.data.access_token;
    refreshToken = tokenRes.data.refresh_token;
    expiresIn = tokenRes.data.expires_in;
    if (!accessToken || !refreshToken) throw new Error("Missing tokens in response.");
  } catch {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_token_exchange_failed", appUrl()));
  }

  // The numeric prefix of an Etsy access token is the user_id — resolve
  // their shop_id from it so every subsequent call doesn't need to.
  const userId = accessToken.split(".")[0];
  let shopId: string;
  try {
    const shopsRes = await axios.get(`https://openapi.etsy.com/v3/application/users/${userId}/shops`, {
      headers: { Authorization: `Bearer ${accessToken}`, "x-api-key": clientId },
    });
    shopId = String(shopsRes.data.shop_id);
    if (!shopId || shopId === "undefined") throw new Error("No shop found for this Etsy account.");
  } catch {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_no_shop_found", appUrl()));
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
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_token_invalid", appUrl()));
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

  await startSellerChannelSync(channel.id);

  return NextResponse.redirect(new URL("/settings/channels?connected=1", appUrl()));
}
