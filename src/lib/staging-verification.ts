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
 * 2. PRODUCTION HARD-BLOCK: Strictly returns false if the HTTP request host or configured
 *    app URL matches any live production domain (e.g., sellersalt.com, app.sellersalt.com, anadash.com).
 * 3. NON-PRODUCTION ENVIRONMENT CHECK: Only activates if staging/preview/dev indicators
 *    are present via incoming HTTP host header (e.g., staging.sellersalt.com, localhost)
 *    or environment variables.
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

export function isStagingVerificationAccount(
  email?: string | null,
  requestHost?: string | null
): boolean {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase().trim();
  const isAllowlisted = STAGING_VERIFICATION_EMAILS.includes(normalizedEmail);
  if (!isAllowlisted) return false;

  const rawAppUrl = (process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "").toLowerCase();
  const normalizedHost = (requestHost ?? "").toLowerCase().split(":")[0].trim();

  // Safety Guard 1: Hard-block if the incoming HTTP request host is a live production hostname
  if (normalizedHost) {
    const isProdHost = PRODUCTION_HOSTNAMES.some(
      (prodHost) => normalizedHost === prodHost || (normalizedHost.endsWith(`.${prodHost}`) && !normalizedHost.includes("staging"))
    );
    if (isProdHost) {
      return false;
    }
  }

  // Safety Guard 2: Hard-block if NEXTAUTH_URL is pointing to a live production domain (and not on staging host)
  if (rawAppUrl) {
    const isProdUrl = PRODUCTION_HOSTNAMES.some((prodHost) => {
      try {
        const url = new URL(rawAppUrl);
        return url.hostname === prodHost;
      } catch {
        return rawAppUrl.includes(prodHost) && !rawAppUrl.includes("staging");
      }
    });
    if (isProdUrl && !normalizedHost.includes("staging")) {
      return false;
    }
  }

  // Staging / Non-Production checks:
  // 1. Incoming HTTP Host header indicates staging or local environment
  const isStagingHost =
    normalizedHost.includes("staging.sellersalt.com") ||
    normalizedHost.includes("staging") ||
    normalizedHost.includes("localhost") ||
    normalizedHost.includes("127.0.0.1") ||
    normalizedHost.includes("vercel.app");

  // 2. Environment variables indicate staging / preview / development
  const isStagingUrl =
    rawAppUrl.includes("staging.sellersalt.com") ||
    rawAppUrl.includes("staging") ||
    rawAppUrl.includes("localhost") ||
    rawAppUrl.includes("127.0.0.1") ||
    rawAppUrl.includes("vercel.app");

  const isNonProdEnv =
    process.env.APP_ENV === "staging" ||
    process.env.STAGING === "true" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "development" ||
    process.env.NODE_ENV !== "production" ||
    isStagingHost ||
    isStagingUrl;

  return isNonProdEnv;
}
