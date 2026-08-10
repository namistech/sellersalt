import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { verifyConnectToken } from "@/lib/store-connect-token";
import { getSellerChannelConnector } from "@/seller-channels/registry";
import { startSellerChannelSync } from "@/lib/queue";

// No user session here — WooCommerce's own server calls this endpoint
// directly after the store owner approves on their site. The signed token
// (echoed back as "user_id", WooCommerce's generic term for an opaque
// caller-supplied value) is the only thing authenticating this request.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const { user_id: token, consumer_key: consumerKey, consumer_secret: consumerSecret } = body as {
    user_id?: string;
    consumer_key?: string;
    consumer_secret?: string;
  };

  if (!token || !consumerKey || !consumerSecret) {
    return NextResponse.json({ error: "Missing fields in callback payload." }, { status: 400 });
  }

  const payload = verifyConnectToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired connect token." }, { status: 400 });
  }

  const credentials = { consumerKey, consumerSecret };

  // Verify the key actually works before saving it — WooCommerce generating
  // a key doesn't guarantee it has the scope/permissions we need.
  const connector = getSellerChannelConnector("WOOCOMMERCE");
  const test = await connector.testConnection(credentials, payload.storeUrl);
  if (!test.ok) {
    return NextResponse.json({ error: test.message ?? "Received key didn't work." }, { status: 400 });
  }

  const channel = await prisma.sellerChannel.upsert({
    where: {
      // Same org connecting the same store again re-authorizes rather than duplicating.
      organizationId_storeUrl: { organizationId: payload.organizationId, storeUrl: payload.storeUrl },
    },
    create: {
      organizationId: payload.organizationId,
      platform: "WOOCOMMERCE",
      label: payload.label || payload.storeUrl,
      storeUrl: payload.storeUrl,
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

  return NextResponse.json({ ok: true });
}
