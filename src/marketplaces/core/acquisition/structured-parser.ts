/**
 * SellerSalt Structured Data & Public HTML Parser
 * 
 * Extracts JSON-LD (schema.org/Product, BreadcrumbList, AggregateRating, Offer),
 * OpenGraph meta properties, and public marketplace listing cards from HTML documents.
 */

import type {
  ParsedJsonLdProduct,
  ParsedOpenGraphData,
  ParsedListingCard,
} from "./contracts";

/**
 * Extracts and parses all `<script type="application/ld+json">` blocks from HTML.
 */
export function extractJsonLdBlocks(html: string): any[] {
  if (!html) return [];
  const blocks: any[] = [];
  const scriptRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const rawContent = match[1]?.trim();
    if (!rawContent) continue;

    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed)) {
        blocks.push(...parsed);
      } else if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed["@graph"])) {
          blocks.push(...parsed["@graph"]);
        } else {
          blocks.push(parsed);
        }
      }
    } catch {
      // Ignore malformed JSON-LD scripts
    }
  }

  return blocks;
}

/**
 * Finds and normalizes `schema.org/Product` objects from extracted JSON-LD blocks.
 */
export function parseProductFromJsonLd(blocks: any[]): ParsedJsonLdProduct | null {
  for (const item of blocks) {
    if (!item || typeof item !== "object") continue;

    const type = item["@type"];
    const isProduct =
      type === "Product" ||
      type === "IndividualProduct" ||
      (Array.isArray(type) && (type.includes("Product") || type.includes("IndividualProduct")));

    if (!isProduct) continue;

    const name = item.name || item.headline || undefined;
    const description = item.description || undefined;
    const sku = item.sku || item.productID || item.identifier || undefined;
    const url = item.url || undefined;

    // Extract image
    let image: string | undefined;
    if (typeof item.image === "string") {
      image = item.image;
    } else if (Array.isArray(item.image) && item.image.length > 0) {
      image = typeof item.image[0] === "string" ? item.image[0] : item.image[0]?.url;
    } else if (item.image && typeof item.image === "object") {
      image = item.image.url || item.image.contentUrl;
    }

    // Extract price and currency from offers
    let price: number | undefined;
    let currency: string | undefined;
    const offers = item.offers;

    if (offers) {
      const offerObj = Array.isArray(offers) ? offers[0] : offers;
      if (offerObj) {
        if (offerObj.price !== undefined) {
          const parsedPrice = parseFloat(String(offerObj.price).replace(/[^0-9.]/g, ""));
          if (!isNaN(parsedPrice)) price = parsedPrice;
        } else if (offerObj.lowPrice !== undefined) {
          const parsedPrice = parseFloat(String(offerObj.lowPrice).replace(/[^0-9.]/g, ""));
          if (!isNaN(parsedPrice)) price = parsedPrice;
        }
        currency = offerObj.priceCurrency || undefined;
      }
    }

    // Extract ratings & reviews
    let ratingValue: number | undefined;
    let reviewCount: number | undefined;
    const aggregateRating = item.aggregateRating;

    if (aggregateRating && typeof aggregateRating === "object") {
      if (aggregateRating.ratingValue !== undefined) {
        const parsedRating = parseFloat(String(aggregateRating.ratingValue));
        if (!isNaN(parsedRating)) ratingValue = parsedRating;
      }
      if (aggregateRating.reviewCount !== undefined) {
        const parsedReviews = parseInt(String(aggregateRating.reviewCount), 10);
        if (!isNaN(parsedReviews)) reviewCount = parsedReviews;
      } else if (aggregateRating.ratingCount !== undefined) {
        const parsedRatingCount = parseInt(String(aggregateRating.ratingCount), 10);
        if (!isNaN(parsedRatingCount)) reviewCount = parsedRatingCount;
      }
    }

    // Extract brand or seller
    let brandName: string | undefined;
    if (typeof item.brand === "string") {
      brandName = item.brand;
    } else if (item.brand && typeof item.brand === "object") {
      brandName = item.brand.name;
    }

    let sellerName: string | undefined;
    let sellerUrl: string | undefined;
    const seller = item.seller || offers?.seller || (Array.isArray(offers) ? offers[0]?.seller : undefined);
    if (typeof seller === "string") {
      sellerName = seller;
    } else if (seller && typeof seller === "object") {
      sellerName = seller.name;
      sellerUrl = seller.url;
    }

    return {
      name,
      description,
      sku,
      image,
      price,
      currency,
      ratingValue,
      reviewCount,
      brandName: brandName || sellerName,
      sellerName: sellerName || brandName,
      sellerUrl,
      url,
      rawJsonLd: item,
    };
  }

  return null;
}

/**
 * Extracts BreadcrumbList category hierarchies from JSON-LD blocks.
 */
export function parseCategoryBreadcrumbsFromJsonLd(blocks: any[]): string[] {
  for (const item of blocks) {
    if (!item || typeof item !== "object") continue;
    if (item["@type"] === "BreadcrumbList" && Array.isArray(item.itemListElement)) {
      const items = [...item.itemListElement].sort((a, b) => (a.position || 0) - (b.position || 0));
      return items
        .map((el) => el.name || el.item?.name)
        .filter((n): n is string => typeof n === "string" && n.trim().length > 0);
    }
  }
  return [];
}

