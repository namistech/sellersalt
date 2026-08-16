import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEtsyListingInput } from "../lib/etsy-listing-parser";
import { diagnoseEtsyConnector } from "../services/connector-diagnostics";
import {
  PLAN_DEFINITIONS,
  isTierSufficient,
  getFeatureAccess,
} from "../services/plans/plan-capabilities";

describe("Batch 15: SEO Audit & Listing Input Boundary Parser", () => {
  it("extracts numeric listing ID from standard Etsy URL", () => {
    const res = parseEtsyListingInput("https://www.etsy.com/listing/1429810482/personalized-leather-journal");
    assert.strictEqual(res.listingId, 1429810482);
    assert.strictEqual(res.isShopUrl, false);
  });

  it("extracts numeric listing ID from bare number", () => {
    const res = parseEtsyListingInput("1429810482");
    assert.strictEqual(res.listingId, 1429810482);
    assert.strictEqual(res.isShopUrl, false);
  });

  it("identifies full Etsy shop URL and extracts shop name", () => {
    const res = parseEtsyListingInput("https://www.etsy.com/shop/LayerSculpt3D");
    assert.strictEqual(res.listingId, null);
    assert.strictEqual(res.isShopUrl, true);
    assert.strictEqual(res.shopName, "LayerSculpt3D");
    assert.ok(res.error?.includes("Shop Intelligence"));
  });

  it("identifies bare alphanumeric shop name and redirects to Shop Intelligence", () => {
    const res = parseEtsyListingInput("LayerSculpt3D");
    assert.strictEqual(res.listingId, null);
    assert.strictEqual(res.isShopUrl, true);
    assert.strictEqual(res.shopName, "LayerSculpt3D");
    assert.ok(res.error?.includes("Shop Intelligence"));
  });
});

describe("Batch 15: Etsy Connector Scope Diagnostics & Capability Matrix", () => {
  it("diagnoses full commercial capabilities when all scopes are granted", () => {
    const report = diagnoseEtsyConnector(["shops_r", "listings_r", "listings_w", "transactions_r"]);
    assert.strictEqual(report.commercialApprovalStatus, "COMMERCIAL_WRITE_APPROVED");
    assert.strictEqual(report.capabilities.length, 4);

    const draftCap = report.capabilities.find((c) => c.id === "listings-draft");
    assert.strictEqual(draftCap?.status, "AVAILABLE");
  });

  it("diagnoses standard read mode and indicates commercial write gate when write scope is missing", () => {
    const report = diagnoseEtsyConnector(["shops_r", "listings_r"]);
    assert.strictEqual(report.commercialApprovalStatus, "STANDARD_READ");

    const draftCap = report.capabilities.find((c) => c.id === "listings-draft");
    assert.strictEqual(draftCap?.status, "REQUIRES_ETSY_APPROVAL");
    assert.ok(report.diagnosticMessage.includes("Standard Read access"));
  });
});

describe("Batch 15: Centralized Plan & Capability Architecture", () => {
  it("verifies plan definition limits and tier hierarchy", () => {
    assert.strictEqual(PLAN_DEFINITIONS.FREE.limits.connectedEtsyStores, 0);
    assert.strictEqual(PLAN_DEFINITIONS.STARTED.limits.connectedEtsyStores, 1);
    assert.strictEqual(PLAN_DEFINITIONS.PRO.limits.connectedEtsyStores, 5);
    assert.strictEqual(PLAN_DEFINITIONS.AGENCY.limits.connectedEtsyStores, 25);

    assert.strictEqual(isTierSufficient("FREE", "STARTED"), false);
    assert.strictEqual(isTierSufficient("STARTED", "STARTED"), true);
    assert.strictEqual(isTierSufficient("PRO", "STARTED"), true);
    assert.strictEqual(isTierSufficient("AGENCY", "PRO"), true);
  });

  it("evaluates feature entitlements based on active subscription tier", () => {
    const freeAccess = getFeatureAccess("FREE");
    assert.strictEqual(freeAccess.canConnectEtsy, false);
    assert.strictEqual(freeAccess.canTrackCompetitors, true);

    const proAccess = getFeatureAccess("PRO");
    assert.strictEqual(proAccess.canConnectEtsy, true);
    assert.strictEqual(proAccess.canManageMultipleStores, true);
    assert.strictEqual(proAccess.canAccessAgencyTools, false);

    const agencyAccess = getFeatureAccess("AGENCY");
    assert.strictEqual(agencyAccess.canAccessAgencyTools, true);
  });
});
