export interface ListingParseResult {
  listingId: number | null;
  isShopUrl: boolean;
  shopName?: string;
  error?: string;
}

export function parseEtsyListingInput(input?: string | number | null): ListingParseResult {
  if (input === null || input === undefined) {
    return { listingId: null, isShopUrl: false, error: "Please provide an Etsy listing URL or numeric listing ID." };
  }

  if (typeof input === "number") {
    if (Number.isFinite(input) && input > 0) {
      return { listingId: input, isShopUrl: false };
    }
    return { listingId: null, isShopUrl: false, error: "Invalid numeric listing ID." };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { listingId: null, isShopUrl: false, error: "Please provide an Etsy listing URL or numeric listing ID." };
  }

  // Check if user accidentally pasted a shop URL
  const isShopUrl =
    /etsy\.com\/shop\/([a-zA-Z0-9_-]+)/i.test(trimmed) ||
    (/^(?:https?:\/\/)?([a-zA-Z0-9_-]+)\.etsy\.com/i.test(trimmed) &&
      !/^(?:https?:\/\/)?(?:www|api|openapi)\.etsy\.com/i.test(trimmed));

  if (isShopUrl) {
    const shopNameMatch =
      trimmed.match(/etsy\.com\/shop\/([a-zA-Z0-9_-]+)/i) ||
      trimmed.match(/^(?:https?:\/\/)?([a-zA-Z0-9_-]+)\.etsy\.com/i);
    const shopName = shopNameMatch?.[1];
    return {
      listingId: null,
      isShopUrl: true,
      shopName,
      error: `"${trimmed}" is an Etsy shop URL. Please enter an Etsy listing URL (e.g. etsy.com/listing/123456789) or numeric listing ID. To research this store, visit Shop Intelligence.`,
    };
  }

  // 1. Check for standard Etsy listing URL: /listing/123456789...
  const listingMatch = trimmed.match(/\/listing\/(\d+)/i) || trimmed.match(/listing\/(\d+)/i);
  if (listingMatch && listingMatch[1]) {
    const parsedId = Number.parseInt(listingMatch[1], 10);
    if (Number.isFinite(parsedId) && parsedId > 0) {
      return { listingId: parsedId, isShopUrl: false };
    }
  }

  // 2. Check for bare numeric listing ID
  if (/^\d{6,14}$/.test(trimmed)) {
    const parsedId = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsedId) && parsedId > 0) {
      return { listingId: parsedId, isShopUrl: false };
    }
  }

  // 3. Check for bare alphanumeric shop name (e.g. "LayerSculpt3D", "ModPawsPrints")
  if (/^[a-zA-Z0-9_-]{3,50}$/.test(trimmed) && /[a-zA-Z]/.test(trimmed)) {
    return {
      listingId: null,
      isShopUrl: true,
      shopName: trimmed,
      error: `"${trimmed}" appears to be an Etsy shop name rather than a listing. To research this store, visit Shop Intelligence.`,
    };
  }

  return {
    listingId: null,
    isShopUrl: false,
    error: `Could not parse a valid Etsy listing ID from "${trimmed}". Expected a URL like "https://www.etsy.com/listing/123456789" or a numeric listing ID.`,
  };
}