/**
 * Extracts OpenGraph meta tags from HTML.
 */
export function parseOpenGraphData(html: string): ParsedOpenGraphData {
  if (!html) return {};
  const og: ParsedOpenGraphData = {};
  const metaRegex = /<meta\s+[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
  const metaRegexReverse = /<meta\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    const key = match[1]?.toLowerCase();
    const val = match[2];
    if (key && val) og[key] = val;
  }

  while ((match = metaRegexReverse.exec(html)) !== null) {
    const val = match[1];
    const key = match[2]?.toLowerCase();
    if (key && val && !og[key]) og[key] = val;
  }

  if (og["price:amount"]) {
    const p = parseFloat(String(og["price:amount"]));
    if (!isNaN(p)) og.priceAmount = p;
  }
  if (og["price:currency"]) {
    og.priceCurrency = String(og["price:currency"]).toUpperCase();
  }

  return og;
}

/**
 * Extracts numeric listing ID from standard marketplace URLs.
 */
export function extractListingIdFromUrl(url: string): string | null {
  if (!url) return null;
  // Etsy: /listing/123456789/...
  const etsyMatch = url.match(/\/listing\/(\d+)/i);
  if (etsyMatch?.[1]) return etsyMatch[1];

  // Amazon: /dp/B08N5WRWNW or /gp/product/B08N5WRWNW
  const amazonMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  if (amazonMatch?.[1]) return amazonMatch[1];

  // eBay: /itm/123456789012
  const ebayMatch = url.match(/\/itm\/(\d+)/i);
  if (ebayMatch?.[1]) return ebayMatch[1];

  return null;
}

/**
 * Parses listing cards from public Etsy search result HTML.
 */
export function parseEtsyListingCardsFromHtml(html: string): ParsedListingCard[] {
  if (!html) return [];
  const cards: ParsedListingCard[] = [];
  const seenIds = new Set<string>();

  // Pattern 1: JSON-LD search items if present
  const jsonLdBlocks = extractJsonLdBlocks(html);
  for (const block of jsonLdBlocks) {
    if (block["@type"] === "ItemList" && Array.isArray(block.itemListElement)) {
      for (const el of block.itemListElement) {
        const item = el.item || el;
        const url = item.url || "";
        const externalId = extractListingIdFromUrl(url);
        if (externalId && !seenIds.has(externalId)) {
          seenIds.add(externalId);
          cards.push({
            externalId,
            title: item.name || "",
            url,
            imageUrl: typeof item.image === "string" ? item.image : item.image?.url,
            price: item.offers?.price ? parseFloat(String(item.offers.price)) : undefined,
            currency: item.offers?.priceCurrency,
          });
        }
      }
    }
  }

  // Pattern 2: HTML Listing Cards parsing (anchors containing /listing/)
  const listingAnchorRegex = /<a\s+([^>]*)href=["'](https?:\/\/(?:www\.)?etsy\.com\/listing\/(\d+)[^"']*)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = listingAnchorRegex.exec(html)) !== null) {
    const preAttrs = match[1];
    const fullUrl = match[2];
    const externalId = match[3];
    const postAttrs = match[4];
    const innerHtml = match[5];

    if (!externalId || seenIds.has(externalId)) continue;

    // Extract title from anchor tag attributes, inner image alt, h3, or title attribute
    let title = "";
    const anchorTitleMatch = (preAttrs + " " + postAttrs).match(/title=["']([^"']+)["']/i);
    const titleAttrMatch = innerHtml.match(/title=["']([^"']+)["']/i);
    const altMatch = innerHtml.match(/alt=["']([^"']+)["']/i);
    const headingMatch = innerHtml.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i);

    if (anchorTitleMatch?.[1]) {
      title = anchorTitleMatch[1].trim();
    } else if (titleAttrMatch?.[1]) {
      title = titleAttrMatch[1].trim();
    } else if (headingMatch?.[1]) {
      title = headingMatch[1].replace(/<[^>]+>/g, "").trim();
    } else if (altMatch?.[1]) {
      title = altMatch[1].trim();
    }

    if (!title || title.length < 3) continue;

    // Extract image url
    let imageUrl: string | undefined;
    const imgMatch = innerHtml.match(/src=["'](https?:\/\/[^"']+)["']/i);
    if (imgMatch?.[1]) imageUrl = imgMatch[1];

    // Extract price
    let price: number | undefined;
    let currency = "USD";
    const priceMatch =
      innerHtml.match(/(?:[$€£¥₹])\s*([0-9]+(?:\.[0-9]{2})?)/) ||
      innerHtml.match(/class=["'][^"']*currency-value[^"']*["'][^>]*>([0-9]+(?:\.[0-9]{2})?)/i);
    if (priceMatch?.[1]) {
      const p = parseFloat(priceMatch[1]);
      if (!isNaN(p)) price = p;
    }

    // Extract shop name
    let shopName: string | undefined;
    const shopMatch = innerHtml.match(/by\s+([A-Za-z0-9_-]+)/i);
    if (shopMatch?.[1]) shopName = shopMatch[1];

    seenIds.add(externalId);
    cards.push({
      externalId,
      title,
      url: fullUrl,
      imageUrl,
      price,
      currency,
      shopName,
    });
  }

  return cards;
}
