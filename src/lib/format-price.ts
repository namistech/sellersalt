/**
 * Formats an observed marketplace price with its own real currency —
 * never a hardcoded "$" prefix. Amazon.com (and other marketplaces) can
 * render geo-localized, non-USD prices depending on the requesting IP
 * (confirmed live during Batch 37's forensic audit — a real fetch
 * returned PKR-denominated prices with no "$" anywhere on the page); a
 * UI that always prefixes "$" would silently relabel that price as USD.
 * Returns `null` unchanged as `null` — callers decide the "Unavailable"
 * copy, this never fabricates a placeholder price.
 */
export function formatMarketplacePrice(
  price: number | null | undefined,
  currency: string | null | undefined
): string | null {
  if (price === null || price === undefined) return null;

  const code = (currency || "USD").toUpperCase();
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    INR: "₹",
  };

  if (symbols[code]) {
    return `${symbols[code]}${price.toFixed(2)}`;
  }
  return `${price.toFixed(2)} ${code}`;
}
