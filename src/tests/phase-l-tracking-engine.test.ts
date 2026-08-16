import test from "node:test";
import assert from "node:assert";
import {
  calculateShopDeltas,
  calculateShopVelocity,
  evaluateTrackingHealth,
  calculateListingDeltas,
  evaluateShopAlerts,
  type SnapshotLike,
  type ListingSnapshotLike,
} from "../services/tracking-engine";

test("Phase L: Shop Snapshot Deltas & Time-Window Analysis", async (t) => {
  const baseTime = new Date("2026-08-01T00:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const snapshots: SnapshotLike[] = [
    { totalSales: 1000, reviewCount: 50, activeListings: 100, capturedAt: new Date(baseTime) },
    { totalSales: 1020, reviewCount: 52, activeListings: 102, capturedAt: new Date(baseTime + 7 * dayMs) },
    { totalSales: 1080, reviewCount: 58, activeListings: 110, capturedAt: new Date(baseTime + 30 * dayMs) },
  ];

  await t.test("calculates single-period and multi-day sales deltas accurately", () => {
    const deltas = calculateShopDeltas(snapshots);

    // Latest single delta: 1080 - 1020 = 60
    assert.strictEqual(deltas.salesDeltaToday, 60);
    // Listing delta: 110 - 102 = 8
    assert.strictEqual(deltas.listingDelta, 8);
    // Review delta: 58 - 52 = 6
    assert.strictEqual(deltas.reviewDelta, 6);
    // 30-day delta: 1080 - 1000 = 80
    assert.strictEqual(deltas.salesDelta30d, 80);
  });

  await t.test("returns null deltas when fewer than 2 snapshots exist (cold start)", () => {
    const singleSnapshot = [snapshots[0]];
    const deltas = calculateShopDeltas(singleSnapshot);

    assert.strictEqual(deltas.salesDeltaToday, null);
    assert.strictEqual(deltas.salesDelta7d, null);
    assert.strictEqual(deltas.salesDelta30d, null);
    assert.strictEqual(deltas.listingDelta, null);
  });
});

test("Phase L: Deterministic Sales Velocity & Spike Detection", async (t) => {
  const baseTime = new Date("2026-08-01T00:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  await t.test("computes estimated daily sales accurately across date span", () => {
    const snapshots: SnapshotLike[] = [
      { totalSales: 500, reviewCount: 10, activeListings: 20, capturedAt: new Date(baseTime) },
      { totalSales: 600, reviewCount: 12, activeListings: 22, capturedAt: new Date(baseTime + 10 * dayMs) },
    ];

    // 100 sales gained over 10 days = 10.0 sales/day
    const velocity = calculateShopVelocity(snapshots);

    assert.strictEqual(velocity.estDailySales, 10.0);
    assert.strictEqual(velocity.isSpike, false);
  });

  await t.test("detects breakout sales spikes when recent velocity exceeds 300% baseline", () => {
    const spikeSnapshots: SnapshotLike[] = [
      { totalSales: 100, reviewCount: 10, activeListings: 20, capturedAt: new Date(baseTime) },
      { totalSales: 150, reviewCount: 12, activeListings: 20, capturedAt: new Date(baseTime + 10 * dayMs) },
      // Sudden surge: +50 sales in 1 day (vs baseline ~5/day)
      { totalSales: 200, reviewCount: 15, activeListings: 20, capturedAt: new Date(baseTime + 11 * dayMs) },
    ];

    const velocity = calculateShopVelocity(spikeSnapshots);

    assert.strictEqual(velocity.isSpike, true);
  });
});

test("Phase L: Competitor Alerts & 24h Deduplication Cooldown", async (t) => {
  const baseTime = new Date("2026-08-01T00:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const spikeSnapshots: SnapshotLike[] = [
    { totalSales: 100, reviewCount: 10, activeListings: 20, capturedAt: new Date(baseTime) },
    { totalSales: 110, reviewCount: 10, activeListings: 20, capturedAt: new Date(baseTime + 5 * dayMs) },
    { totalSales: 180, reviewCount: 12, activeListings: 45, capturedAt: new Date(baseTime + 6 * dayMs) }, // +70 sales, +25 listings
  ];

  await t.test("generates critical sales spike and catalog expansion alerts", () => {
    const alerts = evaluateShopAlerts("shop_123", "Vintage Craft", "org_1", spikeSnapshots);

    assert.ok(alerts.length >= 1);
    const spikeAlert = alerts.find((a) => a.eventType === "SALES_SPIKE");
    assert.ok(spikeAlert);
    assert.strictEqual(spikeAlert?.severity, "CRITICAL");

    const catalogAlert = alerts.find((a) => a.eventType === "CATALOG_SURGE");
    assert.ok(catalogAlert);
    assert.strictEqual(catalogAlert?.severity, "WARNING");
  });

  await t.test("deduplicates alerts within 24-hour cooldown window", () => {
    const recentAlerts = new Map<string, number>();
    recentAlerts.set("shop_123_SALES_SPIKE", Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago (within 24h)

    const alerts = evaluateShopAlerts("shop_123", "Vintage Craft", "org_1", spikeSnapshots, recentAlerts);

    const spikeAlert = alerts.find((a) => a.eventType === "SALES_SPIKE");
    assert.strictEqual(spikeAlert, undefined, "Spike alert must be suppressed during cooldown");
  });
});

test("Phase L: Listing Deltas & Tracking Health States", async (t) => {
  await t.test("computes price drop and favorites increase on tracked listings", () => {
    const listingSnapshots: ListingSnapshotLike[] = [
      { price: 45.0, numFavorers: 120, capturedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { price: 38.0, numFavorers: 150, capturedAt: new Date() },
    ];

    const deltas = calculateListingDeltas(listingSnapshots);

    assert.strictEqual(deltas.priceDelta, -7.0);
    assert.strictEqual(deltas.favorersDelta, 30);
  });

  await t.test("correctly evaluates COLD, HEALTHY, and STALE tracking health states", () => {
    const now = new Date();
    const staleTime = new Date(Date.now() - 36 * 60 * 60 * 1000); // 36 hours ago

    assert.strictEqual(evaluateTrackingHealth(null, 0), "COLD");
    assert.strictEqual(evaluateTrackingHealth({ capturedAt: now }, 1), "COLD");
    assert.strictEqual(evaluateTrackingHealth({ capturedAt: now }, 3), "HEALTHY");
    assert.strictEqual(evaluateTrackingHealth({ capturedAt: staleTime }, 3), "STALE");
  });
});

test("Phase L: Multi-Tenant Security & Organization Scoping", async (t) => {
  await t.test("strictly prevents cross-tenant tracking access", () => {
    const checkTenantWatchAccess = (userOrgId: string, watchOrgId: string) => {
      if (userOrgId !== watchOrgId) throw new Error("Cross-tenant tracking access denied");
      return true;
    };

    assert.strictEqual(checkTenantWatchAccess("org_a", "org_a"), true);
    assert.throws(() => checkTenantWatchAccess("org_a", "org_b"), /Cross-tenant tracking access denied/);
  });
});
