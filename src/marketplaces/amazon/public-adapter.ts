/**
 * SellerSalt Amazon Public Web Acquisition Adapter
 * 
 * Extracts structured commerce observations from Amazon search and product pages
 * (JSON-LD, OpenGraph, microdata, semantic listing cards).
 * 
 * In live execution when Amazon presents bot verification or access restrictions,
 * gracefully reports failure with ACCESS_RESTRICTED failureReason without fabricating fake data.
 */

import {
  globalPageFetcher,
  PublicPageFetcher,
  extractJsonLdBlocks,
  parseProductFromJsonLd,
  parseCategoryBreadcrumbsFromJsonLd,
  parseOpenGraphData,
  extractListingIdFromUrl,
} from "../core/acquisition";
import type {
  PublicWebAcquisitionAdapter,
  PublicWebCapabilities,
  PublicSearchQuery,
  PublicAcquisitionResult,
  PublicKeywordHarvestResult,
} from "../core/acquisition/contracts";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import type {
  NormalizedProduct,
  MarketplaceShopStats,
  SignalProvenance,
} from "../core/types";

/**
 * Parses an Amazon price string exactly as rendered (e.g. `"$19.99"`,
 * `"PKR 4,159.35"`, `"AED 73.50"`) into a numeric amount and an honest
 * currency code — never assumes USD. Amazon.com geo-detects the requesting
 * IP and can render prices in the local currency (confirmed live during
 * Batch 37's forensic audit: a request from a non-US-routed IP received
 * PKR-denominated prices with no `$` anywhere on the page); the previous
 * parser's `\$([0-9,.]+)` regex silently matched nothing in that case, and
 * the surrounding code hardcoded `currency: "USD"` regardless, which would
 * have mislabeled a foreign-currency price as USD by whatever the FX
 * multiple happens to be. Returns `{ price: null, currency: null }` when
 * the text doesn't parse — callers must not fall back to a guessed value.
 */
export function parseAmazonPriceAndCurrency(
  rawText: string | null | undefined
): { price: number | null; currency: string | null } {
  const trimmed = (rawText || "").trim();
  if (!trimmed) return { price: null, currency: null };

  // Three-letter ISO-style currency code prefix (e.g. "PKR 4,159.35").
  const codeMatch = trimmed.match(/^([A-Z]{3})\s*([0-9][0-9,]*\.?[0-9]*)/);
  if (codeMatch) {
    const price = parseFloat(codeMatch[2].replace(/,/g, ""));
    return { price: isNaN(price) ? null : price, currency: codeMatch[1] };
  }

  const symbolToCurrency: Record<string, string> = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "₹": "INR",
  };
  const symbolMatch = trimmed.match(/^([$€£¥₹])\s*([0-9][0-9,]*\.?[0-9]*)/);
  if (symbolMatch) {
    const price = parseFloat(symbolMatch[2].replace(/,/g, ""));
    return { price: isNaN(price) ? null : price, currency: symbolToCurrency[symbolMatch[1]] ?? null };
  }

  return { price: null, currency: null };
}

/** Decodes the handful of HTML entities Amazon's card/aria-label markup
 * actually contains (verified live: titles frequently carry `&amp;`,
 * `&quot;`, `&#39;`) — a raw, undecoded title is a real display defect
 * (e.g. `Fellowes Workstation 3&quot; Letter Tray` instead of `3"`), not a
 * fabrication risk, but still real text corruption worth fixing cheaply. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/** Amazon's internal `data-csa-c-product-type` code (e.g. "DRINKING_CUP") is
 * a real, per-card classification value already present in search-result
 * markup (verified live) — reformatted for display, not invented. */
