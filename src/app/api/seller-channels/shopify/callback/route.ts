import { NextResponse } from "next/server";
import crypto from "node:crypto";
import axios from "axios";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { verifyConnectToken } from "@/lib/store-connect-token";
import { getSetting } from "@/lib/app-settings";
import { getSellerChannelConnector } from "@/seller-channels/registry";
import { startSellerChannelSync } from "@/lib/queue";

// Standard Shopify OAuth HMAC verification: every query param except hmac,
// sorted and joined, HMAC-SHA256'd with the app's client secret, compared to
// the hmac Shopify sent. This is how we know the redirect genuinely came
// from Shopify and wasn't forged.
function verifyShopifyHmac(params: URLSearchParams, secret: string): boolean {
  const hmac = params.get("hmac");
  if (!hmac) return false;

  const keys = [...params.keys()].filter((k) => k !== "hmac" && k !== "signature").sort();
  const message = keys.map((k) => `${k}=${params.get(k)}`).join("&");
  const computed = crypto.createHmac("sha256", secret).update(message).digest("hex");

  if (computed.length !== hmac.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop");
  const state = url.searchParams.get("state");

  if (!code || !shop || !state) {
    return NextResponse.redirect(new URL("/settings/channels?error=shopify_callback_incomplete", url.origin));
  }

  const clientId = await getSetting("shopify_client_id");
  const clientSecret = await getSetting("shopify_client_secret");
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings/channels?error=shopify_not_configured", url.origin));
  }

  if (!verifyShopifyHmac(url.searchParams, clientSecret)) {
    return NextResponse.redirect(new URL("/settings/channels?error=shopify_invalid_signature", url.origin));
  }

  const payload = verifyConnectToken(state);
  if (!payload) {
    return NextResponse.redirect(new URL("/settings/channels?error=shopify_invalid_state", url.origin));
  }

  let accessToken: string;
  try {
    const tokenRes = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: clientId,
      client_secret: clientSecret,
      code,
    });
    accessToken = tokenRes.data.access_token;
    if (!accessToken) throw new Error("No access_token in response.");
  } catch {
    return NextResponse.redirect(new URL("/settings/channels?error=shopify_token_exchange_failed", url.origin));
  }

  const credentials = { accessToken };
  const storeUrl = `https://${shop}`;

  const connector = getSellerChannelConnector("SHOPIFY");
  const test = await connector.testConnection(credentials, storeUrl);
  if (!test.ok) {
    return NextResponse.redirect(new URL("/settings/channels?error=shopify_token_invalid", url.origin));
  }

  const channel = await prisma.sellerChannel.upsert({
    where: { organizationId_storeUrl: { organizationId: payload.organizationId, storeUrl } },
    create: {
      organizationId: payload.organizationId,
      platform: "SHOPIFY",
      label: payload.label || shop,
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

  return NextResponse.redirect(new URL("/settings/channels?connected=1", url.origin));
}
