/**
 * STAGING-ONLY FRONTEND VERIFICATION BYPASS
 *
 * This helper allows specific designated test accounts to bypass the subscription
 * checkout redirect ONLY when running in staging, development, or preview environments.
 *
 * It enables browser verification of the redesigned frontend and intelligence surfaces
 * against the real staging database without requiring live credit-card checkout.
 *
 * HARD SAFETY GUARDS:
 * 1. STRICT EMAIL ALLOWLIST: Only explicitly approved verification emails are eligible.
 * 2. PRODUCTION HARD-BLOCK: Strictly returns false if running against live production
 *    domains (e.g., sellersalt.com, app.sellersalt.com, anadash.com).
 * 3. NON-PRODUCTION ENVIRONMENT CHECK: Only activates if staging/preview/dev indicators
 *    are present (e.g., staging.sellersalt.com, APP_ENV=staging, STAGING=true, VERCEL_ENV=preview,
 *    or localhost/development).
 *
 * MUST NEVER BE USED OR ENABLED IN PRODUCTION.
 */

const STAGING_VERIFICATION_EMAILS: readonly string[] = [
  "shahzadmirza.net@gmail.com",
];

const PRODUCTION_HOSTNAMES: readonly string[] = [
  "sellersalt.com",
  "www.sellersalt.com",
  "app.sellersalt.com",
  "anadash.com",
  "www.anadash.com",
  "app.anadash.com",
];

export function isStagingVerificationAccount(email?: string | null): boolean {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase().trim();
  const isAllowlisted = STAGING_VERIFICATION_EMAILS.includes(normalizedEmail);
  if (!isAllowlisted) return false;

  const appUrl = (process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "").toLowerCase();

  // Safety Guard: Hard-block if running on production hostname
  const isProductionDomain = PRODUCTION_HOSTNAMES.some((prodHost) => {
    try {
      if (!appUrl) return false;
      const url = new URL(appUrl);
      return url.hostname === prodHost;
    } catch {
      return appUrl.includes(prodHost);
    }
  });

  if (isProductionDomain) {
    return false;
  }

  // Safety Guard: Require staging / non-production environment indicator
  const isStagingUrl =
    appUrl.includes("staging.sellersalt.com") ||
    appUrl.includes("staging.") ||
    appUrl.includes("localhost") ||
    appUrl.includes("127.0.0.1") ||
    appUrl.includes("vercel.app");

  const isNonProdEnv =
    process.env.APP_ENV === "staging" ||
    process.env.STAGING === "true" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "development" ||
    process.env.NODE_ENV !== "production" ||
    isStagingUrl;

  return isNonProdEnv;
}
