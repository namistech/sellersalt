import crypto from "node:crypto";

// Carries a WebAuthn ceremony's challenge from the options response back
// to the verify request, signed + time-limited so it can't be swapped or
// replayed — same pattern as store-connect-token.ts. Login ceremonies
// don't know the user yet (userId is unset until the returned credential
// is looked up), so userId is optional here.

interface ChallengePayload {
  challenge: string;
  userId?: string;
  exp: number; // unix seconds
}

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is required to sign WebAuthn challenge tokens.");
  return s;
}

export function createChallengeToken(payload: Omit<ChallengePayload, "exp">, ttlSeconds = 300): string {
  const full: ChallengePayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyChallengeToken(token: string): ChallengePayload | null {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return null;

  const expectedSig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload: ChallengePayload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expired
    return payload;
  } catch {
    return null;
  }
}
