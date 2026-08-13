import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkLimit } from "@/lib/plan-limits";
import { createConnectToken } from "@/lib/store-connect-token";

// Deliberately built from NEXTAUTH_URL, never from req.url. Behind Coolify's
// proxy, req.url reflects the container's internal address (0.0.0.0:3000),
// not the public domain — redirecting off that sends the browser to a dead
// address instead of back to the app.
function appUrl(): string {
  const url = process.env.NEXTAUTH_URL;
  if (!url) throw new Error("NEXTAUTH_URL is required to build redirect URLs.");
  return url;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.redirect(new URL("/login", appUrl()));

  const url = new URL(req.url);
  const storeUrlInput = url.searchParams.get("storeUrl");
  const label = url.searchParams.get("label") ?? storeUrlInput ?? "";

  if (!storeUrlInput) {
    return NextResponse.redirect(new URL("/settings/channels?error=missing_store_url", appUrl()));
  }

  const limitCheck = await checkLimit(organizationId, "sellerChannels");
  if (!limitCheck.allowed) {
    return NextResponse.redirect(new URL("/settings/channels?error=limit_reached", appUrl()));
  }

  let storeUrl: string;
  try {
    storeUrl = new URL(storeUrlInput).origin;
  } catch {
    return NextResponse.redirect(new URL("/settings/channels?error=invalid_store_url", appUrl()));
  }

  const token = createConnectToken({ organizationId, storeUrl, label });

  const authorizeUrl = new URL(`${storeUrl}/wc-auth/v1/authorize`);
  authorizeUrl.searchParams.set("app_name", "SellerSalt");
  authorizeUrl.searchParams.set("scope", "read_write");
  authorizeUrl.searchParams.set("user_id", token);
  authorizeUrl.searchParams.set("return_url", `${appUrl()}/settings/channels?connected=1`);
  authorizeUrl.searchParams.set("callback_url", `${appUrl()}/api/seller-channels/woocommerce/callback`);

  return NextResponse.redirect(authorizeUrl);
}
