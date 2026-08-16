// Phase P1 — Browser Extension pairing/session token storage.
//
// The extension never receives a NextAuth secret, a database credential,
// or any server secret. Instead it exchanges a short-lived, single-use
// pairing code (minted only from an authenticated web session) for an
// opaque extension session token. Both are stored in Redis by their SHA-256
// hash only — same principle as PasswordResetToken's tokenHash column: a
// store read alone can never be replayed as the credential itself.
//
// Redis (not a new Postgres table) is used deliberately here: pairing
// codes and session tokens are naturally TTL-bound, and GETDEL gives
// single-use consumption for free without a migration. This uses its own
// dedicated Redis client rather than importing src/lib/queue.ts, which also
// constructs a BullMQ Queue — unrelated overhead this module doesn't need.

import IORedis from "ioredis";
import { hashExtensionToken, generateOpaqueToken, type ExtensionIdentity } from "./extension-token";

export { hashExtensionToken, generateOpaqueToken, extractBearerToken } from "./extension-token";
export type { ExtensionIdentity } from "./extension-token";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

const PAIR_CODE_TTL_SECONDS = 5 * 60; // single-use, 5 minutes
const SESSION_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const PAIR_CODE_PREFIX = "ext:pair:";
const SESSION_TOKEN_PREFIX = "ext:session:";

export async function createPairingCode(
  identity: ExtensionIdentity
): Promise<{ code: string; expiresInSeconds: number }> {
  const code = generateOpaqueToken(16);
  const key = PAIR_CODE_PREFIX + hashExtensionToken(code);
  await redis.set(key, JSON.stringify(identity), "EX", PAIR_CODE_TTL_SECONDS);
  return { code, expiresInSeconds: PAIR_CODE_TTL_SECONDS };
}

/** Atomically reads and deletes the pairing code record, so two concurrent
 * exchange attempts for the same code can never both succeed. */
export async function consumePairingCode(code: string): Promise<ExtensionIdentity | null> {
  const key = PAIR_CODE_PREFIX + hashExtensionToken(code);
  const raw = await redis.getdel(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtensionIdentity;
  } catch {
    return null;
  }
}

export async function createExtensionSessionToken(
  identity: ExtensionIdentity
): Promise<{ token: string; expiresInSeconds: number }> {
  const token = generateOpaqueToken(32);
  const key = SESSION_TOKEN_PREFIX + hashExtensionToken(token);
  await redis.set(key, JSON.stringify(identity), "EX", SESSION_TOKEN_TTL_SECONDS);
  return { token, expiresInSeconds: SESSION_TOKEN_TTL_SECONDS };
}

export async function resolveExtensionSessionToken(token: string): Promise<ExtensionIdentity | null> {
  const key = SESSION_TOKEN_PREFIX + hashExtensionToken(token);
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtensionIdentity;
  } catch {
    return null;
  }
}

export async function revokeExtensionSessionToken(token: string): Promise<void> {
  const key = SESSION_TOKEN_PREFIX + hashExtensionToken(token);
  await redis.del(key);
}
