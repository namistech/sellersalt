/**
 * Server-side feature flag / kill switch helpers.
 */

/**
 * Kill switch for querying third-party shop statistics
 * (such as transaction_sold_count, review velocity, and computed estDailySales for
 * shops not owned by the authenticated user) via marketplace APIs.
 *
 * Defaults to false (disabled) to eliminate unauthorized third-party shop polling.
 */
export function isThirdPartyShopLookupEnabled(): boolean {
  return process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP === "true";
}
