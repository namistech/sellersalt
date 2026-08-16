// Pure URL classification for the Etsy DOM bridge — no DOM access, so
// it's safe to unit test directly without a browser.

export const EtsyPageType = {
  NOT_ETSY: "NOT_ETSY",
  ETSY_OTHER: "ETSY_OTHER",
  ETSY_LISTING_EDITOR: "ETSY_LISTING_EDITOR",
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

  // Per docs/17-browser-extension/SELLERSALT_EXTENSION_SPEC.md §2.1, the
  // Shop Manager listing editor lives under .../listing-editor/...
  if (url.pathname.includes("/listing-editor/")) {
    return EtsyPageType.ETSY_LISTING_EDITOR;
  }

  return EtsyPageType.ETSY_OTHER;
}

// Etsy's editor URL is typically .../listing-editor/edit/{listingId} for
// an existing listing, or .../listing-editor/create for a new (unsaved)
// one — the latter has no listing ID yet, which is expected, not an error.
export function extractListingIdFromUrl(href) {
  try {
    const url = new URL(href);
    const match = url.pathname.match(/\/listing-editor\/edit\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
