// Pure, dependency-free helpers for Phase P1 extension pairing/session
// tokens. Deliberately has no Redis/DB import — this is the part of the
// pairing logic that's practical to unit test directly (see
// src/tests/phase-p1-extension-pairing.test.ts).

import crypto from "node:crypto";

// Identity is always resolved server-side (from the authenticated web
// session at pairing time) and never supplied by the extension itself.
export interface ExtensionIdentity {
  organizationId: string;
  organizationName: string;
  userId: string;
}

export function hashExtensionToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateOpaqueToken(bytes: number): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
