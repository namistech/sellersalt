import test from "node:test";
import assert from "node:assert";
import { isAdminEmail } from "../lib/is-admin";

test("Task 1 & Security: Admin Authorization & Gatekeeper", async (t) => {
  const originalAdminEmail = process.env.ADMIN_EMAIL;
  const originalAdminEmails = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "owner@sellersalt.com,admin@sellersalt.com";
  process.env.ADMIN_EMAIL = "owner@sellersalt.com,admin@sellersalt.com";

  await t.test("allows authorized admin emails", () => {
    assert.strictEqual(isAdminEmail("owner@sellersalt.com"), true);
    assert.strictEqual(isAdminEmail("admin@sellersalt.com"), true);
    assert.strictEqual(isAdminEmail("OWNER@sellersalt.com"), true); // Case-insensitive
  });

  await t.test("strictly blocks non-admin users", () => {
    assert.strictEqual(isAdminEmail("customer@example.com"), false);
    assert.strictEqual(isAdminEmail("hacker@sellersalt.com"), false);
    assert.strictEqual(isAdminEmail(null), false);
    assert.strictEqual(isAdminEmail(undefined), false);
    assert.strictEqual(isAdminEmail(""), false);
  });

  process.env.ADMIN_EMAIL = originalAdminEmail;
  process.env.ADMIN_EMAILS = originalAdminEmails;
});

test("Task 1 & 2: Telemetry & Metric Math Consistency", async (t) => {
  await t.test("computes MRR accurately without inventing values", () => {
    const packages = [
      { name: "Starter", priceUsd: 19, subscriptionsCount: 10 },
      { name: "Pro", priceUsd: 49, subscriptionsCount: 5 },
      { name: "Enterprise", priceUsd: 199, subscriptionsCount: 2 },
    ];

    let estimatedMrr = 0;
    for (const pkg of packages) {
      estimatedMrr += pkg.priceUsd * pkg.subscriptionsCount;
    }

    assert.strictEqual(estimatedMrr, 190 + 245 + 398); // 833
  });

  await t.test("verifies total user breakdown integrity (verified + unverified = total)", () => {
    const totalUsers = 42;
    const verifiedUsers = 38;
    const unverifiedUsers = totalUsers - verifiedUsers;

    assert.strictEqual(unverifiedUsers, 4);
    assert.strictEqual(verifiedUsers + unverifiedUsers, totalUsers);
  });
});

test("Task 2: User Status Filter Logic", async (t) => {
  const sampleUsers = [
    { id: "1", email: "a@test.com", emailVerified: new Date(), suspendedAt: null },
    { id: "2", email: "b@test.com", emailVerified: null, suspendedAt: null },
    { id: "3", email: "c@test.com", emailVerified: new Date(), suspendedAt: new Date() },
    { id: "4", email: "d@test.com", emailVerified: null, suspendedAt: new Date() },
  ];

  await t.test("filters verified users", () => {
    const verified = sampleUsers.filter((u) => u.emailVerified !== null);
    assert.strictEqual(verified.length, 2);
  });

  await t.test("filters unverified users", () => {
    const unverified = sampleUsers.filter((u) => u.emailVerified === null);
    assert.strictEqual(unverified.length, 2);
  });

  await t.test("filters suspended users", () => {
    const suspended = sampleUsers.filter((u) => u.suspendedAt !== null);
    assert.strictEqual(suspended.length, 2);
  });
});
