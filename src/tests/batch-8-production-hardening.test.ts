import test from "node:test";
import assert from "node:assert/strict";
import { normalizeImageUrl } from "@/components/ui/SafeImage";
import {
  createFeatureRequest,
  getFeatureRequests,
  adminUpdateFeatureRequest,
} from "@/services/feature-requests";
import {
  createSupportTicket,
  getSupportTickets,
  getSupportTicketById,
} from "@/services/support-tickets";
import {
  evaluateProductOpportunity,
  evaluateShopCompetition,
} from "@/services/intelligence/universal-scoring";
import { extractEtsyShopName } from "@/lib/etsy-url-parser";

test("Batch 8: Media & Image Pipeline URL Normalization", async (t) => {
  await t.test("upgrades HTTP Etsy static URLs to HTTPS for mixed-content safety", () => {
    const raw = "http://i.etsystatic.com/12345/r/il/abcd/listing.jpg";
    assert.equal(normalizeImageUrl(raw), "https://i.etsystatic.com/12345/r/il/abcd/listing.jpg");
  });

  await t.test("upgrades protocol-relative URLs to HTTPS", () => {
    const raw = "//img0.etsystatic.com/shop/banner.png";
    assert.equal(normalizeImageUrl(raw), "https://img0.etsystatic.com/shop/banner.png");
  });

  await t.test("safely handles null, empty, or whitespace strings", () => {
    assert.equal(normalizeImageUrl(null), null);
    assert.equal(normalizeImageUrl(undefined), null);
    assert.equal(normalizeImageUrl(""), null);
    assert.equal(normalizeImageUrl("   "), null);
  });
});

test("Batch 8: Feature Requests Privacy & Moderation Gates", async (t) => {
  await t.test("hides unapproved PENDING_REVIEW submissions from other organizations", async () => {
    const created = await createFeatureRequest({
      title: "Confidential Enterprise Webhook for Inventory Sync",
      description: "Private automated webhook syncing stock levels to external ERP.",
      category: "INTEGRATIONS",
      authorName: "Enterprise Seller",
      authorOrgId: "org-private-999",
    });

    assert.equal(created.item.status, "PENDING_REVIEW");

    // Other tenant querying roadmap
    const publicViewOtherOrg = await getFeatureRequests("org-other-111", false);
    const foundInOther = publicViewOtherOrg.find((f) => f.id === created.item.id);
    assert.equal(foundInOther, undefined, "Unapproved feature must not appear to other tenants!");

    // Author querying roadmap
    const authorView = await getFeatureRequests("org-private-999", false);
    const foundInAuthor = authorView.find((f) => f.id === created.item.id);
    assert.ok(foundInAuthor, "Author must be able to view their pending submission.");

    // Admin querying roadmap
    const adminView = await getFeatureRequests("org-admin-000", true);
    const foundInAdmin = adminView.find((f) => f.id === created.item.id);
    assert.ok(foundInAdmin, "Admin must be able to view pending submissions.");

    // Admin approves the feature
    await adminUpdateFeatureRequest({
      id: created.item.id,
      status: "PLANNED",
      adminResponse: "Approved by product team for Q4.",
    });

    // Now other organizations can see it
    const publicViewAfterApproval = await getFeatureRequests("org-other-111", false);
    const foundAfterApproval = publicViewAfterApproval.find((f) => f.id === created.item.id);
    assert.ok(foundAfterApproval, "Approved feature should now be visible on the public roadmap.");
    assert.equal(foundAfterApproval.status, "PLANNED");
  });
});

test("Batch 8: Support Ticket Cross-Tenant Quarantine", async (t) => {
  await t.test("strictly prevents reading or accessing tickets of another organization", async () => {
    const ticket = await createSupportTicket({
      organizationId: "org-alpha-77",
      userId: "user-alpha",
      authorName: "Alpha User",
      subject: "Urgent issue with Etsy token renewal",
      message: "Our shop token expired during the holiday sale.",
      category: "ETSY_API",
      priority: "URGENT",
    });

    // Tenant Alpha can view their own ticket
    const alphaTickets = await getSupportTickets("org-alpha-77");
    assert.ok(alphaTickets.some((t) => t.id === ticket.id));

    const directLookupAlpha = await getSupportTicketById(ticket.id, "org-alpha-77");
    assert.ok(directLookupAlpha);
    assert.equal(directLookupAlpha.subject, "Urgent issue with Etsy token renewal");

    // Tenant Beta must NOT find Tenant Alpha's ticket
    const betaTickets = await getSupportTickets("org-beta-88");
    assert.equal(betaTickets.some((t) => t.id === ticket.id), false);

    const directLookupBeta = await getSupportTicketById(ticket.id, "org-beta-88");
    assert.equal(directLookupBeta, null, "Direct ID lookup from another tenant must return null!");
  });
});

test("Batch 8: Shop URL Parser & Universal Rubric Robustness", async (t) => {
  await t.test("parses URLs across all valid Etsy storefront URL permutations", () => {
    assert.equal(extractEtsyShopName("https://etsy.com/shop/AlphaStudio"), "AlphaStudio");
    assert.equal(extractEtsyShopName("https://alphastudio.etsy.com"), "alphastudio");
    assert.equal(extractEtsyShopName("alphastudio"), "alphastudio");
    assert.equal(extractEtsyShopName("alphastudio/"), "alphastudio");
  });

  await t.test("evaluates product opportunity with full factor breakdown", () => {
    const opp = evaluateProductOpportunity({
      price: 48.0,
      shopReviewCount: 120,
      numFavorers: 420,
      listingAgeDays: 45,
      estDailySales: 3.2,
    });

    assert.ok(opp.score >= 0 && opp.score <= 100);
    assert.ok(opp.factors.length >= 3);
    assert.equal(typeof opp.tier, "string");
  });
});
