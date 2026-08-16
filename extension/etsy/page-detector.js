// Pure URL classification for the Etsy DOM bridge — no DOM access, so
// it's safe to unit test directly without a browser.

export const EtsyPageType = {
  NOT_ETSY: "NOT_ETSY",
  ETSY_OTHER: "ETSY_OTHER",
  ETSY_LISTING_EDITOR: "ETSY_LISTING_EDITOR",
  ETSY_LISTING_PUBLIC: "ETSY_LISTING_PUBLIC",
  ETSY_SHOP_PUBLIC: "ETSY_SHOP_PUBLIC",
  ETSY_SEARCH_RESULTS: "ETSY_SEARCH_RESULTS",
};

export function classifyEtsyUrl(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return EtsyPageType.NOT_ETSY;
  }

  const host = url.hostname.toLowerCase();
  const isEtsy = host === "etsy.com" || host.endsWith(".etsy.com");
  if (!isEtsy) return EtsyPageType.NOT_ETSY;

  // 1. Etsy Shop Manager Listing Editor
  if (url.pathname.includes("/listing-editor/")) {
    return EtsyPageType.ETSY_LISTING_EDITOR;
  }

  // 2. Public Etsy Listing Page (e.g. /listing/1429810482/...)
  if (url.pathname.match(/\/listing\/\d+/)) {
    return EtsyPageType.ETSY_LISTING_PUBLIC;
  }

  // 3. Public Etsy Shop Page (e.g. /shop/LayerSculpt3D)
  if (url.pathname.match(/\/shop\/[^/?]+/)) {
    return EtsyPageType.ETSY_SHOP_PUBLIC;
  }

  // 4. Etsy Search or Category Exploration
  if (url.pathname === "/search" || url.pathname.startsWith("/c/")) {
    return EtsyPageType.ETSY_SEARCH_RESULTS;
  }

  return EtsyPageType.ETSY_OTHER;
}

// Extracts numeric listing ID from either public listing or listing editor URL
export function extractListingIdFromUrl(href) {
  try {
    const url = new URL(href);
    const editorMatch = url.pathname.match(/\/listing-editor\/edit\/(\d+)/);
    if (editorMatch) return editorMatch[1];

    const publicMatch = url.pathname.match(/\/listing\/(\d+)/);
    if (publicMatch) return publicMatch[1];

    return null;
  } catch {
    return null;
  }
}

// Extracts shop name from public shop URL (e.g. /shop/LayerSculpt3D)
export function extractShopNameFromUrl(href) {
  try {
    const url = new URL(href);
    const match = url.pathname.match(/\/shop\/([^/?]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
