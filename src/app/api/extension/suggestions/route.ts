import { NextResponse } from "next/server";
import { auditListingSeo } from "@/services/seo-engine";
import { fetchStandaloneKeywordResearch } from "@/services/keyword-research";
import { extractBearerToken, resolveExtensionSessionToken } from "@/lib/extension-pairing";

// Phase P4 — tag/title suggestion source data for the extension's
// Suggestion → Preview → Apply flow. This route composes two EXISTING
// engines (src/services/seo-engine.ts and src/services/keyword-research.ts)
// — it invents no new scoring or keyword-harvesting logic of its own,
// only filters/formats their real output. The extension only ever
// displays what this route returns; it never writes to Etsy on its own.
//
// Auth: extension bearer session token (Phase P1), same as /seo-audit.
export async function POST(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const identity = await resolveExtensionSessionToken(token);
  if (!identity) {
    return NextResponse.json({ error: "Session token is invalid or expired." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : "";
  const tags: string[] = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === "string")
    : [];
  const description = typeof body.description === "string" ? body.description : "";

  if (!title.trim()) {
    return NextResponse.json({ error: "Title is required to build suggestions." }, { status: 400 });
  }

  const audit = auditListingSeo({ title, tags, description });
  const diagnosticCodes = new Set(audit.diagnostics.map((d) => d.code));
  const existingTagsLower = new Set(tags.map((t) => t.trim().toLowerCase()));

  // Real, marketplace-derived tag candidates — reuses the existing
  // standalone keyword research engine exactly as its source of truth.
  // This is a live Etsy-backed call and can legitimately fail (no
  // connector configured, rate limit, network) — degrade gracefully
  // rather than block the whole suggestions response.
  let keywordDataAvailable = true;
  let harvested: Array<{ term: string; frequency: number; charCount: number; wordCount: number }> = [];
  try {
    const research = await fetchStandaloneKeywordResearch(identity.organizationId, { query: title });
    harvested = research.keywords
      .filter((k) => k.isTagCompliant && k.wordCount >= 2)
      .filter((k) => !existingTagsLower.has(k.term.toLowerCase()));
  } catch {
    keywordDataAvailable = false;
  }

  const slotsRemaining = Math.max(0, 13 - tags.length);
  const recommendedNewTags = harvested.slice(0, slotsRemaining).map((k) => ({
    tag: k.term,
    charCount: k.charCount,
    isCompliant: k.charCount <= 20,
    frequency: k.frequency,
  }));

  // Deterministic title suggestion — built only from the audit's own
  // diagnostics and the same real harvested phrases above, never an LLM.
  let recommendedTitle: string | null = null;
  if (diagnosticCodes.has("TITLE_TOO_LONG")) {
    recommendedTitle = truncateAtWordBoundary(title, 140);
  } else if ((diagnosticCodes.has("TITLE_TOO_SHORT") || diagnosticCodes.has("WEAK_TITLE_START")) && harvested.length > 0) {
    const additions = harvested
      .slice(0, 3)
      .map((k) => k.term)
      .filter((phrase) => !title.toLowerCase().includes(phrase.toLowerCase()));
    if (additions.length > 0) {
      const candidate = `${title} | ${additions.join(" | ")}`;
      recommendedTitle = candidate.length > 140 ? truncateAtWordBoundary(candidate, 140) : candidate;
    }
  }
  if (recommendedTitle === title) recommendedTitle = null;

  return NextResponse.json({
    existingTags: audit.tagAnalysis.tags.map((t) => ({
      tag: t.tag,
      charCount: t.charCount,
      isCompliant: t.isCompliant,
    })),
    recommendedNewTags,
    recommendedTitle,
    keywordDataAvailable,
    provenance: {
      recommendedNewTags: "ACTUAL_ETSY_DATA", // harvested from real competitor listings
      recommendedTitle: "SELLERSALT_SCORE", // deterministic composition, not Etsy/AI-generated
    },
  });
}

function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim();
}
