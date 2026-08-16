import test from "node:test";
import assert from "node:assert";
import {
  suggestionInputKey,
  normalizeSuggestions,
  buildTagsAfterApply,
  buildTitlePreview,
} from "../../extension/lib/suggestions.js";

test("Phase P4: Suggestion Request Deduplication", async (t) => {
  await t.test("produces the same key for unchanged SEO-relevant content", () => {
    const a = suggestionInputKey({ title: "Handmade Wallet", tags: ["leather"], description: "d" });
    const b = suggestionInputKey({ title: "Handmade Wallet", tags: ["leather"], description: "d" });
    assert.strictEqual(a, b);
  });

  await t.test("produces a different key when the title changes", () => {
    const a = suggestionInputKey({ title: "Handmade Wallet", tags: [], description: "" });
    const b = suggestionInputKey({ title: "Edited Wallet", tags: [], description: "" });
    assert.notStrictEqual(a, b);
  });
});

test("Phase P4: Suggestions Response Normalization", async (t) => {
  await t.test("normalizes a well-formed API response", () => {
    const result = normalizeSuggestions({
      existingTags: [{ tag: "leather", charCount: 7, isCompliant: true }],
      recommendedNewTags: [{ tag: "leather wallet gift", charCount: 19, isCompliant: true, frequency: 12 }],
      recommendedTitle: "Handmade Leather Wallet | Gift For Him",
      keywordDataAvailable: true,
      provenance: { recommendedNewTags: "ACTUAL_ETSY_DATA", recommendedTitle: "SELLERSALT_SCORE" },
    });

    assert.ok(result);
    assert.strictEqual(result.recommendedNewTags.length, 1);
    assert.strictEqual(result.recommendedTitle, "Handmade Leather Wallet | Gift For Him");
    assert.strictEqual(result.keywordDataAvailable, true);
  });

  await t.test("returns null (not a throw) for a malformed response", () => {
    assert.strictEqual(normalizeSuggestions(null), null);
    assert.strictEqual(normalizeSuggestions({}), null);
    assert.strictEqual(normalizeSuggestions({ existingTags: "not-an-array" }), null);
  });

  await t.test("defaults recommendedTitle to null and keywordDataAvailable to false when absent", () => {
    const result = normalizeSuggestions({ existingTags: [] });
    assert.ok(result);
    assert.strictEqual(result.recommendedTitle, null);
    assert.strictEqual(result.keywordDataAvailable, false);
    assert.deepStrictEqual(result.recommendedNewTags, []);
  });
});

test("Phase P4: Explicit-Apply Tag Merge (Additive, Never Destructive)", async (t) => {
  await t.test("adds new tags to the existing set rather than replacing it", () => {
    const merged = buildTagsAfterApply(["leather wallet"], ["gift for him", "minimalist wallet"]);
    assert.deepStrictEqual(merged, ["leather wallet", "gift for him", "minimalist wallet"]);
  });

  await t.test("never exceeds Etsy's 13-tag limit", () => {
    const existing = Array.from({ length: 12 }, (_, i) => `tag${i}`);
    const merged = buildTagsAfterApply(existing, ["new-a", "new-b", "new-c"]);
    assert.strictEqual(merged.length, 13);
  });

  await t.test("does not add a case-insensitive duplicate of an existing tag", () => {
    const merged = buildTagsAfterApply(["Leather Wallet"], ["leather wallet", "new tag"]);
    assert.deepStrictEqual(merged, ["Leather Wallet", "new tag"]);
  });

  await t.test("leaves existing tags completely untouched when no suggestions are selected", () => {
    const existing = ["leather wallet", "gift for him"];
    const merged = buildTagsAfterApply(existing, []);
    assert.deepStrictEqual(merged, existing);
  });
});

test("Phase P4: Title Preview (Suggestion → Preview step)", async (t) => {
  await t.test("reports the real before/after and a changed flag", () => {
    const preview = buildTitlePreview("Old Title", "New Better Title");
    assert.strictEqual(preview.before, "Old Title");
    assert.strictEqual(preview.after, "New Better Title");
    assert.strictEqual(preview.changed, true);
  });

  await t.test("reports changed:false when the recommendation matches the current title", () => {
    const preview = buildTitlePreview("Same Title", "Same Title");
    assert.strictEqual(preview.changed, false);
  });

  await t.test("handles a missing current title without throwing", () => {
    const preview = buildTitlePreview(undefined, "New Title");
    assert.strictEqual(preview.before, "");
    assert.strictEqual(preview.changed, true);
  });
});
