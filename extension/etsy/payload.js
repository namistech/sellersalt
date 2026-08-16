// Builds and compares the small normalized snapshot sent to the
// background worker. Deliberately flat — a fieldAvailability map covers
// graceful per-field reporting without deeply nesting every value.

export function buildEditorSnapshot({
  pageType,
  editorState,
  listingId,
  listingUrl,
  title,
  description,
  tags,
  categoryName,
}) {
  const normalizedTags = Array.isArray(tags) ? tags : [];
  return {
    pageType,
    editorState,
    listingId: listingId ?? null,
    listingUrl: listingUrl ?? null,
    title: title ?? null,
    description: description ?? null,
    tags: normalizedTags,
    // Never reliably derivable from the DOM alone — see etsy/selectors.js.
    taxonomyId: null,
    categoryName: categoryName ?? null,
    fieldAvailability: {
      title: title != null,
      description: description != null,
      tags: normalizedTags.length > 0,
      taxonomyId: false,
    },
    capturedAt: Date.now(),
  };
}

/** Stable serialization for equality checks — excludes capturedAt so two
 * snapshots with identical content but different timestamps still count
 * as duplicates. */
export function serializeForComparison(snapshot) {
  if (!snapshot) return "";
  const { capturedAt, ...rest } = snapshot;
  return JSON.stringify(rest);
}

export function isSamePayload(a, b) {
  if (!a || !b) return a === b;
  return serializeForComparison(a) === serializeForComparison(b);
}
