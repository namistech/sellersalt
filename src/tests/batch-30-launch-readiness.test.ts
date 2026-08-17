import test from "node:test";
import assert from "node:assert/strict";

// Abuse Prevention & Risk Scoring
import { isDisposableEmail, classifyEmailDomain, normalizeEmailDomain } from "../lib/abuse-prevention/disposable-domains";
import { evaluateBusinessDomainPolicy } from "../lib/abuse-prevention/business-domain-policy";
import { evaluateAccountRisk } from "../lib/abuse-prevention/account-risk";

// Rate Limiting
import { checkRateLimit, resetRateLimitForTesting } from "../lib/rate-limit";

// SSRF & File Validation
import { isSafeExternalUrl } from "../lib/ssrf";
import { sanitizeSvgContent } from "../lib/file-validation";

// Shop SEO Audit
import { evaluateShopSeoAlgorithmic } from "../services/shop-seo-audit";

test("Batch 30: Disposable Email Blocker", () => {
  // Test disposable emails
  assert.equal(isDisposableEmail("attacker@mailinator.com"), true);
  assert.equal(isDisposableEmail("user@tempmail.com"), true);
  assert.equal(isDisposableEmail("bot@10minutemail.com"), true);
  assert.equal(isDisposableEmail("test@guerrillamail.com"), true);

  // Test legitimate email providers
  assert.equal(isDisposableEmail("user@gmail.com"), false);
  assert.equal(isDisposableEmail("jane@yahoo.com"), false);
  assert.equal(isDisposableEmail("ceo@microsoft.com"), false);
  assert.equal(isDisposableEmail("founder@acmestudio.co"), false);

  // Domain classification
  assert.equal(classifyEmailDomain("test@gmail.com"), "PUBLIC_WEBMAIL");
  assert.equal(classifyEmailDomain("test@mailinator.com"), "DISPOSABLE");
  assert.equal(classifyEmailDomain("test@apple.com"), "BUSINESS_DOMAIN");

  // Domain normalization
  assert.equal(normalizeEmailDomain("  USER@GMAIL.COM "), "gmail.com");
});

test("Batch 30: Multi-Signal Account Risk Model", async () => {
  // Low-risk legitimate user
  const lowRisk = await evaluateAccountRisk({
    email: "sarah.handmade@gmail.com",
    ipAddress: "24.48.0.1",
    hasVerifiedEmail: true,
    hasPaidSubscription: true,
  });
  assert.equal(lowRisk.level, "LOW");
  assert.equal(lowRisk.allowSignup, true);
  assert.ok(lowRisk.score < 30);

  // High-risk disposable / abuse signals
  const highRisk = await evaluateAccountRisk({
    email: "bot99@tempmail.com",
    ipAddress: "198.51.100.1",
    ipSignupCountLastHour: 6,
    failedAttemptsCount: 5,
  });
  assert.equal(highRisk.level, "CRITICAL");
  assert.equal(highRisk.allowSignup, false);
  assert.ok(highRisk.score >= 70);
});

test("Batch 30: Centralized Sliding-Window Rate Limiting", () => {
  const testId = `test-ip-${Date.now()}`;
  resetRateLimitForTesting(testId, "AUTH");

  // First 10 attempts should succeed (AUTH allows 10/min)
  for (let i = 0; i < 10; i++) {
    const res = checkRateLimit(testId, "AUTH");
    assert.equal(res.success, true);
  }

  // 11th attempt should hit rate limit
  const blockedRes = checkRateLimit(testId, "AUTH");
  assert.equal(blockedRes.success, false);
  assert.ok(blockedRes.resetSeconds > 0);
  assert.ok(blockedRes.headers["Retry-After"] !== undefined);
});


test("Batch 30: SSRF Prevention Validator", () => {
  // Private IPv4 ranges
  assert.equal(isSafeExternalUrl("http://127.0.0.1/admin"), false);
  assert.equal(isSafeExternalUrl("http://localhost:3000/api"), false);
  assert.equal(isSafeExternalUrl("http://10.0.0.1/secret"), false);
  assert.equal(isSafeExternalUrl("http://192.168.1.1/router"), false);
  assert.equal(isSafeExternalUrl("http://172.16.0.1/internal"), false);
  assert.equal(isSafeExternalUrl("http://169.254.169.254/latest/meta-data/"), false);

  // Safe external URLs
  assert.equal(isSafeExternalUrl("https://www.etsy.com/shop/HandmadeStore"), true);
  assert.equal(isSafeExternalUrl("https://i.etsystatic.com/1234/r/il/xyz.jpg"), true);
  assert.equal(isSafeExternalUrl("https://api.stripe.com/v1/charges"), true);
});

test("Batch 30: Strict SVG File Sanitization", () => {
  const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')">
    <script>alert(document.cookie)</script>
    <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
    <a href="javascript:stealToken()">Click</a>
  </svg>`;

  const sanitized = sanitizeSvgContent(maliciousSvg);

  assert.equal(sanitized.includes("<script>"), false);
  assert.equal(sanitized.includes("onload"), false);
  assert.equal(sanitized.includes("javascript:"), false);
  assert.ok(sanitized.includes("<circle"));
});

test("Batch 30: Shop SEO Audit Scoring Engine", () => {
  const audit = evaluateShopSeoAlgorithmic({
    shopId: "12345",
    shopName: "ArtisanLeatherCo",
    shopUrl: "https://www.etsy.com/shop/ArtisanLeatherCo",
    iconUrl: "https://i.etsystatic.com/isbl/icon.jpg",
    bannerUrl: "https://i.etsystatic.com/isbl/banner.jpg",
    title: "Handmade Leather Wallets & Custom Goods",
    announcement: "Welcome to ArtisanLeatherCo! Handcrafted full-grain leather accessories made to last a lifetime.",
    listings: [
      {
        listingId: "1",
        title: "Personalized Leather Wallet | Custom Bifold Card Holder",
        tags: ["leather wallet", "bifold wallet", "custom wallet", "gift for him", "mens gift", "leather goods", "personalized gift", "travel card holder", "slim wallet", "handcrafted", "minimalist wallet", "groomsmen gift", "anniversary gift"],
        images: ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"],
      },
    ],
  });

  // Verify provenance and score integrity
  assert.equal(audit.provenance, "SELLERSALT_SCORE");
  assert.equal(audit.actualData.provenance, "ACTUAL_ETSY_DATA");
  assert.equal(audit.actualData.hasIcon, true);
  assert.equal(audit.actualData.hasBanner, true);
  assert.equal(audit.catalogMetrics.perfect13TagListingPercent, 100);
  assert.ok(audit.overallShopSeoScore >= 80);

  // Recommendations structure check
  for (const rec of audit.recommendations) {
    assert.ok(rec.observedSignal.length > 0);
    assert.ok(rec.whyItMatters.length > 0);
    assert.ok(rec.recommendedAction.length > 0);
  }
});
