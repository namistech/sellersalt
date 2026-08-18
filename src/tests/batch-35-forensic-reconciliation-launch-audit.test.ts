import test from "node:test";
import assert from "node:assert/strict";
import { S3StorageProvider } from "../lib/storage/s3-storage";
import { LocalStorageProvider } from "../lib/storage/local-storage";
import { checkRateLimit, RATE_LIMIT_TIERS } from "../lib/rate-limit";
import { isDisposableEmail } from "../lib/abuse-prevention/disposable-domains";
import { evaluateAccountRisk } from "../lib/abuse-prevention/account-risk";
import { resolveEtsyOAuthRedirectUri } from "../services/connectors/etsy-oauth-helper";
import { DEFAULT_PACKAGES } from "../lib/plan-limits";

test("Batch 35: Free Explorer Plan Invariants & Canonical Quotas", () => {
  const freePlan = DEFAULT_PACKAGES.find((p) => p.key === "FREE");
  assert.ok(freePlan, "Free Explorer plan must exist in default package definitions");
  assert.equal(freePlan.priceUsd, 0, "Free plan price must be $0");
  assert.equal(freePlan.maxProspectsPerMonth, 15, "Free plan gets 15 monthly prospects");
  assert.equal(freePlan.maxTrackedShops, 1, "Free plan gets 1 tracked shop");
});

test("Batch 35: Storage Layer - R2 Prefixing & Endpoint Configuration", () => {
  const r2Prod = new S3StorageProvider({
    bucket: "sellersalt-assets",
    region: "auto",
    endpoint: "https://r2.cloudflarestorage.com",
    accessKeyId: "prod_access_key",
    secretAccessKey: "prod_secret_key",
    publicBaseUrl: "https://assets.sellersalt.com",
  });

  assert.equal(r2Prod.name, "s3");
  assert.equal(r2Prod.isConfigured(), true);

  const localStorage = new LocalStorageProvider();
  assert.equal(localStorage.name, "local");
  assert.equal(localStorage.isConfigured(), true);
});

test("Batch 35: Etsy OAuth Resolver & Canonical Production/Staging Redirect URIs", () => {
  const prodConfig = resolveEtsyOAuthRedirectUri({
    overrideBaseUrl: "https://sellersalt.com",
    overrideClientId: "etsy_client_12345",
  });

  assert.equal(prodConfig.environment, "production");
  assert.equal(prodConfig.redirectUri, "https://sellersalt.com/api/seller-channels/etsy/callback");
  assert.equal(prodConfig.isValid, true);

  const stagingConfig = resolveEtsyOAuthRedirectUri({
    overrideBaseUrl: "https://staging.sellersalt.com",
    overrideClientId: "etsy_client_67890",
  });

  assert.equal(stagingConfig.environment, "staging");
  assert.equal(stagingConfig.redirectUri, "https://staging.sellersalt.com/api/seller-channels/etsy/callback");
  assert.equal(stagingConfig.isValid, true);
});

test("Batch 35: Privacy-Conscious Abuse Prevention - Disposable Email Blocker", () => {
  assert.equal(isDisposableEmail("tempmail.com"), true);
  assert.equal(isDisposableEmail("10minutemail.com"), true);
  assert.equal(isDisposableEmail("guerrillamail.com"), true);
  assert.equal(isDisposableEmail("mailinator.com"), true);
  assert.equal(isDisposableEmail("gmail.com"), false);
  assert.equal(isDisposableEmail("sellersalt.com"), false);
});

test("Batch 35: Account Risk Scoring Engine Signals", async () => {
  const highRisk = await evaluateAccountRisk({
    email: "abuser@tempmail.com",
    ipSignupCountLastHour: 6,
    failedAttemptsCount: 5,
  });

  assert.equal(highRisk.level, "CRITICAL");
  assert.equal(highRisk.allowSignup, false);

  const lowRisk = await evaluateAccountRisk({
    email: "founder@gmail.com",
    ipSignupCountLastHour: 0,
    hasVerifiedEmail: true,
    hasPaidSubscription: true,
  });

  assert.equal(lowRisk.level, "LOW");
  assert.equal(lowRisk.allowSignup, true);
});

test("Batch 35: Centralized Sliding-Window Rate Limiter Tiers", () => {
  const authTier = RATE_LIMIT_TIERS.AUTH;
  assert.equal(authTier.maxRequests, 10);
  assert.equal(authTier.windowSeconds, 60);

  const signupTier = RATE_LIMIT_TIERS.SIGNUP;
  assert.equal(signupTier.maxRequests, 5);
  assert.equal(signupTier.windowSeconds, 3600);

  const result = checkRateLimit("test-ip-1.2.3.4", "AUTH");
  assert.equal(result.success, true);
  assert.equal(result.remaining, authTier.maxRequests - 1);
});
