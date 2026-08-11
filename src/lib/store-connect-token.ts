import crypto from "node:crypto";

// WooCommerce's app-authorization flow calls our callback server-to-server,
// with no user session attached — this token is how we know which org and
// store that callback belongs to. Signed + time-limited rather than a raw
// database ID, so a leaked/guessed value can't be replayed against a
// different connection later.

interface ConnectPayload {
  organizationId: string;
  storeUrl: string;
  label: string;
  // Only used by Etsy's PKCE OAuth flow — carries the code_verifier through
  // the redirect so the callback can complete the token exchange. Other
  // platforms (Shopify, WooCommerce) don't use this field.
  codeVerifier?: string;
  exp: number; // unix seconds
}

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is required to sign store-connect tokens.");
  return s;
}

export function createConnectToken(payload: Omit<ConnectPayload, "exp">, ttlSeconds = 900): string {
  const full: ConnectPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyConnectToken(token: string): ConnectPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload: ConnectPayload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expired
    return payload;
  } catch {
    return null;
  }
}
