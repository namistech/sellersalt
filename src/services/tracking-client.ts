import axios from "axios";
import type {
  TrackedShopSummary,
  TrackedListingSummary,
  TrackingAlertItem,
  TrackingQuotaInfo,
} from "@/types/tracking";

export async function fetchTrackedShops(): Promise<TrackedShopSummary[]> {
  const res = await axios.get("/api/tracking/shops");
  return res.data.shops || [];
}

export async function startTrackingShop(data: {
  shopExternalId: string;
  shopName: string;
}): Promise<{ success: boolean; watch: any }> {
  const res = await axios.post("/api/tracking/shops", data);
  return res.data;
}

export async function stopTrackingShop(shopExternalId: string): Promise<{ success: boolean }> {
  const res = await axios.delete(`/api/tracking/shops/${shopExternalId}`);
  return res.data;
}

export async function fetchTrackedShopHistory(shopExternalId: string): Promise<any> {
  const res = await axios.get(`/api/tracking/shops/${shopExternalId}`);
  return res.data.shop;
}

export async function fetchTrackedListings(): Promise<TrackedListingSummary[]> {
  const res = await axios.get("/api/tracking/listings");
  return res.data.listings || [];
}

export async function startTrackingListing(data: {
  listingExternalId: string;
  title: string;
  shopExternalId?: string;
  shopName?: string;
  price?: number;
  currency?: string;
  quantity?: number;
  numFavorers?: number;
  url?: string;
  imageUrl?: string;
}): Promise<{ success: boolean; watch: any }> {
  const res = await axios.post("/api/tracking/listings", data);
  return res.data;
}

export async function stopTrackingListing(listingExternalId: string): Promise<{ success: boolean }> {
  const res = await axios.delete(`/api/tracking/listings/${listingExternalId}`);
  return res.data;
}

export async function fetchTrackingAlerts(): Promise<TrackingAlertItem[]> {
  const res = await axios.get("/api/tracking/alerts");
  return res.data.alerts || [];
}

export async function fetchTrackingQuota(): Promise<TrackingQuotaInfo> {
  const res = await axios.get("/api/tracking/quota");
  return res.data.quota;
}
