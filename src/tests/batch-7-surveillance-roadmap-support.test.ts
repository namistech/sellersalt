import test from "node:test";
import assert from "node:assert/strict";
import { extractEtsyShopName } from "@/lib/etsy-url-parser";
import {
  calculateTitleSimilarity,
  findSimilarFeatures,
  createFeatureRequest,
  toggleFeatureUpvote,
  getFeatureRequests,
} from "@/services/feature-requests";
import {
  createSupportTicket,
  addTicketReply,
  getSupportTickets,
  getSupportTicketById,
} from "@/services/support-tickets";
import {
  evaluateProductOpportunity,
  evaluateShopCompetition,
} from "@/services/intelligence/universal-scoring";

test("Batch 7: URL & Shop Name Resolution Parser", async (t) => {
  await t.test("extracts shop name from standard full Etsy URL", () => {
    assert.equal(extractEtsyShopName("https://www.etsy.com/shop/ModPawsPrints"), "ModPawsPrints");
    assert.equal(extractEtsyShopName("http://etsy.com/shop/CozyKnitsStudio"), "CozyKnitsStudio");
    assert.equal(extractEtsyShopName("etsy.com/shop/ArtisanWoodUS"), "ArtisanWoodUS");
  });

  await t.test("extracts shop name from Etsy subdomain URL", () => {
    assert.equal(extractEtsyShopName("https://modpawsprints.etsy.com"), "modpawsprints");
    assert.equal(extractEtsyShopName("cozystudio.etsy.com"), "cozystudio");
  });

  await t.test("extracts bare shop names directly", () => {
    assert.equal(extractEtsyShopName("ModPawsPrints"), "ModPawsPrints");
    assert.equal(extractEtsyShopName("cozy-knits-99"), "cozy-knits-99");
  });

  await t.test("rejects empty or invalid shop strings", () => {
    assert.equal(extractEtsyShopName(""), null);
    assert.equal(extractEtsyShopName("   "), null);
    assert.equal(extractEtsyShopName("a"), null);
  });
});

test("Batch 7: Feature Request & Public Roadmap Service", async (t) => {
  await t.test("calculates word similarity correctly between similar feature titles", () => {
    const sim1 = calculateTitleSimilarity(
      "Export Competitor Keywords to CSV",
      "Exporting Competitor Keywords as CSV"
    );
    assert.ok(sim1 > 0.4, `Expected high similarity, got ${sim1}`);

    const sim2 = calculateTitleSimilarity(
      "Export Competitor Keywords to CSV",
      "Dark mode theme toggle for mobile app"
    );
    assert.ok(sim2 < 0.2, `Expected low similarity, got ${sim2}`);
  });

  await t.test("creates feature request and registers upvotes", async () => {
    const result = await createFeatureRequest({
      title: "Real-time Discord Webhook Alerts for Price Cuts",
      description: "Notify our Discord channel whenever a monitored competitor drops prices.",
      category: "SURVEILLANCE",
      authorName: "Test Seller",
      authorOrgId: "test-org-101",
    });

    assert.ok(result.item.id.startsWith("feat-"));
    assert.equal(result.item.status, "PENDING_REVIEW");
    assert.equal(result.item.upvotes, 1);

    // Toggle upvote from another organization
    const voteRes = await toggleFeatureUpvote(result.item.id, "test-org-202");
    assert.equal(voteRes.upvotes, 2);
    assert.equal(voteRes.hasUpvoted, true);

    // Toggle again (remove upvote)
    const voteRes2 = await toggleFeatureUpvote(result.item.id, "test-org-202");
    assert.equal(voteRes2.upvotes, 1);
    assert.equal(voteRes2.hasUpvoted, false);
  });
});

test("Batch 7: Customer Support Ticket Hub Service", async (t) => {
  await t.test("creates support ticket with priority and records replies", async () => {
    const ticket = await createSupportTicket({
      organizationId: "org-cust-1",
      userId: "user-1",
      authorName: "Alice Artisan",
      subject: "Question about 6-hour snapshot frequency",
      message: "How long after clicking Spy will the first snapshot appear in our dashboard?",
      category: "SURVEILLANCE",
      priority: "HIGH",
    });

    assert.ok(ticket.id.startsWith("tkt-"));
    assert.equal(ticket.status, "OPEN");
    assert.equal(ticket.priority, "HIGH");

    // Add staff reply
    const reply = await addTicketReply({
      ticketId: ticket.id,
      organizationId: "org-cust-1",
      authorName: "Support Engineer",
      isStaff: true,
      message: "The first snapshot is captured immediately upon tracking.",
    });

    assert.equal(reply.isStaff, true);
    assert.equal(ticket.replies.length, 1);

    const fetched = await getSupportTicketById(ticket.id, "org-cust-1");
    assert.ok(fetched);
    assert.equal(fetched.replies[0].message, "The first snapshot is captured immediately upon tracking.");
  });
});

test("Batch 7: Universal Scoring Engine Robustness", async (t) => {
  await t.test("evaluates shop competition score across valid bounds (0-100)", () => {
    const highFeasibility = evaluateShopCompetition({
      shopName: "EmergingCrafts",
      totalSales: 850,
      reviewCount: 95,
      activeListings: 24,
      shopAgeMonths: 6,
      estDailySales: 4.5,
    });

    assert.ok(highFeasibility.score >= 0 && highFeasibility.score <= 100);
    assert.ok(highFeasibility.score >= 70, `Expected high opportunity score, got ${highFeasibility.score}`);
    assert.equal(highFeasibility.verdictVariant, "success");

    const highMoat = evaluateShopCompetition({
      shopName: "MegaStoreInc",
      totalSales: 250000,
      reviewCount: 45000,
      activeListings: 1200,
      shopAgeMonths: 96,
      estDailySales: 85.0,
    });

    assert.ok(highMoat.score <= 60, `Expected lower score due to high moat, got ${highMoat.score}`);
  });
});
