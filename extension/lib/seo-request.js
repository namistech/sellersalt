// Pure helpers for building/deduplicating the extension's SEO audit
// requests and normalizing the server's response for display. No
// network/storage access here — kept separate so it's directly unit
// testable (see src/tests/phase-p3-seo-overlay.test.ts) and so
// background.js stays a thin orchestrator.

export function buildSeoAuditInput(snapshot) {
  return {
    title: snapshot?.title ?? "",
    tags: Array.isArray(snapshot?.tags) ? snapshot.tags : [],
    description: snapshot?.description ?? "",
  };
}

/** Stable key for deduplicating audit requests — a snapshot update that
 * doesn't change any SEO-relevant field (e.g. only editorState pinged
 * again) must never trigger another request. */
export function seoInputKey(input) {
  return JSON.stringify({ title: input.title, tags: input.tags, description: input.description });
}

/** Only a fully-rendered editor with at least a title is worth auditing —
 * matches Phase P2's editorState/fieldAvailability contract exactly. */
export function isSeoAuditable(snapshot) {
  return Boolean(snapshot && snapshot.editorState === "READY" && snapshot.fieldAvailability?.title);
}

// Normalizes the API response into the shape the side panel renders,
// and tags every number as a SellerSalt-computed value — never claimed
// to be Etsy-provided keyword volume, ranking, or demand data (there is
// no such field anywhere in this shape).
export function normalizeSeoAuditResult(apiResponse) {
  const audit = apiResponse?.audit;
  if (!audit || typeof audit.overallScore !== "number") {
    return null;
  }
  return {
    overallScore: audit.overallScore,
    grade: audit.breakdown?.grade ?? null,
    breakdown: {
      titleScore: audit.breakdown?.titleScore ?? 0,
      tagScore: audit.breakdown?.tagScore ?? 0,
      keywordSynergyScore: audit.breakdown?.keywordSynergyScore ?? 0,
      descriptionScore: audit.breakdown?.descriptionScore ?? 0,
      taxonomyScore: audit.breakdown?.taxonomyScore ?? 0,
    },
    diagnostics: Array.isArray(audit.diagnostics)
      ? audit.diagnostics.map((d) => ({
          code: d.code,
          severity: d.severity,
          title: d.title,
          message: d.message,
        }))
      : [],
    recommendations: Array.isArray(audit.recommendations)
      ? audit.recommendations.map((r) => ({ title: r.title, action: r.action, impactScore: r.impactScore }))
      : [],
    // [SELLERSALT SCORE] — deterministic calculation, not an Etsy metric.
    provenance: "SELLERSALT_SCORE",
  };
}

export function buildAuditErrorState(message) {
  return { status: "ERROR", error: message || "SEO audit failed.", updatedAt: Date.now() };
}
