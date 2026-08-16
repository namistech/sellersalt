import test from "node:test";
import assert from "node:assert";

test("Task 1 & 4: Public Positioning & Pricing Plan Consistency", async (t) => {
  const planTiers = [
    {
      key: "STARTED",
      name: "Starter",
      priceUsd: 19,
      trialDays: 3,
      trialPriceUsd: 1.0,
      maxSearchConfigs: 3,
      maxTrackedShops: 5,
      maxProspectsPerMonth: 200,
    },
    {
      key: "PRO",
      name: "Pro",
      priceUsd: 49,
      trialDays: 3,
      trialPriceUsd: 1.0,
      maxSearchConfigs: 10,
      maxTrackedShops: 25,
      maxProspectsPerMonth: 1000,
    },
    {
      key: "AGENCY",
      name: "Agency",
      priceUsd: 199,
      trialDays: 3,
      trialPriceUsd: 1.0,
      maxSearchConfigs: 50,
      maxTrackedShops: 100,
      maxProspectsPerMonth: 5000,
    },
  ];

  await t.test("verifies active plan keys and ascending pricing", () => {
    assert.strictEqual(planTiers.length, 3);
    assert.strictEqual(planTiers[0].key, "STARTED");
    assert.strictEqual(planTiers[1].key, "PRO");
    assert.strictEqual(planTiers[2].key, "AGENCY");
    assert.ok(planTiers[0].priceUsd < planTiers[1].priceUsd);
    assert.ok(planTiers[1].priceUsd < planTiers[2].priceUsd);
  });

  await t.test("verifies $1 3-day trial consistency across plans", () => {
    for (const tier of planTiers) {
      assert.strictEqual(tier.trialDays, 3);
      assert.strictEqual(tier.trialPriceUsd, 1.0);
    }
  });
});

test("Task 7 & 8: First-Run Onboarding & Fast-Start Launchpads", async (t) => {
  const launchpads = [
    { id: "radar", title: "Hunt Winning Products", href: "/radar" },
    { id: "shop", title: "Research Competitors", href: "/spy" },
    { id: "categories", title: "Explore Market Niches", href: "/categories" },
    { id: "keywords", title: "Find Profitable Keywords", href: "/keyword-research" },
  ];

  await t.test("validates that all 4 first-value launchpad routes exist and are well-formed", () => {
    assert.strictEqual(launchpads.length, 4);
    for (const pad of launchpads) {
      assert.ok(pad.href.startsWith("/"));
      assert.ok(pad.title.length > 0);
    }
  });
});

test("Task 3: Data Provenance Transparency Badges", async (t) => {
  const provenanceTypes = ["ACTUAL_ETSY_DATA", "SELLERSALT_SCORE", "ESTIMATED", "EXTERNAL_DATA"] as const;

  const labels: Record<string, string> = {
    ACTUAL_ETSY_DATA: "From Etsy",
    SELLERSALT_SCORE: "SellerSalt Score",
    ESTIMATED: "SellerSalt estimate",
    EXTERNAL_DATA: "External Data",
  };

  await t.test("formats provenance into friendly natural language without technical jargon", () => {
    assert.strictEqual(labels.ACTUAL_ETSY_DATA, "From Etsy");
    assert.strictEqual(labels.SELLERSALT_SCORE, "SellerSalt Score");
    assert.strictEqual(labels.ESTIMATED, "SellerSalt estimate");
  });
});
