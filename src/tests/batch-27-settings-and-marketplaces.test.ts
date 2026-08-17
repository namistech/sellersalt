import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNavigation } from "@/services/navigation";
import type { WorkspaceContext } from "@/services/types";
import {
  generateBase32Secret,
  verifyTOTPCode,
  generateRecoveryCodes,
  buildOtpAuthUri,
  generateTOTPCode,
} from "@/lib/totp";

test("Batch 27: Navigation Audit — Removal of Search Stream / Scraper Jobs from Customer Navigation", async (t) => {
  await t.test("Customer workspace navigation does not expose Search Streams or Scraper Jobs", () => {
    const individualContext: WorkspaceContext = {
      user: { id: "usr_seller_1", name: "Seller Jane", email: "jane@example.com" },
      organization: { id: "org_seller_1", name: "Jane Crafts", accountType: "individual" },
      roleLabel: "Pro Seller",
      capabilities: new Set(["discover:view", "operate:view", "manage:billing", "manage:reports"]),
    };

    const nav = buildNavigation(individualContext);
    const allHrefs = nav.flatMap((group) => group.items.map((item) => item.href));
    const allLabels = nav.flatMap((group) => group.items.map((item) => item.label));

    // Confirm /connectors and /jobs are NOT in customer navigation items
    assert.equal(allHrefs.includes("/connectors"), false, "Customer navigation must not contain /connectors");
    assert.equal(allHrefs.includes("/jobs"), false, "Customer navigation must not contain /jobs");
    assert.equal(allLabels.includes("Search Streams"), false, "Customer navigation must not label any item 'Search Streams'");
    assert.equal(allLabels.includes("Scraper Jobs"), false, "Customer navigation must not label any item 'Scraper Jobs'");

    // Confirm proper workflow items are present
    assert.ok(allHrefs.includes("/radar"), "Must include Opportunity Radar");
    assert.ok(allHrefs.includes("/keyword-research"), "Must include Keyword Research");
    assert.ok(allHrefs.includes("/settings/channels"), "Must include Connected Channels");
    assert.ok(allHrefs.includes("/settings"), "Must include Settings");
  });
});

test("Batch 27: Two-Factor Authentication Lifecycle & Security", async (t) => {
  await t.test("generates RFC 6238 compliant base32 secrets and valid OTPAuth URI", () => {
    const secret = generateBase32Secret(20);
    assert.ok(secret.length >= 20, "Secret should be at least 20 base32 characters");
    assert.match(secret, /^[A-Z2-7]+$/, "Secret must only contain base32 characters");

    const uri = buildOtpAuthUri("seller@example.com", secret, "SellerSalt");
    assert.ok(uri.startsWith("otpauth://totp/"), "URI must start with otpauth://totp/");
    assert.ok(uri.includes(secret), "URI must embed the secret");
    assert.ok(uri.includes("seller%40example.com") || uri.includes("seller@example.com"), "URI must include account email");
  });

  await t.test("verifies TOTP codes and handles invalid inputs safely", () => {
    const secret = generateBase32Secret(20);
    const validCode = generateTOTPCode(secret);
    
    assert.equal(validCode.length, 6, "TOTP code must be 6 digits");
    assert.equal(verifyTOTPCode(secret, validCode), true, "Valid code must pass verification");
    
    // Invalid codes
    assert.equal(verifyTOTPCode(secret, "000000" === validCode ? "999999" : "000000"), false, "Invalid code must be rejected");
    assert.equal(verifyTOTPCode(secret, "abc"), false, "Non-digit code must be rejected");
    assert.equal(verifyTOTPCode(secret, ""), false, "Empty code must be rejected");
  });

  await t.test("generates secure, formatted recovery backup codes", () => {
    const recoveryCodes = generateRecoveryCodes(8);
    assert.equal(recoveryCodes.length, 8, "Must generate 8 recovery backup codes");
    
    for (const code of recoveryCodes) {
      assert.match(code, /^[0-9A-F]{4}-[0-9A-F]{4}$/, "Recovery code must match XXXX-XXXX format");
    }
  });
});

test("Batch 27: Marketplace Tiles & Channel Architecture", async (t) => {
  await t.test("defines Etsy as available and other platforms as coming soon", () => {
    const marketplaces = [
      { id: "etsy", name: "Etsy", status: "AVAILABLE" },
      { id: "amazon", name: "Amazon", status: "COMING_SOON" },
      { id: "ebay", name: "eBay", status: "COMING_SOON" },
      { id: "tiktok", name: "TikTok Shop", status: "COMING_SOON" },
      { id: "walmart", name: "Walmart", status: "COMING_SOON" },
    ];

    const available = marketplaces.filter((m) => m.status === "AVAILABLE");
    const comingSoon = marketplaces.filter((m) => m.status === "COMING_SOON");

    assert.equal(available.length, 1);
    assert.equal(available[0]?.id, "etsy");
    assert.equal(comingSoon.length, 4);
  });
});
