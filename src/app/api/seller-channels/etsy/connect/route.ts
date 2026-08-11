import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { checkLimit } from "@/lib/plan-limits";
import { createConnectToken } from "@/lib/store-connect-token";
import { getSetting } from "@/lib/app-settings";

const SCOPES = "listings_w listings_r shops_r transactions_r";

function appUrl(): string {
  const url = process.env.NEXTAUTH_URL;
  if (!url) throw new Error("NEXTAUTH_URL is required to build redirect URLs.");
  return url;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.redirect(new URL("/login", appUrl()));

  const limitCheck = await checkLimit(organizationId, "sellerChannels");
  if (!limitCheck.allowed) {
    return NextResponse.redirect(new URL("/settings/channels?error=limit_reached", appUrl()));
  }

  const clientId = await getSetting("etsy_seller_client_id");
  if (!clientId) {
    return NextResponse.redirect(new URL("/settings/channels?error=etsy_not_configured", appUrl()));
  }

  // PKCE — Etsy requires this even for confidential-style OAuth. The
  // verifier travels through the signed state token (see
  // store-connect-token.ts) so the callback can complete the exchange.
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());

  const token = createConnectToken({
    organizationId,
    storeUrl: "", // filled in at callback once we know the shop
    label: "",
    codeVerifier,
  });

  const authorizeUrl = new URL("https://www.etsy.com/oauth/connect");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", `${appUrl()}/api/seller-channels/etsy/callback`);
  authorizeUrl.searchParams.set("scope", SCOPES);
  authorizeUrl.searchParams.set("state", token);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authorizeUrl);
}
