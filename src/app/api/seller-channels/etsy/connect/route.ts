import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { checkLimit } from "@/lib/plan-limits";
import { createConnectToken } from "@/lib/store-connect-token";
import { getSetting } from "@/lib/app-settings";

const SCOPES = "listings_w listings_r shops_r transactions_r";

// Deliberately built from NEXTAUTH_URL, never from req.url/headers. Behind
// Coolify's proxy, header-derived values can reflect the container's
// internal address rather than the public domain — see the WooCommerce
// connect route for the original incident this pattern was written for.
// A redirect_uri that doesn't exactly match what's registered in Etsy's
// app dashboard produces "The requested redirect URL is not permitted."
function appUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.APP_URL;
  if (!url) throw new Error("NEXTAUTH_URL is required to build redirect URLs.");
  return url.replace(/\/+$/, "");
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET(req: Request) {
  const baseUrl = appUrl();
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.redirect(new URL("/login", baseUrl));

  const limitCheck = await checkLimit(organizationId, "sellerChannels");
  if (!limitCheck.allowed) {
    return NextResponse.redirect(new URL("/settings/channels?error=limit_reached", baseUrl));
  }

  const clientId =
    (await getSetting("etsy_seller_client_id")) ||
    process.env.ETSY_CLIENT_ID ||
    process.env.ETSY_KEYSTRING ||
    "";

  if (!clientId) {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_not_configured", baseUrl));
  }

  // PKCE — Etsy requires this for OAuth v3
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());

  const token = createConnectToken({
    organizationId,
    storeUrl: "",
    label: "",
    codeVerifier,
  });

  const redirectUri = `${baseUrl}/api/seller-channels/etsy/callback`;
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
