import axios from "axios";
import type { EtsyExecutionLog } from "@/types/execution";

export interface ConnectedChannel {
  id: string;
  platform: string;
  label: string;
  storeUrl: string;
  status: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

export async function approveListingDraft(draftId: string) {
  const res = await axios.post(`/api/studio/drafts/${draftId}/approve`);
  return res.data;
}

export async function pushDraftToEtsy(draftId: string, sellerChannelId?: string) {
  const res = await axios.post(`/api/studio/drafts/${draftId}/push-etsy`, {
    sellerChannelId,
  });
  return res.data;
}

export async function publishListingToEtsy(draftId: string, sellerChannelId?: string) {
  const res = await axios.post(`/api/studio/drafts/${draftId}/publish`, {
    sellerChannelId,
  });
  return res.data;
}

export async function fetchDraftExecutionLogs(draftId: string): Promise<{ success: boolean; logs: any[] }> {
  const res = await axios.get(`/api/studio/drafts/${draftId}/logs`);
  return res.data;
}

export async function fetchConnectedEtsyChannels(): Promise<{ success: boolean; channels: ConnectedChannel[] }> {
  const res = await axios.get("/api/studio/channels");
  return res.data;
}
