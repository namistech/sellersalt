import { fetchJson } from "./http";
import type { CompleteListingSeoAudit } from "@/types/seo";

export async function auditListing(params: {
  listingId?: string | number;
  title?: string;
  tags?: string[];
  description?: string;
  materials?: string[];
  taxonomyId?: number;
  categoryPath?: string;
  save?: boolean;
}): Promise<{ audit: CompleteListingSeoAudit }> {
  return fetchJson<{ audit: CompleteListingSeoAudit }>("/api/seo/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function addSeoAuditToPlanner(
  audit: CompleteListingSeoAudit
): Promise<{ item: any; isExisting: boolean; message: string }> {
  return fetchJson<{ item: any; isExisting: boolean; message: string }>("/api/planner/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Optimize SEO: ${audit.title.slice(0, 50)}...`,
      type: "SEO_TASK",
      targetKeywords: audit.tags.slice(0, 5),
      sourceType: "SEO_AUDIT",
      sourceId: audit.listingId || audit.id || "manual-audit",
      sourceListingTitle: audit.title,
      sourceListingUrl: audit.listingUrl,
      notes: `SEO Score: ${audit.overallScore}/100 (Grade ${audit.grade}). Found ${audit.diagnostics.length} diagnostic issues.`,
      researchSnapshot: {
        listingId: audit.listingId,
        title: audit.title,
        overallScore: audit.overallScore,
        grade: audit.grade,
        titleScore: audit.breakdown.titleScore,
        tagScore: audit.breakdown.tagScore,
        synergyScore: audit.breakdown.keywordSynergyScore,
        descriptionScore: audit.breakdown.descriptionScore,
        diagnosticsCount: audit.diagnostics.length,
        recommendationsCount: audit.recommendations.length,
        capturedAt: new Date().toISOString(),
      },
    }),
  });
}
