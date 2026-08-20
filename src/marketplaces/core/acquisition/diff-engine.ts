/**
 * SellerSalt Observation Diff & Change Detection Engine
 * 
 * Compares longitudinal observations and consecutive research runs to calculate
 * empirical metric deltas, catalog shifts, price movement, and listing appearance/disappearance.
 * 
 * Strict Zero-Fabrication Guarantee:
 * When previous data is missing or observationCount <= 1, deltas are strictly null.
 */

export interface MetricDelta<T = number> {
  previous: T | null;
  current: T | null;
  delta: number | null;
  percentage?: number | null;
}

export interface ProductObservationDiff {
  externalId: string;
  marketplace: string;
  hasChanged: boolean;
  price?: MetricDelta<number> & { isPriceDrop?: boolean };
  reviews?: MetricDelta<number> & { velocityPerMonth?: number | null };
  rating?: MetricDelta<number>;
  favorites?: MetricDelta<number>;
  sales?: MetricDelta<number>;
  opportunityScore?: MetricDelta<number>;
  titleChanged?: boolean;
  shopChanged?: boolean;
  availabilityChanged?: boolean;
  previousObservedAt?: Date | null;
  currentObservedAt?: Date | null;
}

export interface ResearchRunDiffSummary {
  runIdA: string;
  runIdB: string;
  query: string;
  marketplace: string;
  appearingCount: number;
  disappearingCount: number;
  persistingCount: number;
  priceDropsCount: number;
  priceIncreasesCount: number;
  averagePriceDelta: number | null;
  averageOpportunityScoreDelta: number | null;
  productDiffs: ProductObservationDiff[];
  appearingListings: string[];
  disappearingListings: string[];
  generatedAt: Date;
}

/**
 * Calculates a structured difference between two observation snapshots of a single product.
 */
