import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkLimit } from "@/lib/plan-limits";
import { createConnectToken } from "@/lib/store-connect-token";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const storeUrlInput = url.searchParams.get("storeUrl");
  const label = url.searchParams.get("label") ?? storeUrlInput ?? "";

  if (!storeUrlInput) {
    return NextResponse.redirect(new URL("/settings/channels?error=missing_store_url", req.url));
  }

  // Fail fast on plan limits before sending the user through their own
  // store's login screen, rather than rejecting them after they've approved.
  const limitCheck = await checkLimit(organizationId, "sellerChannels");
  if (!limitCheck.allowed) {
    return NextResponse.redirect(new URL("/settings/channels?error=limit_reached", req.url));
  }

  let storeUrl: string;
  try {
    storeUrl = new URL(storeUrlInput).origin;
  } catch {
    return NextResponse.redirect(new URL("/settings/channels?error=invalid_store_url", req.url));
  }

  const token = createConnectToken({ organizationId, storeUrl, label });
  const appUrl = process.env.NEXTAUTH_URL ?? url.origin;

  // WooCommerce's own built-in app-authorization endpoint (core feature since
  // WC 3.5) — the user logs into THEIR store and approves on THEIR site.
  // WooCommerce then POSTs the generated key pair directly to callback_url;
  // the user never sees or copies a key.
  const authorizeUrl = new URL(`${storeUrl}/wc-auth/v1/authorize`);
  authorizeUrl.searchParams.set("app_name", "Anadash");
  authorizeUrl.searchParams.set("scope", "read");
  authorizeUrl.searchParams.set("user_id", token);
  authorizeUrl.searchParams.set("return_url", `${appUrl}/settings/channels?connected=1`);
  authorizeUrl.searchParams.set("callback_url", `${appUrl}/api/seller-channels/woocommerce/callback`);

  return NextResponse.redirect(authorizeUrl);
}
