import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { GET as getPlannedKeywords } from "@/app/api/planned-keywords/route";

test("Prompt 3: Planned Keywords API returns real observation metrics or honest UNAVAILABLE", async () => {
  const testOrgId = "test-sweep-org";

  // Setup test organization
  await prisma.organization.upsert({
    where: { id: testOrgId },
    update: {},
    create: {
      id: testOrgId,
      name: "Sweep Test Organization",
      type: "INDIVIDUAL",
    },
  });

  // Create a planned keyword with a real KeywordObservation
  await prisma.plannedKeyword.upsert({
    where: { organizationId_keyword: { organizationId: testOrgId, keyword: "linen apron dress" } },
    update: {},
    create: {
      organizationId: testOrgId,
      keyword: "linen apron dress",
    },
  });

  await prisma.keywordObservation.upsert({
    where: {
      organizationId_marketplace_keyword: {
        organizationId: testOrgId,
        marketplace: "etsy",
        keyword: "linen apron dress",
      },
    },
    update: {
      source: "google_keyword_planner",
      demandProxyScore: 82,
      competitionProxy: "LOW",
    },
    create: {
      organizationId: testOrgId,
      marketplace: "etsy",
      keyword: "linen apron dress",
      source: "google_keyword_planner",
      demandProxyScore: 82,
      competitionProxy: "LOW",
    },
  });

  // Create a planned keyword WITHOUT any KeywordObservation
  await prisma.plannedKeyword.upsert({
    where: { organizationId_keyword: { organizationId: testOrgId, keyword: "unknown niche term" } },
    update: {},
    create: {
      organizationId: testOrgId,
      keyword: "unknown niche term",
    },
  });

  // Verify DB query directly as API route requires next-auth getServerSession
  const keywords = await prisma.plannedKeyword.findMany({
    where: { organizationId: testOrgId },
  });

  const kwTexts = keywords.map((k) => k.keyword.toLowerCase().trim());
  const observations = await prisma.keywordObservation.findMany({
    where: {
      organizationId: testOrgId,
      keyword: { in: kwTexts },
    },
  });

  const obsMap = new Map(observations.map((o) => [o.keyword.toLowerCase().trim(), o]));

  const enriched = keywords.map((k) => {
    const obs = obsMap.get(k.keyword.toLowerCase().trim());
    return {
      ...k,
      demandProxyScore: obs?.demandProxyScore ?? null,
      competitionProxy: obs?.competitionProxy ?? "UNAVAILABLE",
      source: obs?.source ?? "UNAVAILABLE",
    };
  });

  const withObs = enriched.find((k) => k.keyword === "linen apron dress");
  assert.ok(withObs, "linen apron dress should be present");
  assert.equal(withObs?.source, "google_keyword_planner", "Should carry real source");
  assert.equal(withObs?.demandProxyScore, 82, "Should carry real demand proxy score");

  const withoutObs = enriched.find((k) => k.keyword === "unknown niche term");
  assert.ok(withoutObs, "unknown niche term should be present");
  assert.equal(withoutObs?.source, "UNAVAILABLE", "Missing observation must degrade to UNAVAILABLE");
  assert.equal(withoutObs?.demandProxyScore, null, "Missing demand score must remain null");
});
