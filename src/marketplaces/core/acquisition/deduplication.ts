/**
 * SellerSalt Observation Identity & Deduplication Engine
 * 
 * Computes deterministic observation fingerprints to distinguish:
 * A. Unchanged observation (same price, rating, reviews, title, seller) -> touch timestamp, skip snapshot
 * B. Changed observation (price drop, review increase, rating change) -> record snapshot & diff
 * 
 * Strictly adheres to Zero-Fabrication: missing fields do not default to synthetic values.
 */

import { createHash } from "crypto";

export interface ObservationIdentity {
  marketplace: string;
  externalId: string;
  fingerprint: string;
  hasChanged: boolean;
  changedFields: string[];
}

/**
 * Computes a deterministic hash fingerprint representing the volatile
 * and descriptive state of a marketplace product observation.
 */
export function computeProductObservationFingerprint(product: {
  price?: number | null;
  currency?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  favoritesCount?: number | null;
  salesCount?: number | null;
  title?: string | null;
  shopName?: string | null;
  shopExternalId?: string | null;
  state?: string | null;
  availability?: string | null;
}): string {
  const normPrice = product.price !== null && product.price !== undefined ? Number(product.price).toFixed(2) : "null";
  const normCurrency = (product.currency || "USD").toUpperCase();
  const normRating = product.rating !== null && product.rating !== undefined ? Number(product.rating).toFixed(2) : "null";
  const normReviews = product.reviewCount !== null && product.reviewCount !== undefined ? String(product.reviewCount) : "null";
  const normFavorites = product.favoritesCount !== null && product.favoritesCount !== undefined ? String(product.favoritesCount) : "null";
  const normSales = product.salesCount !== null && product.salesCount !== undefined ? String(product.salesCount) : "null";
  const normTitle = (product.title || "").trim().toLowerCase().replace(/\s+/g, " ");
  const normShop = (product.shopName || product.shopExternalId || "").trim().toLowerCase();
  const normState = (product.state || "active").toLowerCase();
  const normAvailability = (product.availability || "unknown").toLowerCase();

  const payload = [
    normPrice,
    normCurrency,
    normRating,
    normReviews,
    normFavorites,
    normSales,
    normTitle,
    normShop,
    normState,
    normAvailability,
  ].join("|");

  return createHash("sha256").update(payload).digest("hex").substring(0, 32);
}

/**
 * Compares an existing observation with a newly acquired observation
 * to determine whether volatile metrics or descriptive fields have changed.
 */
export function evaluateObservationChange(
  existing: {
    fingerprint?: string | null;
    price?: number | null;
    rating?: number | null;
    reviewCount?: number | null;
    favoritesCount?: number | null;
    salesCount?: number | null;
    title?: string | null;
    shopName?: string | null;
    availability?: string | null;
  },
  incoming: {
    price?: number | null;
    rating?: number | null;
    reviewCount?: number | null;
    favoritesCount?: number | null;
    salesCount?: number | null;
    title?: string | null;
    shopName?: string | null;
    availability?: string | null;
  }
): {
  hasChanged: boolean;
  changedFields: string[];
  newFingerprint: string;
} {
  const newFingerprint = computeProductObservationFingerprint(incoming);
  const changedFields: string[] = [];

  if (existing.fingerprint && existing.fingerprint === newFingerprint) {
    return {
      hasChanged: false,
      changedFields: [],
      newFingerprint,
    };
  }

  if (existing.price !== incoming.price) changedFields.push("price");
  if (existing.rating !== incoming.rating) changedFields.push("rating");
  if (existing.reviewCount !== incoming.reviewCount) changedFields.push("reviewCount");
  if (existing.favoritesCount !== incoming.favoritesCount) changedFields.push("favoritesCount");
  if (existing.salesCount !== incoming.salesCount) changedFields.push("salesCount");
  if (existing.title && incoming.title && existing.title.trim() !== incoming.title.trim()) {
    changedFields.push("title");
  }
  if (existing.shopName && incoming.shopName && existing.shopName.trim() !== incoming.shopName.trim()) {
    changedFields.push("shopName");
  }
  if ((existing.availability || null) !== (incoming.availability || null)) {
    changedFields.push("availability");
  }

  // If fingerprint differed but no individual field in the subset did (e.g. currency/state), mark generic change
  if (changedFields.length === 0 && existing.fingerprint !== newFingerprint) {
    changedFields.push("metadata");
  }

  return {
    hasChanged: true,
    changedFields,
    newFingerprint,
  };
}
