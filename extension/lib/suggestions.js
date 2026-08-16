// Pure helpers for Phase P4's Suggestion → Preview → Apply flow. No
// network/DOM access here — kept separate so it's directly unit testable
// (see src/tests/phase-p4-suggestions.test.ts). Mirrors the pattern
// already established by extension/lib/seo-request.js.

/** Same dedupe key shape as SEO audits — a snapshot update that doesn't
 * change any suggestion-relevant field must not trigger another request. */
export function suggestionInputKey(input) {
  return JSON.stringify({ title: input.title, tags: input.tags, description: input.description });
}

export function normalizeSuggestions(apiResponse) {
  if (!apiResponse || !Array.isArray(apiResponse.existingTags)) return null;
  return {
    existingTags: apiResponse.existingTags,
    recommendedNewTags: Array.isArray(apiResponse.recommendedNewTags) ? apiResponse.recommendedNewTags : [],
    recommendedTitle: typeof apiResponse.recommendedTitle === "string" ? apiResponse.recommendedTitle : null,
    keywordDataAvailable: Boolean(apiResponse.keywordDataAvailable),
    provenance: apiResponse.provenance ?? {},
  };
}

/** Additive by default — Apply for tags ADDS the selected suggestions to
 * the seller's existing tags rather than replacing them, per the
 * "preserve existing fields unless the user confirms replacement/
 * addition" requirement. Never exceeds Etsy's 13-tag limit. */
export function buildTagsAfterApply(existingTags, selectedNewTags) {
  const merged = [...existingTags];
  for (const tag of selectedNewTags) {
    if (merged.length >= 13) break;
    if (!merged.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      merged.push(tag);
    }
  }
  return merged;
}

/** The title suggestion is a full replacement — but only ever applied on
 * an explicit user click, and the caller always renders the returned
 * `preview` (before/after) prior to that click. */
export function buildTitlePreview(currentTitle, recommendedTitle) {
  return {
    before: currentTitle ?? "",
    after: recommendedTitle ?? "",
    changed: (currentTitle ?? "") !== (recommendedTitle ?? ""),
  };
}
