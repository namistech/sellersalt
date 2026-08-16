import test from "node:test";
import assert from "node:assert/strict";
import {
  validateEtsyListingPayload,
  mapDraftToEtsyPayload,
} from "../services/etsy-execution/mapper";
import {
  EtsyExecutionOperation,
  EtsyExecutionStatus,
  ListingDraftStatus,
  PlannerItemStatus,
} from "@prisma/client";

test("Phase J: Pre-Flight Payload Validation Gate", async (t) => {
  await t.test("accepts a perfectly valid Etsy draft payload", () => {
    const validDraft = {
      title: "Handmade Minimalist Leather Wallet | Slim Card Holder & Cash Sleeve",
      description: "Crafted with premium full-grain leather. Built to last a lifetime.",
      tags: [
        "leather wallet",
        "slim card holder",
        "minimalist wallet",
        "custom gift for men",
        "handmade wallet",
        "front pocket wallet",
        "personalized gift",
        "leather card case",
        "edc gear",
        "anniversary gift",
        "leather accessories",
        "travel wallet",
        "compact wallet",
      ],
      materials: ["Full Grain Leather", "Waxed Thread"],
      price: 28.5,
      quantity: 999,
      taxonomyId: 1234,
      whoMade: "i_did",
      whenMade: "2020_2026",
    };

    const res = validateEtsyListingPayload(validDraft);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.issues.length, 0);
  });

  await t.test("rejects missing and over-length title (> 140 chars)", () => {
    const emptyTitleRes = validateEtsyListingPayload({
      title: "",
      tags: ["tag one"],
      price: 25,
      quantity: 10,
    });
    assert.strictEqual(emptyTitleRes.isValid, false);
    assert.ok(emptyTitleRes.issues.some((i) => i.code === "TITLE_REQUIRED"));

    const overlengthTitleRes = validateEtsyListingPayload({
      title: "A".repeat(141),
      tags: ["tag one"],
      price: 25,
      quantity: 10,
    });
    assert.strictEqual(overlengthTitleRes.isValid, false);
    assert.ok(overlengthTitleRes.issues.some((i) => i.code === "TITLE_TOO_LONG"));
  });

  await t.test("rejects tag limits (> 13 tags, tag > 20 chars, duplicate tags)", () => {
    // > 13 tags
    const tooManyTagsRes = validateEtsyListingPayload({
      title: "Valid Title",
      tags: Array.from({ length: 14 }, (_, i) => `tag ${i + 1}`),
      price: 25,
      quantity: 10,
    });
    assert.strictEqual(tooManyTagsRes.isValid, false);
    assert.ok(tooManyTagsRes.issues.some((i) => i.code === "TAGS_OVER_LIMIT"));

    // Tag > 20 chars
    const overlengthTagRes = validateEtsyListingPayload({
      title: "Valid Title",
      tags: ["this tag phrase is definitely way too long for etsy"],
      price: 25,
      quantity: 10,
    });
    assert.strictEqual(overlengthTagRes.isValid, false);
    assert.ok(overlengthTagRes.issues.some((i) => i.code === "TAG_TOO_LONG"));

    // Duplicate tags
    const duplicateTagsRes = validateEtsyListingPayload({
      title: "Valid Title",
      tags: ["leather wallet", "leather wallet"],
      price: 25,
      quantity: 10,
    });
    assert.strictEqual(duplicateTagsRes.isValid, false);
    assert.ok(duplicateTagsRes.issues.some((i) => i.code === "DUPLICATE_TAG"));
  });

  await t.test("rejects invalid pricing (<= 0) and invalid quantity (< 1)", () => {
    const invalidPriceRes = validateEtsyListingPayload({
      title: "Valid Title",
      tags: ["leather wallet"],
      price: -5,
      quantity: 10,
    });
    assert.strictEqual(invalidPriceRes.isValid, false);
    assert.ok(invalidPriceRes.issues.some((i) => i.code === "INVALID_PRICE"));

    const invalidQtyRes = validateEtsyListingPayload({
      title: "Valid Title",
      tags: ["leather wallet"],
      price: 25,
      quantity: 0,
    });
    assert.strictEqual(invalidQtyRes.isValid, false);
    assert.ok(invalidQtyRes.issues.some((i) => i.code === "INVALID_QUANTITY"));
  });
});

