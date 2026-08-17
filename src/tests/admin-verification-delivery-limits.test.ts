import test from "node:test";
import assert from "node:assert";
import { checkVerificationSendGate, type VerifiableUser } from "../lib/email-verification";

test("Admin Verification Delivery Limits — Production Hotfix Verification", async (t) => {
  const baseUser: VerifiableUser = {
    id: "test-user-prod-fix-1",
    email: "unverified-user@sellersalt.com",
    name: "Unverified Seller",
    emailVerified: null,
    verificationEmailCount: 3,
    verificationFirstSentAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    lastVerificationEmailAt: new Date(Date.now() - 10 * 1000), // 10 seconds ago (active cooldown)
  };

  await t.test("Regression: normal user with 3 emails within 24h is rate-limited", () => {
    const userGate = checkVerificationSendGate(baseUser);
    assert.strictEqual(userGate.allowed, false);
    // Cooldown is evaluated first if within 60s, or cap_reached if outside cooldown
    assert.ok(userGate.reason === "cooldown" || userGate.reason === "cap_reached");
  });

  await t.test("Regression: normal user with cap reached outside cooldown is rate-limited by cap_reached", () => {
    const userPastCooldown: VerifiableUser = {
      ...baseUser,
      lastVerificationEmailAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    };
    const userGate = checkVerificationSendGate(userPastCooldown);
    assert.strictEqual(userGate.allowed, false);
    assert.strictEqual(userGate.reason, "cap_reached");
  });

  await t.test("Production Fix: admin manually sending verification email BYPASSES both cooldown and 24h cap", () => {
    // When an administrator sends verification email, bypassRateLimit is true
    const adminGate = checkVerificationSendGate(baseUser, { bypassRateLimit: true });
    assert.strictEqual(adminGate.allowed, true, "Admin must be permitted to send verification email immediately");
    assert.strictEqual(adminGate.reason, undefined);
  });

  await t.test("Production Fix: admin can resend repeatedly in rapid succession without throttling", () => {
    const repeatAdminUser: VerifiableUser = {
      ...baseUser,
      verificationEmailCount: 20, // heavily exceeded normal limit
      lastVerificationEmailAt: new Date(Date.now() - 1 * 1000), // 1 second ago
    };
    const adminGate = checkVerificationSendGate(repeatAdminUser, { bypassRateLimit: true });
    assert.strictEqual(adminGate.allowed, true, "Sequential admin sends must not be blocked");
  });

  await t.test("Security boundary: admin bypass still strictly rejects already-verified accounts", () => {
    const verifiedUser: VerifiableUser = {
      ...baseUser,
      emailVerified: new Date(),
    };
    const adminGate = checkVerificationSendGate(verifiedUser, { bypassRateLimit: true });
    assert.strictEqual(adminGate.allowed, false);
    assert.strictEqual(adminGate.reason, "already_verified");
  });
});
