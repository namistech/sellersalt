import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { checkLimit } from "@/lib/plan-limits";
import { createConnectToken } from "@/lib/store-connect-token";
import { getSetting } from "@/lib/app-settings";

const SCOPES = "read_orders";

// Built from NEXTAUTH_URL, never req.url — see the WooCommerce connect
// route for why (req.url reflects the container's internal 0.0.0.0 address
// behind Coolify's proxy, not the public domain).
function appUrl(): string {
  const url = process.env.NEXTAUTH_URL;
  if (!url) throw new Error("NEXTAUTH_URL is required to build redirect URLs.");
  return url;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.redirect(new URL("/login", appUrl()));
  if (!isAdminEmail(session?.user?.email)) return NextResponse.redirect(new URL("/dashboard", appUrl()));

  const url = new URL(req.url);
  const shopInput = url.searchParams.get("shop");
  const label = url.searchParams.get("label") ?? shopInput ?? "";

  if (!shopInput) {
    return NextResponse.redirect(new URL("/settings/channels?error=missing_shop", appUrl()));
  }

  const limitCheck = await checkLimit(organizationId, "sellerChannels");
  if (!limitCheck.allowed) {
    return NextResponse.redirect(new URL("/settings/channels?error=limit_reached", appUrl()));
  }

  const clientId = await getSetting("shopify_client_id");
  if (!clientId) {
    return NextResponse.redirect(new URL("/settings/channels?error=shopify_not_configured", appUrl()));
  }

  const shopDomain = shopInput.includes(".myshopify.com")
    ? shopInput.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : `${shopInput}.myshopify.com`;

  const token = createConnectToken({ organizationId, storeUrl: `https://${shopDomain}`, label });

  const authorizeUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", SCOPES);
  authorizeUrl.searchParams.set("redirect_uri", `${appUrl()}/api/seller-channels/shopify/callback`);
  authorizeUrl.searchParams.set("state", token);

  return NextResponse.redirect(authorizeUrl);
}
