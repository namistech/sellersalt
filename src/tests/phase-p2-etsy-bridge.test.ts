import test from "node:test";
import assert from "node:assert";
import {
  EtsyPageType,
  classifyEtsyUrl,
  extractListingIdFromUrl,
} from "../../extension/etsy/page-detector.js";
import { buildEditorSnapshot, isSamePayload, serializeForComparison } from "../../extension/etsy/payload.js";

test("Phase P2: Etsy Listing-Editor URL Detection", async (t) => {
  await t.test("recognizes the listing editor path for an existing listing", () => {
    assert.strictEqual(
      classifyEtsyUrl("https://www.etsy.com/your/shops/me/listing-editor/edit/1234567890"),
      EtsyPageType.ETSY_LISTING_EDITOR
    );
  });

  await t.test("recognizes the listing editor path for a new (unsaved) listing", () => {
    assert.strictEqual(
      classifyEtsyUrl("https://www.etsy.com/your/shops/me/listing-editor/create"),
      EtsyPageType.ETSY_LISTING_EDITOR
    );
  });

  await t.test("extracts the numeric listing ID from an edit URL", () => {
    assert.strictEqual(
      extractListingIdFromUrl("https://www.etsy.com/your/shops/me/listing-editor/edit/1234567890"),
      "1234567890"
    );
  });

  await t.test("returns null listing ID for a create (not-yet-saved) URL", () => {
    assert.strictEqual(
      extractListingIdFromUrl("https://www.etsy.com/your/shops/me/listing-editor/create"),
      null
    );
  });
});

test("Phase P2: Unsupported / Non-Editor Page Detection", async (t) => {
  await t.test("classifies a non-Etsy site as NOT_ETSY", () => {
    assert.strictEqual(classifyEtsyUrl("https://www.google.com/search?q=etsy"), EtsyPageType.NOT_ETSY);
  });

  await t.test("classifies a public Etsy listing page as ETSY_LISTING_PUBLIC, not the editor", () => {
    assert.strictEqual(
      classifyEtsyUrl("https://www.etsy.com/listing/999888777/handmade-item"),
      EtsyPageType.ETSY_LISTING_PUBLIC
    );
  });

  await t.test("classifies the Shop Manager dashboard as ETSY_OTHER, not the editor", () => {
    assert.strictEqual(
      classifyEtsyUrl("https://www.etsy.com/your/shops/me/dashboard"),
      EtsyPageType.ETSY_OTHER
    );
  });

  await t.test("fails safe (NOT_ETSY) on a malformed URL rather than throwing", () => {
    assert.strictEqual(classifyEtsyUrl("not-a-url"), EtsyPageType.NOT_ETSY);
    assert.strictEqual(extractListingIdFromUrl("not-a-url"), null);
  });
});

test("Phase P2: Snapshot Normalization & Field Availability", async (t) => {
  await t.test("normalizes a fully-populated editor snapshot", () => {
    const snapshot = buildEditorSnapshot({
      pageType: EtsyPageType.ETSY_LISTING_EDITOR,
      editorState: "READY",
      listingId: "42",
      listingUrl: "https://www.etsy.com/your/shops/me/listing-editor/edit/42",
      title: "Handmade Leather Wallet",
      description: "A fine wallet.",
      tags: ["leather wallet", "gift for him"],
      categoryName: "Bags & Purses",
    });

    assert.strictEqual(snapshot.title, "Handmade Leather Wallet");
    assert.deepStrictEqual(snapshot.tags, ["leather wallet", "gift for him"]);
    assert.strictEqual(snapshot.fieldAvailability.title, true);
    assert.strictEqual(snapshot.fieldAvailability.tags, true);
    // taxonomyId is never DOM-derivable — always null/unavailable by design.
    assert.strictEqual(snapshot.taxonomyId, null);
    assert.strictEqual(snapshot.fieldAvailability.taxonomyId, false);
  });

  await t.test("marks missing fields unavailable instead of throwing or inventing values", () => {
    const snapshot = buildEditorSnapshot({
      pageType: EtsyPageType.ETSY_LISTING_EDITOR,
      editorState: "READY",
      listingId: null,
      listingUrl: "https://www.etsy.com/your/shops/me/listing-editor/create",
      title: null,
      description: null,
      tags: [],
      categoryName: null,
    });

    assert.strictEqual(snapshot.title, null);
    assert.strictEqual(snapshot.fieldAvailability.title, false);
    assert.deepStrictEqual(snapshot.tags, []);
    assert.strictEqual(snapshot.fieldAvailability.tags, false);
  });

  await t.test("gracefully represents a non-ready editor state with no extraction attempted", () => {
    const snapshot = buildEditorSnapshot({
      pageType: EtsyPageType.ETSY_LISTING_EDITOR,
      editorState: "LOADING",
      listingId: "42",
      listingUrl: "https://www.etsy.com/your/shops/me/listing-editor/edit/42",
      title: null,
      description: null,
      tags: [],
      categoryName: null,
    });

    assert.strictEqual(snapshot.editorState, "LOADING");
    assert.strictEqual(snapshot.fieldAvailability.title, false);
  });
});

test("Phase P2: Duplicate Payload Suppression", async (t) => {
  const base = {
    pageType: EtsyPageType.ETSY_LISTING_EDITOR,
    editorState: "READY",
    listingId: "42",
    listingUrl: "https://www.etsy.com/your/shops/me/listing-editor/edit/42",
    title: "Same Title",
    description: "Same description.",
    tags: ["same"],
    categoryName: null,
  };

  await t.test("treats two snapshots with identical content as the same payload", () => {
    const a = buildEditorSnapshot(base);
    const b = buildEditorSnapshot(base);
    assert.strictEqual(isSamePayload(a, b), true);
  });

  await t.test("ignores capturedAt timestamp differences when comparing", () => {
    const a = buildEditorSnapshot(base);
    const b = { ...buildEditorSnapshot(base), capturedAt: a.capturedAt + 5000 };
    assert.strictEqual(serializeForComparison(a), serializeForComparison(b));
    assert.strictEqual(isSamePayload(a, b), true);
  });

  await t.test("detects a real content change (e.g. edited title) as a different payload", () => {
    const a = buildEditorSnapshot(base);
    const b = buildEditorSnapshot({ ...base, title: "Edited Title" });
    assert.strictEqual(isSamePayload(a, b), false);
  });

  await t.test("treats a null/undefined snapshot as different from a real one", () => {
    const a = buildEditorSnapshot(base);
    assert.strictEqual(isSamePayload(a, null), false);
    assert.strictEqual(isSamePayload(null, null), true);
  });
});

test("Phase P2: Debounce Behavior", async (t) => {
  await t.test("collapses a burst of rapid updates into a single trailing call", async () => {
    let calls = 0;
    let timer: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 30;

    function scheduleSend() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        calls += 1;
      }, DEBOUNCE_MS);
    }

    // Simulates the content script's mutation/input burst during typing.
    for (let i = 0; i < 10; i++) {
      scheduleSend();
    }

    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 20));
    assert.strictEqual(calls, 1);
  });

  await t.test("fires again after a quiet period following a debounced call", async () => {
    let calls = 0;
    let timer: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 20;

    function scheduleSend() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        calls += 1;
      }, DEBOUNCE_MS);
    }

    scheduleSend();
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 15));
    scheduleSend();
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 15));

    assert.strictEqual(calls, 2);
  });
});