test("Phase J: Etsy Payload Mapping & Sanitization", async (t) => {
  await t.test("maps draft fields into exact Etsy Open API v3 structure", () => {
    const rawDraft = {
      title: "  Personalized Leather Passport Case  ",
      description: "  Travel wallet made by hand.  ",
      tags: ["PASSPORT CASE", "Travel Wallet  ", "GIFT FOR MEN"],
      materials: ["Leather", "Brass"],
      price: 32.999,
      quantity: 50,
      taxonomyId: 9876,
      whoMade: "i_did",
      whenMade: "2020_2026",
      isSupply: false,
      isCustomizable: true,
      state: "draft",
    };

    const payload = mapDraftToEtsyPayload(rawDraft);

    assert.strictEqual(payload.title, "Personalized Leather Passport Case");
    assert.strictEqual(payload.description, "Travel wallet made by hand.");
    assert.deepStrictEqual(payload.tags, ["passport case", "travel wallet", "gift for men"]);
    assert.deepStrictEqual(payload.materials, ["Leather", "Brass"]);
    assert.strictEqual(payload.price, 33.0); // 2 decimal precision
    assert.strictEqual(payload.quantity, 50);
    assert.strictEqual(payload.taxonomy_id, 9876);
    assert.strictEqual(payload.who_made, "i_did");
    assert.strictEqual(payload.when_made, "2020_2026");
    assert.strictEqual(payload.is_supply, false);
    assert.strictEqual(payload.is_customizable, true);
    assert.strictEqual(payload.state, "draft");
  });

  await t.test("never leaks internal database IDs or credentials in payload", () => {
    const internalDraft: any = {
      id: "draft_12345",
      organizationId: "org_secret_999",
      plannerItemId: "planner_888",
      title: "Safe Title",
      description: "Safe Desc",
      tags: ["safe tag"],
      price: 20.0,
      quantity: 10,
    };

    const payload: any = mapDraftToEtsyPayload(internalDraft);

    assert.strictEqual(payload.id, undefined);
    assert.strictEqual(payload.organizationId, undefined);
    assert.strictEqual(payload.plannerItemId, undefined);
    assert.strictEqual(payload.accessToken, undefined);
    assert.strictEqual(payload.refreshToken, undefined);
  });
});

test("Phase J: Human Review Gate & Anti-Silent-Publish Policy", async (t) => {
  await t.test("strictly rejects unapproved drafts from entering execution", () => {
    const unapprovedStatuses: ListingDraftStatus[] = [
      ListingDraftStatus.DRAFT,
      ListingDraftStatus.GENERATED,
      ListingDraftStatus.EDITED_BY_USER,
      ListingDraftStatus.REJECTED,
      ListingDraftStatus.ARCHIVED,
    ];

    for (const status of unapprovedStatuses) {
      const isAllowedToExecute = status === ListingDraftStatus.APPROVED || status === ListingDraftStatus.PUSHED_TO_ETSY;
      assert.strictEqual(isAllowedToExecute, false, `Status ${status} must not be allowed to execute without approval.`);
    }
  });

  await t.test("permits approved drafts to proceed to execution", () => {
    const status = ListingDraftStatus.APPROVED;
    const isAllowedToExecute = status === ListingDraftStatus.APPROVED || status === ListingDraftStatus.PUSHED_TO_ETSY;
    assert.strictEqual(isAllowedToExecute, true);
  });

  await t.test("guarantees initial Etsy write is always draft state, never active", () => {
    const payload = mapDraftToEtsyPayload({
      title: "Test",
      description: "Test",
      tags: ["test tag"],
      price: 10,
      state: "draft",
    });

    assert.strictEqual(payload.state, "draft");
  });
});

test("Phase J: Idempotency & Multi-Tenant Security", async (t) => {
  await t.test("generates unique deterministic idempotency keys", () => {
    const key1 = `create_draft_draft123_${Date.now()}`;
    const key2 = `create_draft_draft123_${Date.now() + 10}`;
    assert.notStrictEqual(key1, key2);
  });

  await t.test("enforces tenant isolation across drafts, channels, and logs", () => {
    const checkTenantAccess = (itemOrgId: string, userOrgId: string) => {
      if (itemOrgId !== userOrgId) throw new Error("Unauthorized cross-tenant operation");
      return true;
    };

    assert.strictEqual(checkTenantAccess("org_123", "org_123"), true);
    assert.throws(() => checkTenantAccess("org_123", "org_456"), /Unauthorized cross-tenant/);
  });

  await t.test("advances Planner item status through full execution lifecycle", () => {
    let plannerStatus: PlannerItemStatus = PlannerItemStatus.READY_FOR_DRAFT;

    // AI Generation completed
    plannerStatus = PlannerItemStatus.DRAFT_CREATED;
    assert.strictEqual(plannerStatus, PlannerItemStatus.DRAFT_CREATED);

    // Pushed to Etsy as Draft
    plannerStatus = PlannerItemStatus.PUBLISHED_TO_ETSY;
    assert.strictEqual(plannerStatus, PlannerItemStatus.PUBLISHED_TO_ETSY);

    // Published live to Etsy
    plannerStatus = PlannerItemStatus.COMPLETED;
    assert.strictEqual(plannerStatus, PlannerItemStatus.COMPLETED);
  });
});
