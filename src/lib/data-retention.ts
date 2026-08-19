import { prisma } from "./db";

/**
 * Etsy-derived shop/listing snapshots must not be retained longer than
 * reasonably necessary to provide SellerSalt's own tracking feature. The
 * only legitimate reason to keep snapshot history at all is the tracking
 * report feature itself, whose lookback window is already bounded per plan
 * by `Package.maxTrackingDays` (see /admin -> Plans & Quotas). This derives
 * the prune cutoff from the widest currently-sold tracking window instead
 * of a fixed number, so retention always matches actual product need.
 */
const FALLBACK_MAX_TRACKING_DAYS = 30;

export async function getSnapshotRetentionCutoff(): Promise<Date> {
  let widestWindowDays = FALLBACK_MAX_TRACKING_DAYS;
  try {
    const result = await prisma.package.aggregate({
      _max: { maxTrackingDays: true },
      where: { isActive: true },
    });
    if (result._max.maxTrackingDays && result._max.maxTrackingDays > 0) {
      widestWindowDays = result._max.maxTrackingDays;
    }
  } catch {
    // DB unavailable — fall back to the widest documented tier (Agency, 30d)
  }
  return new Date(Date.now() - widestWindowDays * 24 * 60 * 60 * 1000);
}
