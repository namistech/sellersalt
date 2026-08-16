import { fetchJson } from "./http";
import type {
  ListingDraft,
  ListingDraftCreateInput,
  ListingDraftUpdateInput,
} from "@/types/listing-draft";
import type { OriginalityCheckResult } from "@/types/originality";
import type { CompleteListingSeoAudit } from "@/types/seo";

export async function generateListingDraft(input: {
  plannerItemId?: string;
  conceptTitle: string;
  targetCategory?: string;
  taxonomyId?: number;
  targetPrice?: number;
  targetKeywords?: string[];
  productFacts?: string;
  materials?: string[];
  notes?: string;
  sourceTitle?: string;
  sourceDescription?: string;
  sourceTags?: string[];
}): Promise<{
  draft: any;
  originality: OriginalityCheckResult;
  seoAudit: CompleteListingSeoAudit;
  generationMetadata: any;
}> {
  return fetchJson("/api/studio/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function fetchListingDrafts(filters?: {
  status?: string;
  plannerItemId?: string;
}): Promise<{ drafts: any[] }> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters?.plannerItemId) params.set("plannerItemId", filters.plannerItemId);

  const qs = params.toString();
  return fetchJson(`/api/studio/drafts${qs ? `?${qs}` : ""}`);
}

export async function fetchListingDraft(id: string): Promise<{ draft: any }> {
  return fetchJson(`/api/studio/drafts/${encodeURIComponent(id)}`);
}

export async function updateListingDraft(
  id: string,
  updates: ListingDraftUpdateInput
): Promise<{ draft: any; seoAudit: CompleteListingSeoAudit }> {
  return fetchJson(`/api/studio/drafts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export async function deleteListingDraft(id: string): Promise<{ success: boolean; message?: string }> {
  return fetchJson(`/api/studio/drafts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function validateListingDraft(
  id: string
): Promise<{ draft: any; originality: OriginalityCheckResult; seoAudit: CompleteListingSeoAudit }> {
  return fetchJson(`/api/studio/drafts/${encodeURIComponent(id)}/validate`, {
    method: "POST",
  });
}
