export function extractEtsyShopName(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  // 1. Check for standard Etsy shop URL (e.g. etsy.com/shop/ShopName or https://www.etsy.com/shop/ShopName)
  const pathMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?etsy\.com\/shop\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]);
  }

  // 2. Check for subdomain URL (e.g. https://shopname.etsy.com)
  const subdomainMatch = trimmed.match(/(?:https?:\/\/)?([a-zA-Z0-9_-]+)\.etsy\.com/i);
  if (subdomainMatch && subdomainMatch[1] && subdomainMatch[1].toLowerCase() !== "www") {
    return decodeURIComponent(subdomainMatch[1]);
  }

  // 3. Check for general URL path
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const shopIdx = parts.findIndex((p) => p.toLowerCase() === "shop");
    if (shopIdx !== -1 && parts[shopIdx + 1]) {
      return decodeURIComponent(parts[shopIdx + 1]);
    }
  } catch {
    // Ignore URL parse error
  }

  // 4. If it's a bare alphanumeric shop name (e.g. "ModPawsPrints" or "NorthCraftStudio")
  if (/^[a-zA-Z0-9_-]{2,60}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}
