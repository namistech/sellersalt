import { fetchJson } from "./http";
import type { CompleteListingSeoAudit } from "@/types/seo";
import type { CompleteShopSeoAudit, ShopSeoAuditInput } from "@/types/shop-seo-audit";

export async function auditListing(params: {
  listingId?: string | number;
  title?: string;
  tags?: string[];
  description?: string;
  materials?: string[];
  taxonomyId?: number;
  categoryPath?: string;
  save?: boolean;
  /** Which marketplace's optimization rules to score against — defaults to
   * "etsy" server-side when omitted. Ignored when `listingId` is set,
   * since that mode always audits real fetched Etsy data. See
   * src/marketplaces/core/optimization-rules.ts's getOptimizationRules(). */
  marketplace?: string;
  /** A connected SellerChannel id — when supplied, the server derives the
   * marketplace from that channel's real platform instead of `marketplace`
   * above (the connected store is authoritative). Ignored when `listingId`
   * is set. */
  sellerChannelId?: string;
}): Promise<{ audit: CompleteListingSeoAudit; marketplace: string }> {
  return fetchJson<{ audit: CompleteListingSeoAudit; marketplace: string }>("/api/seo/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function auditShopSeo(
  params: ShopSeoAuditInput
): Promise<{ audit: CompleteShopSeoAudit }> {
  return fetchJson<{ audit: CompleteShopSeoAudit }>("/api/seo/shop-audit", {
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
