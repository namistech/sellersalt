import test from "node:test";
import assert from "node:assert";
import { auditListingSeo } from "../services/seo-engine";
import {
  buildSeoAuditInput,
  seoInputKey,
  isSeoAuditable,
  normalizeSeoAuditResult,
  buildAuditErrorState,
} from "../../extension/lib/seo-request.js";

const READY_SNAPSHOT = {
  pageType: "ETSY_LISTING_EDITOR",
  editorState: "READY",
  listingId: "42",
  listingUrl: "https://www.etsy.com/your/shops/me/listing-editor/edit/42",
  title: "Handmade Leather Wallet Personalized Gift",
  description: "A fine wallet.",
  tags: ["leather wallet", "gift for him"],
  taxonomyId: null,
  categoryName: "Bags & Purses",
  fieldAvailability: { title: true, description: true, tags: true, taxonomyId: false },
  capturedAt: Date.now(),
};

test("Phase P3: Normalized Editor Payload → SEO Audit Input", async (t) => {
  await t.test("maps snapshot fields into the exact shape the API expects", () => {
    const input = buildSeoAuditInput(READY_SNAPSHOT);
    assert.deepStrictEqual(input, {
      title: "Handmade Leather Wallet Personalized Gift",
      tags: ["leather wallet", "gift for him"],
      description: "A fine wallet.",
    });
  });

  await t.test("defaults missing fields instead of throwing on a null/empty snapshot", () => {
    const input = buildSeoAuditInput({});
    assert.deepStrictEqual(input, { title: "", tags: [], description: "" });
  });

  await t.test("only auditable when the editor is READY with a title present", () => {
    assert.strictEqual(isSeoAuditable(READY_SNAPSHOT), true);
    assert.strictEqual(isSeoAuditable({ ...READY_SNAPSHOT, editorState: "LOADING" }), false);
    assert.strictEqual(
      isSeoAuditable({ ...READY_SNAPSHOT, fieldAvailability: { ...READY_SNAPSHOT.fieldAvailability, title: false } }),
      false
    );
    assert.strictEqual(isSeoAuditable(null), false);
  });
});

test("Phase P3: Debounce / Duplicate-Request Suppression", async (t) => {
  await t.test("produces an identical key for unchanged SEO-relevant content", () => {
    const a = seoInputKey(buildSeoAuditInput(READY_SNAPSHOT));
    const b = seoInputKey(buildSeoAuditInput({ ...READY_SNAPSHOT, listingUrl: "different-but-irrelevant" }));
    assert.strictEqual(a, b, "listingUrl is not SEO-relevant and must not affect the dedupe key");
  });

  await t.test("produces a different key when the title changes", () => {
    const a = seoInputKey(buildSeoAuditInput(READY_SNAPSHOT));
    const b = seoInputKey(buildSeoAuditInput({ ...READY_SNAPSHOT, title: "Edited Title" }));
    assert.notStrictEqual(a, b);
  });

  await t.test("produces a different key when tags change", () => {
    const a = seoInputKey(buildSeoAuditInput(READY_SNAPSHOT));
    const b = seoInputKey(buildSeoAuditInput({ ...READY_SNAPSHOT, tags: ["different tag"] }));
    assert.notStrictEqual(a, b);
  });

  await t.test("simulates the background worker's per-tab dedupe cache", () => {
    const lastAuditedKeyByTab = new Map();
    const tabId = 7;
    let requestCount = 0;

    function maybeAudit(snapshot: any) {
      const key = seoInputKey(buildSeoAuditInput(snapshot));
      if (lastAuditedKeyByTab.get(tabId) === key) return;
      lastAuditedKeyByTab.set(tabId, key);
      requestCount += 1;
    }

    maybeAudit(READY_SNAPSHOT);
    maybeAudit(READY_SNAPSHOT); // identical content — must not re-request
    maybeAudit({ ...READY_SNAPSHOT, title: "New Title" }); // real change — must request

    assert.strictEqual(requestCount, 2);
  });
});

test("Phase P3: SEO Response Normalization & Real Engine Wiring", async (t) => {
  await t.test("normalizes a real auditListingSeo() result — proves no duplicated scoring logic", () => {
    const audit = auditListingSeo(buildSeoAuditInput(READY_SNAPSHOT));
    const normalized = normalizeSeoAuditResult({ audit });
    assert.ok(normalized);

    assert.strictEqual(normalized.overallScore, audit.overallScore);
    assert.strictEqual(normalized.grade, audit.breakdown.grade);
    assert.strictEqual(normalized.breakdown.titleScore, audit.breakdown.titleScore);
    assert.strictEqual(normalized.breakdown.tagScore, audit.breakdown.tagScore);
    assert.ok(Array.isArray(normalized.diagnostics));
    assert.ok(Array.isArray(normalized.recommendations));
  });

  await t.test("returns null (not a throw or fabricated score) for a malformed API response", () => {
    assert.strictEqual(normalizeSeoAuditResult({}), null);
    assert.strictEqual(normalizeSeoAuditResult({ audit: { overallScore: "not-a-number" } }), null);
    assert.strictEqual(normalizeSeoAuditResult(null), null);
  });
});

test("Phase P3: Provenance Handling", async (t) => {
  await t.test("always tags a normalized result as SELLERSALT_SCORE, never an Etsy metric", () => {
    const audit = auditListingSeo(buildSeoAuditInput(READY_SNAPSHOT));
    const normalized = normalizeSeoAuditResult({ audit });
    assert.ok(normalized);
    assert.strictEqual(normalized.provenance, "SELLERSALT_SCORE");
  });

  await t.test("does not surface any keyword-volume, ranking, or demand field", () => {
    const audit = auditListingSeo(buildSeoAuditInput(READY_SNAPSHOT));
    const normalized = normalizeSeoAuditResult({ audit });
    assert.ok(normalized);
    const keys = Object.keys(normalized);
    for (const forbidden of ["keywordVolume", "searchVolume", "ranking", "demand"]) {
      assert.ok(!keys.includes(forbidden), `must never claim Etsy-provided "${forbidden}"`);
    }
  });
});

test("Phase P3: Error Handling", async (t) => {
  await t.test("builds an ERROR state carrying the failure message", () => {
    const state = buildAuditErrorState("Session token is invalid or expired.");
    assert.strictEqual(state.status, "ERROR");
    assert.strictEqual(state.error, "Session token is invalid or expired.");
    assert.ok(typeof state.updatedAt === "number");
  });

  await t.test("falls back to a generic message when none is given", () => {
    const state = buildAuditErrorState();
    assert.strictEqual(state.status, "ERROR");
    assert.ok(state.error.length > 0);
  });
});