export function calculateProductObservationDiff(
  previous: {
    externalId: string;
    marketplace: string;
    price?: number | null;
    rating?: number | null;
    reviewCount?: number | null;
    favoritesCount?: number | null;
    salesCount?: number | null;
    opportunityScore?: number | null;
    title?: string | null;
    shopName?: string | null;
    state?: string | null;
    observedAt?: Date | string | null;
  } | null,
  current: {
    externalId: string;
    marketplace: string;
    price?: number | null;
    rating?: number | null;
    reviewCount?: number | null;
    favoritesCount?: number | null;
    salesCount?: number | null;
    opportunityScore?: number | null;
    title?: string | null;
    shopName?: string | null;
    state?: string | null;
    observedAt?: Date | string | null;
  }
): ProductObservationDiff {
  if (!previous) {
    return {
      externalId: current.externalId,
      marketplace: current.marketplace,
      hasChanged: false,
      price: current.price !== null && current.price !== undefined ? { previous: null, current: current.price, delta: null } : undefined,
      reviews: current.reviewCount !== null && current.reviewCount !== undefined ? { previous: null, current: current.reviewCount, delta: null } : undefined,
      rating: current.rating !== null && current.rating !== undefined ? { previous: null, current: current.rating, delta: null } : undefined,
      opportunityScore: current.opportunityScore !== null && current.opportunityScore !== undefined ? { previous: null, current: current.opportunityScore, delta: null } : undefined,
      currentObservedAt: current.observedAt ? new Date(current.observedAt) : new Date(),
    };
  }

  const prevDate = previous.observedAt ? new Date(previous.observedAt) : null;
  const currDate = current.observedAt ? new Date(current.observedAt) : new Date();

  // 1. Price Delta
  let priceDiff: (MetricDelta<number> & { isPriceDrop?: boolean }) | undefined;
  if (current.price !== null && current.price !== undefined) {
    const prevPrice = previous.price !== null && previous.price !== undefined ? previous.price : null;
    const delta = prevPrice !== null ? Math.round((current.price - prevPrice) * 100) / 100 : null;
    const percentage = prevPrice !== null && prevPrice > 0 ? Math.round(((current.price - prevPrice) / prevPrice) * 1000) / 10 : null;
    const isPriceDrop = delta !== null && delta < 0;

    priceDiff = {
      previous: prevPrice,
      current: current.price,
      delta,
      percentage,
      isPriceDrop,
    };
  }

  // 2. Reviews & Monthly Review Velocity
  let reviewDiff: (MetricDelta<number> & { velocityPerMonth?: number | null }) | undefined;
  if (current.reviewCount !== null && current.reviewCount !== undefined) {
    const prevReviews = previous.reviewCount !== null && previous.reviewCount !== undefined ? previous.reviewCount : null;
    const delta = prevReviews !== null ? current.reviewCount - prevReviews : null;

    let velocityPerMonth: number | null = null;
    if (delta !== null && prevDate && currDate) {
      const days = Math.max(1, (currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
      velocityPerMonth = Math.round((delta / days) * 30.44 * 10) / 10;
    }

    reviewDiff = {
      previous: prevReviews,
      current: current.reviewCount,
      delta,
      velocityPerMonth,
    };
  }

  // 3. Rating Delta
  let ratingDiff: MetricDelta<number> | undefined;
  if (current.rating !== null && current.rating !== undefined) {
    const prevRating = previous.rating !== null && previous.rating !== undefined ? previous.rating : null;
    const delta = prevRating !== null ? Math.round((current.rating - prevRating) * 100) / 100 : null;
    ratingDiff = { previous: prevRating, current: current.rating, delta };
  }

  // 4. Favorites Delta
  let favoritesDiff: MetricDelta<number> | undefined;
  if (current.favoritesCount !== null && current.favoritesCount !== undefined) {
    const prevFavs = previous.favoritesCount !== null && previous.favoritesCount !== undefined ? previous.favoritesCount : null;
    const delta = prevFavs !== null ? current.favoritesCount - prevFavs : null;
    favoritesDiff = { previous: prevFavs, current: current.favoritesCount, delta };
  }

  // 5. Sales Delta
  let salesDiff: MetricDelta<number> | undefined;
  if (current.salesCount !== null && current.salesCount !== undefined) {
    const prevSales = previous.salesCount !== null && previous.salesCount !== undefined ? previous.salesCount : null;
    const delta = prevSales !== null ? current.salesCount - prevSales : null;
    salesDiff = { previous: prevSales, current: current.salesCount, delta };
  }

  // 6. Opportunity Score Delta
  let oppDiff: MetricDelta<number> | undefined;
  if (current.opportunityScore !== null && current.opportunityScore !== undefined) {
    const prevOpp = previous.opportunityScore !== null && previous.opportunityScore !== undefined ? previous.opportunityScore : null;
    const delta = prevOpp !== null ? current.opportunityScore - prevOpp : null;
    oppDiff = { previous: prevOpp, current: current.opportunityScore, delta };
  }

  const titleChanged = !!(previous.title && current.title && previous.title.trim() !== current.title.trim());
  const shopChanged = !!(previous.shopName && current.shopName && previous.shopName.trim() !== current.shopName.trim());
  const availabilityChanged = !!(previous.state && current.state && previous.state !== current.state);

  const hasChanged = !!(
    (priceDiff?.delta !== null && priceDiff?.delta !== 0) ||
    (reviewDiff?.delta !== null && reviewDiff?.delta !== 0) ||
    (ratingDiff?.delta !== null && ratingDiff?.delta !== 0) ||
    (favoritesDiff?.delta !== null && favoritesDiff?.delta !== 0) ||
    (salesDiff?.delta !== null && salesDiff?.delta !== 0) ||
    (oppDiff?.delta !== null && oppDiff?.delta !== 0) ||
    titleChanged ||
    shopChanged ||
    availabilityChanged
  );

  return {
    externalId: current.externalId,
    marketplace: current.marketplace,
    hasChanged,
    price: priceDiff,
    reviews: reviewDiff,
    rating: ratingDiff,
    favorites: favoritesDiff,
    sales: salesDiff,
    opportunityScore: oppDiff,
    titleChanged,
    shopChanged,
    availabilityChanged,
    previousObservedAt: prevDate,
    currentObservedAt: currDate,
  };
}

/**
 * Compares two distinct research runs executed across time for the same search query.
 */
export function compareResearchRuns(
  runA: {
    id: string;
    query: string;
    marketplace: string;
    products: Array<{
      externalId: string;
      marketplace: string;
      price?: number | null;
      rating?: number | null;
      reviewCount?: number | null;
      favoritesCount?: number | null;
      salesCount?: number | null;
      opportunityScore?: number | null;
      title?: string | null;
      shopName?: string | null;
      observedAt?: Date | string | null;
    }>;
  },
  runB: {
    id: string;
    query: string;
    marketplace: string;
    products: Array<{
      externalId: string;
      marketplace: string;
      price?: number | null;
      rating?: number | null;
      reviewCount?: number | null;
      favoritesCount?: number | null;
      salesCount?: number | null;
      opportunityScore?: number | null;
      title?: string | null;
      shopName?: string | null;
      observedAt?: Date | string | null;
    }>;
  }
): ResearchRunDiffSummary {
  const mapA = new Map(runA.products.map((p) => [p.externalId, p]));
  const mapB = new Map(runB.products.map((p) => [p.externalId, p]));

  const appearingListings: string[] = [];
  const disappearingListings: string[] = [];
  const productDiffs: ProductObservationDiff[] = [];

  let priceDropsCount = 0;
  let priceIncreasesCount = 0;
  let totalPriceDelta = 0;
  let priceDeltaCount = 0;
  let totalOppDelta = 0;
  let oppDeltaCount = 0;

  // Check items in Run B (Current) vs Run A (Previous)
  for (const [id, itemB] of mapB.entries()) {
    const itemA = mapA.get(id);
    if (!itemA) {
      appearingListings.push(id);
      productDiffs.push(calculateProductObservationDiff(null, itemB));
    } else {
      const diff = calculateProductObservationDiff(itemA, itemB);
      productDiffs.push(diff);

      if (diff.price?.delta !== null && diff.price?.delta !== undefined) {
        totalPriceDelta += diff.price.delta;
        priceDeltaCount++;
        if (diff.price.delta < 0) priceDropsCount++;
        else if (diff.price.delta > 0) priceIncreasesCount++;
      }

      if (diff.opportunityScore?.delta !== null && diff.opportunityScore?.delta !== undefined) {
        totalOppDelta += diff.opportunityScore.delta;
        oppDeltaCount++;
      }
    }
  }

  // Check items in Run A that disappeared in Run B
  for (const [id] of mapA.entries()) {
    if (!mapB.has(id)) {
      disappearingListings.push(id);
    }
  }

  const persistingCount = mapB.size - appearingListings.length;
  const averagePriceDelta = priceDeltaCount > 0 ? Math.round((totalPriceDelta / priceDeltaCount) * 100) / 100 : null;
  const averageOpportunityScoreDelta = oppDeltaCount > 0 ? Math.round((totalOppDelta / oppDeltaCount) * 10) / 10 : null;

  return {
    runIdA: runA.id,
    runIdB: runB.id,
    query: runB.query,
    marketplace: runB.marketplace,
    appearingCount: appearingListings.length,
    disappearingCount: disappearingListings.length,
    persistingCount,
    priceDropsCount,
    priceIncreasesCount,
    averagePriceDelta,
    averageOpportunityScoreDelta,
    productDiffs,
    appearingListings,
    disappearingListings,
    generatedAt: new Date(),
  };
}
