import test from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { checkPasswordStrength } from "../lib/password-policy";
import { checkVerificationSendGate, type VerifiableUser } from "../lib/email-verification";
import { createChallengeToken, verifyChallengeToken } from "../lib/webauthn-challenge";

test("Task A: WebAuthn Challenge Token Security", async (t) => {
  process.env.NEXTAUTH_SECRET = "test-secret-at-least-32-chars-long-12345";

  await t.test("creates and verifies a signed challenge token", () => {
    const token = createChallengeToken({ challenge: "random-challenge-xyz" });
    const payload = verifyChallengeToken(token);
    assert.ok(payload);
    assert.strictEqual(payload?.challenge, "random-challenge-xyz");
  });

  await t.test("rejects a tampered challenge token", () => {
    const token = createChallengeToken({ challenge: "legit-challenge" });
    const [body] = token.split(".");
    const forgedToken = `${body}.fake-signature`;
    const payload = verifyChallengeToken(forgedToken);
    assert.strictEqual(payload, null);
  });

  await t.test("rejects an expired challenge token", () => {
    const token = createChallengeToken({ challenge: "expiring-challenge" }, -10);
    const payload = verifyChallengeToken(token);
    assert.strictEqual(payload, null);
  });
});

test("Task B: Password Policy Plain-English Validation", async (t) => {
  await t.test("accepts a strong, compliant password", () => {
    const result = checkPasswordStrength("P@ssw0rdSecure!");
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  await t.test("flags too short passwords with plain-English message", () => {
    const result = checkPasswordStrength("Short1!");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes("At least 8 characters"));
  });

  await t.test("flags missing number requirement", () => {
    const result = checkPasswordStrength("NoNumberHere!");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes("A number"));
  });

  await t.test("flags missing special character requirement", () => {
    const result = checkPasswordStrength("NoSpecialChar123");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes("A special character"));
  });

  await t.test("flags common weak passwords from blocklist", () => {
    const result = checkPasswordStrength("Password1!");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes("Not a commonly used password"));
  });
});

test("Task C: Email Verification Gate & Rate Limits", async (t) => {
  const baseUser: VerifiableUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    emailVerified: null,
    verificationEmailCount: 0,
    verificationFirstSentAt: null,
    lastVerificationEmailAt: null,
  };

  await t.test("allows initial verification email", () => {
    const gate = checkVerificationSendGate(baseUser);
    assert.strictEqual(gate.allowed, true);
  });

  await t.test("blocks resend when user is already verified", () => {
    const verifiedUser: VerifiableUser = { ...baseUser, emailVerified: new Date() };
    const gate = checkVerificationSendGate(verifiedUser);
    assert.strictEqual(gate.allowed, false);
    assert.strictEqual(gate.reason, "already_verified");
  });

  await t.test("enforces cooldown when email was sent less than 60 seconds ago", () => {
    const recentUser: VerifiableUser = {
      ...baseUser,
      lastVerificationEmailAt: new Date(Date.now() - 20 * 1000), // 20s ago
    };
    const gate = checkVerificationSendGate(recentUser);
    assert.strictEqual(gate.allowed, false);
    assert.strictEqual(gate.reason, "cooldown");
    assert.ok((gate.retryAfterSeconds ?? 0) > 0);
  });

  await t.test("enforces maximum cap of 3 sends within 24 hours for normal users", () => {
    const cappedUser: VerifiableUser = {
      ...baseUser,
      verificationEmailCount: 3,
      verificationFirstSentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
      lastVerificationEmailAt: new Date(Date.now() - 5 * 60 * 1000), // 5m ago (past cooldown)
    };
    const gate = checkVerificationSendGate(cappedUser);
    assert.strictEqual(gate.allowed, false);
    assert.strictEqual(gate.reason, "cap_reached");
  });

  await t.test("allows admin to resend immediately bypassing cooldown", () => {
    const recentUser: VerifiableUser = {
      ...baseUser,
      lastVerificationEmailAt: new Date(Date.now() - 5 * 1000), // 5 seconds ago
    };
    const gate = checkVerificationSendGate(recentUser, { bypassRateLimit: true });
    assert.strictEqual(gate.allowed, true);
  });

  await t.test("allows admin to resend repeatedly beyond 3 emails / 24h cap", () => {
    const heavilyCappedUser: VerifiableUser = {
      ...baseUser,
      verificationEmailCount: 15,
      verificationFirstSentAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      lastVerificationEmailAt: new Date(Date.now() - 2 * 1000),
    };
    const gate = checkVerificationSendGate(heavilyCappedUser, { bypassRateLimit: true });
    assert.strictEqual(gate.allowed, true);
  });

  await t.test("admin bypass still rejects already-verified users", () => {
    const verifiedUser: VerifiableUser = {
      ...baseUser,
      emailVerified: new Date(),
    };
    const gate = checkVerificationSendGate(verifiedUser, { bypassRateLimit: true });
    assert.strictEqual(gate.allowed, false);
    assert.strictEqual(gate.reason, "already_verified");
  });
});