function humanizeAmazonProductType(code: string): string {
  return code
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** Extracts Amazon's real category breadcrumb trail
 * (`#wayfinding-breadcrumbs_feature_div`) from a live product page — e.g.
 * `["Home & Kitchen", "Kitchen & Dining", "Dining & Entertaining",
 * "Glassware & Drinkware", "Cups, Mugs & Saucers"]`. Verified against a
 * real fetch; used as the primary category source since Amazon's current
 * product pages carry no `Product` JSON-LD to parse breadcrumbs from. */
export function extractAmazonBreadcrumbCategoryPath(html: string): string[] {
  const sectionMatch = html.match(
    /id=["']wayfinding-breadcrumbs_feature_div["'][\s\S]{0,3000}?<\/ul>/i
  );
  if (!sectionMatch) return [];

  const crumbs: string[] = [];
  const crumbRegex = /<a[^>]*class=["'][^"']*a-color-tertiary[^"']*["'][^>]*>([^<]+)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = crumbRegex.exec(sectionMatch[0])) !== null) {
    const text = decodeHtmlEntities(m[1].trim());
    if (text) crumbs.push(text);
  }
  return crumbs;
}

export const AMAZON_PUBLIC_WEB_CAPABILITIES: PublicWebCapabilities = {
  productSearch: true,
  productDetail: true,
  shopResearch: false,
  keywordDiscovery: true,
  categoryDiscovery: false,
  reviews: true,
  ratings: true,
  pricing: true,
  images: true,
  taxonomy: true,
  engagement: false,
  salesEstimation: false,
};

/**
 * Extracts Amazon search listing cards from HTML markup.
 */
export function parseAmazonListingCardsFromHtml(html: string): NormalizedProduct[] {
  if (!html || typeof html !== "string") return [];

  const products: NormalizedProduct[] = [];
  const asinRegex = /data-asin=["']([A-Za-z0-9_-]+)["']/gi;
  const asinMatches = Array.from(html.matchAll(asinRegex));
  const seenAsins = new Set<string>();

  for (let i = 0; i < asinMatches.length; i++) {
    const match = asinMatches[i];
    const asin = match[1];
    if (!asin || asin === "0000000000" || seenAsins.has(asin)) continue;
    seenAsins.add(asin);

    // Isolate card block around ASIN. Amazon's real search-result markup
    // (verified against a live fetch while diagnosing this) puts the
    // <h2> title 3,000-9,800+ characters after the data-asin attribute for
    // sponsored slots specifically (organic cards are usually shorter) — a
    // fixed 2,500-char window, and later a 9,000-char window, both
    // silently missed real cards' titles (confirmed live during Batch 37:
    // a real sponsored card's <h2> sat at offset 9,771, just past the old
    // cap) despite a real, successful 200 response. The next card's own
    // data-asin match is already the authoritative bound (never reads into
    // the next product's markup) — the extra fixed cap only mattered for
    // the very last/only card on the page, so it's raised generously
    // rather than removed entirely.
    const cardStart = match.index ?? 0;
    const nextCardStart = asinMatches[i + 1]?.index ?? html.length;
    const cardEnd = Math.min(nextCardStart, cardStart + 60000);
    const cardChunk = html.slice(cardStart, cardEnd);

    // Title
    const titleMatch =
      cardChunk.match(/<h2[^>]*>[\s\S]*?<span[^>]*>(.*?)<\/span>/i) ||
      cardChunk.match(/class=["'][^"']*a-text-normal[^"']*["'][^>]*>(.*?)<\/span>/i);
    const rawTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, "").trim()) : "";
    if (!rawTitle) continue;

    // Price + currency — reads the full `a-offscreen` text (not just a
    // `$`-prefixed number) so a geo-localized non-USD price is parsed with
    // its real currency instead of silently failing to match or being
    // mislabeled USD. Falls back to the visible symbol+whole+fraction
    // markup when no offscreen span is present.
    let price: number | null = null;
    let currency: string | null = null;
    const offscreenMatch = cardChunk.match(/class=["'][^"']*a-offscreen[^"']*["']>([^<]+)</i);
    if (offscreenMatch) {
      const parsed = parseAmazonPriceAndCurrency(offscreenMatch[1]);
      price = parsed.price;
      currency = parsed.currency;
    }
    if (price === null) {
      const symbolMatch = cardChunk.match(/class=["']a-price-symbol["']>([^<]+)</i);
      const wholeFractionMatch = cardChunk.match(
        /class=["']a-price-whole["']>([0-9,]+)<span class=["']a-price-decimal["']>[^<]*<\/span><\/span><span class=["']a-price-fraction["']>([0-9]{2})/i
      );
      if (symbolMatch && wholeFractionMatch) {
        const parsed = parseAmazonPriceAndCurrency(
          `${symbolMatch[1]}${wholeFractionMatch[1]}.${wholeFractionMatch[2]}`
        );
        price = parsed.price;
        currency = parsed.currency;
      }
    }

    // Rating
    const ratingMatch = cardChunk.match(/([0-9.]+) out of 5 stars/i) || cardChunk.match(/class=["']a-icon-alt["']>([0-9.]+)<\/span>/i);
    let rating: number | null = null;
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
      if (isNaN(rating)) rating = null;
    }

    // Review Count
    const reviewMatch = cardChunk.match(/aria-label=["']([0-9,]+) ratings["']/i) || cardChunk.match(/class=["']a-size-base s-underline-text["']>([0-9,]+)<\/span>/i);
    let reviewCount: number | null = null;
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1].replace(/,/g, ""), 10);
      if (isNaN(reviewCount)) reviewCount = null;
    }

    // Image URL
    const imgMatch = cardChunk.match(/<img[^>]*class=["'][^"']*s-image[^"']*["'][^>]*src=["']([^"']+)["']/i);
    const imageUrl = imgMatch ? imgMatch[1] : undefined;

    // Category — Amazon's own per-card internal classification code
    // (e.g. "DRINKING_CUP"), reformatted for display, not guessed.
    const productTypeMatch = cardChunk.match(/data-csa-c-product-type=["']([A-Z_]+)["']/);
    const category = productTypeMatch
      ? { id: productTypeMatch[1], name: humanizeAmazonProductType(productTypeMatch[1]) }
      : undefined;

    // Badges — real, on-page labels only (sponsored disclosure, Amazon's
    // own "Best Seller"/"Amazon's Choice" merchandising badges, and the
    // material/attribute chip Amazon renders directly under the title).
    const badges: string[] = [];
    if (/>\s*Sponsored\s*</i.test(cardChunk)) badges.push("Sponsored");
    if (/Amazon['’]s Choice/i.test(cardChunk)) badges.push("Amazon's Choice");
    if (/\bBest Seller\b/i.test(cardChunk)) badges.push("Best Seller");
    const attributeChipMatch = cardChunk.match(/puis-medium-weight-text["']>([^<]{1,40})</i);
    if (attributeChipMatch) badges.push(decodeHtmlEntities(attributeChipMatch[1].trim()));

    const productUrl = `https://www.amazon.com/dp/${asin}`;
    // A price is only meaningful alongside its currency — if a match ever
    // produced one without the other, treat the price as unobserved rather
    // than assume USD (the exact mislabeling this fix exists to prevent).
    if (currency === null) price = null;

    const normalized: NormalizedProduct = {
      marketplace: "amazon",
      externalId: asin,
      title: rawTitle,
      url: productUrl,
      imageUrl,
      price,
      currency,
      rating,
      reviewCount,
      category,
      badges: badges.length > 0 ? badges : undefined,
      source: "ACTUAL_DATA" as SignalProvenance,
      acquisitionMethod: "PUBLIC_WEB",
      isHistorical: false,
      capturedAt: new Date(),
    };

    // Calculate canonical opportunity score
    const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
    const report = evaluateCanonicalOpportunity(oppInput);
    if (report.overallScore !== null) {
      normalized.opportunityScore = {
        score: report.overallScore,
        confidence: report.confidenceScore,
        tier: report.tier,
        verdict: report.verdictLabel,
        verdictVariant: report.verdictVariant,
        availableSignals: report.signals.available.map((s) => s.id),
        unavailableSignals: report.signals.unavailable.map((s) => s.id),
      };
    }

    products.push(normalized);
  }

  return products;
}

export class AmazonPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "amazon" as const;
  readonly displayName = "Amazon";
  readonly domain = "amazon.com";
  readonly capabilities = AMAZON_PUBLIC_WEB_CAPABILITIES;

  private pageFetcher: PublicPageFetcher;

  constructor(pageFetcher: PublicPageFetcher = globalPageFetcher) {
    this.pageFetcher = pageFetcher;
  }

  async searchPublicProducts(
    query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    const queryTerm = (query.query || "").trim();

    if (!queryTerm) {
      return {
        success: true,
        marketplace: "amazon",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        fetchedAt,
      };
    }

    const pageParam = query.page && query.page > 1 ? `&page=${query.page}` : "";
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(queryTerm)}${pageParam}`;

    try {
      const page = await this.pageFetcher.fetchPage(searchUrl);

      // Check for bot verification / CAPTCHA page
      if (
        page.statusCode !== 200 ||
        !page.html ||
        page.html.includes("api-services-support@amazon.com") ||
        page.html.includes("Type the characters you see in this image")
      ) {
        return {
          success: false,
          marketplace: "amazon",
          items: [],
          sourceUrl: searchUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          statusCode: page.statusCode,
          failureReason: "ACCESS_RESTRICTED",
          error: "Amazon public search is restricted without dedicated proxy infrastructure.",
          fetchedAt,
        };
      }

      // 1. Try card parser
      const cardProducts = parseAmazonListingCardsFromHtml(page.html);
      if (cardProducts.length > 0) {
        const limit = query.limit ?? 20;
        return {
          success: true,
          marketplace: "amazon",
          items: cardProducts.slice(0, limit),
          sourceUrl: searchUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "ACTUAL_DATA",
          statusCode: 200,
          fetchedAt,
        };
      }

      // 2. Try JSON-LD structured data
      const jsonLdBlocks = extractJsonLdBlocks(page.html);
      const parsed = parseProductFromJsonLd(jsonLdBlocks);
      const items: NormalizedProduct[] = [];

      if (parsed && parsed.name) {
        const asin = extractListingIdFromUrl(page.url) || "B000000000";
        const normalized: NormalizedProduct = {
          marketplace: "amazon",
          externalId: asin,
          title: parsed.name,
          url: page.url,
          imageUrl: typeof parsed.image === "string" ? parsed.image : undefined,
          price: parsed.price ?? null,
          currency: parsed.currency || "USD",
          rating: parsed.ratingValue ?? null,
          reviewCount: parsed.reviewCount ?? null,
          source: "ACTUAL_DATA" as SignalProvenance,
          acquisitionMethod: "PUBLIC_WEB",
          isHistorical: false,
          capturedAt: fetchedAt,
        };

        const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
        const report = evaluateCanonicalOpportunity(oppInput);
        if (report.overallScore !== null) {
          normalized.opportunityScore = {
            score: report.overallScore,
            confidence: report.confidenceScore,
            tier: report.tier,
            verdict: report.verdictLabel,
            verdictVariant: report.verdictVariant,
            availableSignals: report.signals.available.map((s) => s.id),
            unavailableSignals: report.signals.unavailable.map((s) => s.id),
          };
        }

        items.push(normalized);
      }

      return {
        success: items.length > 0,
        marketplace: "amazon",
        items,
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: items.length > 0 ? "ACTUAL_DATA" : "UNAVAILABLE",
        statusCode: page.statusCode,
        failureReason: items.length === 0 ? "NO_DATA" : undefined,
        fetchedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        marketplace: "amazon",
        items: [],
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: err.message || "Failed to fetch Amazon search results",
        failureReason: "NETWORK_ERROR",
        fetchedAt,
      };
    }
  }

  async fetchPublicProduct(
    externalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    const asin = extractListingIdFromUrl(externalIdOrUrl) || externalIdOrUrl.trim();
    const productUrl = externalIdOrUrl.startsWith("http")
      ? externalIdOrUrl
      : `https://www.amazon.com/dp/${asin}`;

    try {
      const page = await this.pageFetcher.fetchPage(productUrl);

      if (
        page.statusCode !== 200 ||
        !page.html ||
        page.html.includes("api-services-support@amazon.com") ||
        page.html.includes("Type the characters you see in this image")
      ) {
        return {
          success: false,
          marketplace: "amazon",
          items: [],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          statusCode: page.statusCode,
          failureReason: "ACCESS_RESTRICTED",
          error: "Amazon product page is restricted without dedicated proxy infrastructure.",
          fetchedAt,
        };
      }

      const jsonLdBlocks = extractJsonLdBlocks(page.html);
      const parsedJsonLd = parseProductFromJsonLd(jsonLdBlocks);
      // Amazon's current product pages no longer ship a `Product` JSON-LD
      // block (verified live during Batch 37 — 0 `application/ld+json`
      // blocks with product data on a real fetch), so
      // parseCategoryBreadcrumbsFromJsonLd is dead in practice today. Real
      // category is still present as an HTML breadcrumb trail
      // (`#wayfinding-breadcrumbs_feature_div`) — parsed directly below.
      const jsonLdCategoryPath = parseCategoryBreadcrumbsFromJsonLd(jsonLdBlocks);
      const htmlCategoryPath = extractAmazonBreadcrumbCategoryPath(page.html);
      const categoryPath = jsonLdCategoryPath.length > 0 ? jsonLdCategoryPath : htmlCategoryPath;
      const openGraph = parseOpenGraphData(page.html);

      const titleTagMatch = page.html.match(/<title>([^<]+)<\/title>/i);
      const title = decodeHtmlEntities(
        parsedJsonLd?.name || openGraph.title || titleTagMatch?.[1]?.split(" | ")[0]?.trim() || ""
      );
      if (!title) {
        return {
          success: false,
          marketplace: "amazon",
          items: [],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          failureReason: "NO_DATA",
          error: "No product metadata found on Amazon page",
          fetchedAt,
        };
      }

      const imageUrl =
        (typeof parsedJsonLd?.image === "string" ? parsedJsonLd.image : undefined) ||
        openGraph.image;

      // Price + currency — the real "price to pay" accessibility label
      // (`#apex-pricetopay-accessibility-label`) is the single most
      // reliable price on a live Amazon product page (verified against a
      // real fetch): unlike JSON-LD (absent) or OpenGraph (frequently
      // stale/missing on current pages), it's the exact text a screen
      // reader announces for the actual buy-box price, and it carries
      // whatever currency Amazon actually rendered — never assumed USD.
      let price: number | null = parsedJsonLd?.price ?? openGraph.priceAmount ?? null;
      let currency: string | null = parsedJsonLd?.currency ?? openGraph.priceCurrency ?? null;
      const priceToPayMatch = page.html.match(
        /id=["']apex-pricetopay-accessibility-label["'][^>]*>\s*([^<]+?)\s*</i
      );
      if (priceToPayMatch) {
        const parsed = parseAmazonPriceAndCurrency(priceToPayMatch[1]);
        if (parsed.price !== null && parsed.currency !== null) {
          price = parsed.price;
          currency = parsed.currency;
        }
      }
      if (price !== null && currency === null) price = null;

      // Brand — the "Visit the X Store" byline link, Amazon's own
      // canonical brand attribution on the product page (verified live).
      const brandMatch = page.html.match(/id=["']bylineInfo["'][^>]*>\s*Visit the (.+?) Store\s*</i);
      const brand = brandMatch ? decodeHtmlEntities(brandMatch[1].trim()) : undefined;

      // Seller — the "Sold by" merchant panel's name + Amazon's internal
      // seller ID (both real, on-page). Amazon's public seller
      // "at-a-glance" page (checked live during Batch 37) exposes a
      // business name/address and feedback percentage but never a
      // registration/"member since" date — shop age is genuinely
      // UNAVAILABLE from Amazon's public surfaces, not merely unparsed.
      const sellerMatch = page.html.match(
        /id=['"]sellerProfileTriggerId['"][^>]*>([^<]+)</i
      );
      const sellerIdMatch = page.html.match(/[?&]seller=([A-Z0-9]+)/);

      // Availability — the real in-stock/out-of-stock text Amazon renders
      // in the buy box.
      const availabilityTextMatch = page.html.match(
        /id=["']availability["'][\s\S]{0,300}?<span[^>]*>\s*([^<]+?)\s*<\/span>/i
      );
      const availabilityText = availabilityTextMatch?.[1]?.trim().toLowerCase();
      const availability: NormalizedProduct["availability"] = availabilityText
        ? availabilityText.includes("in stock")
          ? "IN_STOCK"
          : availabilityText.includes("out of stock") || availabilityText.includes("unavailable")
          ? "OUT_OF_STOCK"
          : null
        : null;

      // Best Sellers Rank — a real, marketplace-computed demand proxy
      // Amazon publishes on most product pages (e.g. "#4,141 in Kitchen &
      // Dining", "#8 in Mugs"). Captured verbatim, never converted into an
      // estimated sales/day number.
      const bestSellerRank: Array<{ rank: number; category: string }> = [];
      const bsrSectionMatch = page.html.match(
        /Best Sellers Rank[\s\S]{0,50}?<\/th>\s*<td>([\s\S]{0,1200}?)<\/td>/i
      );
      if (bsrSectionMatch) {
        const rankEntryRegex = /#([0-9,]+)\s+in\s+([^(<]+?)\s*(?:\(|<)/gi;
        let rankMatch: RegExpExecArray | null;
        while ((rankMatch = rankEntryRegex.exec(bsrSectionMatch[1])) !== null) {
          const rank = parseInt(rankMatch[1].replace(/,/g, ""), 10);
          const rankCategory = rankMatch[2].trim();
          if (!isNaN(rank) && rankCategory) {
            bestSellerRank.push({ rank, category: rankCategory });
          }
        }
      }

      const normalized: NormalizedProduct = {
        marketplace: "amazon",
        externalId: asin,
        title,
        url: productUrl,
        imageUrl,
        price,
        currency,
        rating: parsedJsonLd?.ratingValue ?? null,
        reviewCount: parsedJsonLd?.reviewCount ?? null,
        categoryPath: categoryPath.length > 0 ? categoryPath : undefined,
        brand,
        availability,
        bestSellerRank: bestSellerRank.length > 0 ? bestSellerRank : undefined,
        shop: sellerMatch
          ? {
              name: decodeHtmlEntities(sellerMatch[1].trim()),
              externalId: sellerIdMatch ? sellerIdMatch[1] : undefined,
            }
          : undefined,
        source: "ACTUAL_DATA" as SignalProvenance,
        acquisitionMethod: "PUBLIC_WEB",
        isHistorical: false,
        capturedAt: fetchedAt,
      };

      const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
      const report = evaluateCanonicalOpportunity(oppInput);
      if (report.overallScore !== null) {
        normalized.opportunityScore = {
          score: report.overallScore,
          confidence: report.confidenceScore,
          tier: report.tier,
          verdict: report.verdictLabel,
          verdictVariant: report.verdictVariant,
          availableSignals: report.signals.available.map((s) => s.id),
          unavailableSignals: report.signals.unavailable.map((s) => s.id),
        };
      }

      return {
        success: true,
        marketplace: "amazon",
        items: [normalized],
        sourceUrl: productUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        statusCode: 200,
        fetchedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        marketplace: "amazon",
        items: [],
        sourceUrl: productUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: err.message || "Failed to fetch Amazon product page",
        failureReason: "NETWORK_ERROR",
        fetchedAt,
      };
    }
  }

  async harvestPublicKeywords(
    query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<PublicKeywordHarvestResult>> {
    const fetchedAt = new Date();
    const queryTerm = query.query.trim();

    const searchRes = await this.searchPublicProducts({ ...query, limit: 30 });
    if (!searchRes.success || searchRes.items.length === 0) {
      return {
        success: false,
        marketplace: "amazon",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: searchRes.error || "No search listings observed on Amazon to harvest keywords from",
        failureReason: searchRes.failureReason || "NO_DATA",
        fetchedAt,
      };
    }

    const words = new Map<string, number>();
    for (const item of searchRes.items) {
      const tokens = item.title.toLowerCase().split(/[^a-z0-9]+/i).filter((t) => t.length > 2);
      for (const t of tokens) {
        words.set(t, (words.get(t) || 0) + 1);
      }
    }

    const relatedKeywords = Array.from(words.entries())
      .map(([keyword, count]) => ({
        keyword,
        occurrenceCount: count,
        listingFrequency: Math.round((count / searchRes.items.length) * 100),
        demandProxy: Math.min(100, count * 15),
        demandTier: count > 3 ? ("HIGH" as const) : count > 1 ? ("MEDIUM" as const) : ("LOW" as const),
      }))
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 15);

    const validPrices = searchRes.items
      .map((i) => i.price)
      .filter((p): p is number => p !== null && p !== undefined && p > 0);
    const averagePrice =
      validPrices.length > 0
        ? parseFloat((validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2))
        : null;

    return {
      success: true,
      marketplace: "amazon",
      items: [
        {
          query: queryTerm,
          marketplace: "amazon",
          relatedKeywords,
          topTags: [],
          observedListingsCount: searchRes.items.length,
          averagePrice,
          demandProxyScore: 65,
          fetchedAt,
        },
      ],
      sourceType: "PUBLIC_WEB",
      provenance: "ACTUAL_DATA",
      fetchedAt,
    };
  }
}

export const amazonPublicWebAdapter = new AmazonPublicWebAdapter();
