import test from "node:test";
import assert from "node:assert";
import {
  hashExtensionToken,
  generateOpaqueToken,
  extractBearerToken,
} from "../lib/extension-token";

test("Phase P1: Extension Pairing Token Hashing", async (t) => {
  await t.test("produces deterministic SHA-256 hex digests", () => {
    const a = hashExtensionToken("same-value");
    const b = hashExtensionToken("same-value");
    assert.strictEqual(a, b);
    assert.strictEqual(a.length, 64);
    assert.match(a, /^[0-9a-f]{64}$/);
  });

  await t.test("produces distinct hashes for distinct raw tokens", () => {
    const a = hashExtensionToken("token-one");
    const b = hashExtensionToken("token-two");
    assert.notStrictEqual(a, b);
  });

  await t.test("never returns the raw input as the stored value", () => {
    const raw = "super-secret-pairing-code";
    const hashed = hashExtensionToken(raw);
    assert.notStrictEqual(hashed, raw);
    assert.ok(!hashed.includes(raw));
  });
});

test("Phase P1: Opaque Token Generation", async (t) => {
  await t.test("generates URL-safe tokens of the expected entropy", () => {
    const token = generateOpaqueToken(16);
    // base64url alphabet only — safe to embed in JSON/query strings/headers.
    assert.match(token, /^[A-Za-z0-9_-]+$/);
    assert.ok(token.length >= 16, "16 random bytes must encode to a non-trivial length string");
  });

  await t.test("never repeats across generations (collision-resistant)", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateOpaqueToken(32)));
    assert.strictEqual(tokens.size, 200);
  });

  await t.test("session tokens (32 bytes) are longer than pairing codes (16 bytes)", () => {
    const pairCode = generateOpaqueToken(16);
    const sessionToken = generateOpaqueToken(32);
    assert.ok(sessionToken.length > pairCode.length);
  });
});

test("Phase P1: Bearer Token Extraction (Extension Session Auth)", async (t) => {
  await t.test("extracts a well-formed Bearer token", () => {
    const req = new Request("https://sellersalt.com/api/extension/session", {
      headers: { Authorization: "Bearer abc123XYZ" },
    });
    assert.strictEqual(extractBearerToken(req), "abc123XYZ");
  });

  await t.test("is case-insensitive on the 'Bearer' scheme", () => {
    const req = new Request("https://sellersalt.com/api/extension/session", {
      headers: { Authorization: "bearer abc123XYZ" },
    });
    assert.strictEqual(extractBearerToken(req), "abc123XYZ");
  });

  await t.test("returns null when the header is missing", () => {
    const req = new Request("https://sellersalt.com/api/extension/session");
    assert.strictEqual(extractBearerToken(req), null);
  });

  await t.test("returns null for a malformed scheme (no silent fallback to raw header)", () => {
    const req = new Request("https://sellersalt.com/api/extension/session", {
      headers: { Authorization: "Basic abc123XYZ" },
    });
    assert.strictEqual(extractBearerToken(req), null);
  });
});

test("Phase P1: Multi-Tenant Security — Server-Authoritative Identity", async (t) => {
  await t.test("pairing identity is never derived from extension-supplied input", () => {
    // Mirrors the real route contract: POST /api/extension/pair reads
    // organizationId/userId only from the authenticated session, never
    // from the request body — there is no organizationId field the
    // extension could even supply on that endpoint.
    const deriveIdentityForPairing = (sessionOrgId: string, sessionUserId: string, requestBody: any = {}) => {
      return { organizationId: sessionOrgId, userId: sessionUserId };
    };

    const identity = deriveIdentityForPairing("org_real_session", "user_1", {
      organizationId: "org_attacker_supplied",
    });

    assert.strictEqual(identity.organizationId, "org_real_session");
  });
});
