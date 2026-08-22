import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { enrichKeywordsWithGoogleKeywordPlanner } from "@/services/keyword-research";
import { persistKeywordObservations } from "@/marketplaces/core/acquisition/persistence";

test("Prompt 2: enrichKeywordsWithGoogleKeywordPlanner degrades honestly when unconfigured", async () => {
  const sampleKeywords = [
    { term: "handmade candle", frequency: 15, percentage: 30, estimatedDemandSignal: 65, competitionLevel: "MODERATE" },
    { term: "soy wax candle", frequency: 8, percentage: 16, estimatedDemandSignal: 45, competitionLevel: "LOW" },
  ];
  const summary: any = { query: "handmade candle", fieldProvenance: {} };

  const { sourceUsed } = await enrichKeywordsWithGoogleKeywordPlanner(sampleKeywords, "handmade candle", summary);

  assert.equal(sourceUsed, "PUBLIC_WEB", "Should fallback to PUBLIC_WEB source indicator when unconfigured");
  assert.equal(summary.searchVolume, null, "Summary searchVolume must be null without credentials");
  assert.equal(summary.searchVolumeProvenance, "UNAVAILABLE", "Summary provenance must be UNAVAILABLE");
  assert.equal(summary.searchVolumeStatus, "UNAVAILABLE", "Summary searchVolumeStatus must be UNAVAILABLE");
  assert.equal(summary.fieldProvenance?.searchVolume?.value, null, "Field provenance value must be null");
  assert.equal(summary.fieldProvenance?.searchVolume?.provenance, "UNAVAILABLE", "Field provenance must be UNAVAILABLE");

  for (const k of sampleKeywords as any[]) {
    assert.equal(k.searchVolume, null, "Keyword searchVolume must be null");
    assert.equal(k.searchVolumeProvenance, "UNAVAILABLE", "Keyword searchVolumeProvenance must be UNAVAILABLE");
    assert.equal(k.externalMonthlyVolume, undefined, "externalMonthlyVolume must be undefined without credentials");
  }
});

test("Prompt 2: persistKeywordObservations stores source field correctly", async () => {
  // Create or verify an organization for test isolation
  const testOrg = await prisma.organization.upsert({
    where: { id: "test-kw-org-wiring" },
    update: {},
    create: {
      id: "test-kw-org-wiring",
      name: "Test Keyword Planner Org",
      type: "INDIVIDUAL",
    },
  });

  const keywordsToPersist = [
    {
      keyword: "leather journal planner",
      occurrenceCount: 12,
      listingFrequencyPercent: 24,
      observedAveragePrice: 28.5,
      demandProxyScore: 78,
      competitionProxy: "HIGH" as const,
      source: "google_keyword_planner",
    },
  ];

  await persistKeywordObservations(keywordsToPersist, {
    organizationId: testOrg.id,
    marketplace: "etsy",
    source: "google_keyword_planner",
  });

  const saved = await prisma.keywordObservation.findUnique({
    where: {
      organizationId_marketplace_keyword: {
        organizationId: testOrg.id,
        marketplace: "etsy",
        keyword: "leather journal planner",
      },
    },
  });

  assert.ok(saved, "Keyword observation should be saved in DB");
  assert.equal(saved.source, "google_keyword_planner", "Observation source should record google_keyword_planner");
  assert.equal(saved.demandProxyScore, 78, "Demand proxy score should be persisted");
});
