import axios, { AxiosError } from "axios";
import type {
  TrackedShopSummary,
  TrackedListingSummary,
  TrackingAlertItem,
  TrackingQuotaInfo,
} from "@/types/tracking";

function formatErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    if (err.response?.data?.error) return String(err.response.data.error);
    if (err.response?.data?.message) return String(err.response.data.message);
    if (err.response?.status === 401) return "Please log in to your SellerSalt account to view and manage competitor tracking.";
    if (err.response?.status === 403) return "Your tracking limit has been reached. Please upgrade your plan to track more shops.";
    if (err.response?.status === 404) return "The requested shop could not be found.";
    if (err.response?.status === 429) return "Marketplace request limit reached. Please wait a moment and try again.";
    if (err.response?.status && err.response.status >= 500) {
      return "SellerSalt market research service is temporarily refreshing. Please try again in a few moments.";
    }
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function fetchTrackedShops(): Promise<TrackedShopSummary[]> {
  try {
    const res = await axios.get("/api/tracking/shops");
    return res.data.shops || [];
  } catch (err) {
    throw new Error(formatErrorMessage(err, "Unable to load tracked competitor shops."));
  }
}

export async function startTrackingShop(data: {
  shopExternalId: string;
  shopName: string;
}): Promise<{ success: boolean; watch: any; message?: string }> {
  try {
    const res = await axios.post("/api/tracking/shops", data);
    return res.data;
  } catch (err) {
    throw new Error(formatErrorMessage(err, "Unable to start tracking competitor shop."));
  }
}

export async function stopTrackingShop(shopExternalId: string): Promise<{ success: boolean }> {
  try {
    const res = await axios.delete(`/api/tracking/shops/${shopExternalId}`);
    return res.data;
  } catch (err) {
    throw new Error(formatErrorMessage(err, "Unable to stop tracking competitor shop."));
  }
}

export async function fetchTrackedShopHistory(shopExternalId: string): Promise<any> {
  try {
    const res = await axios.get(`/api/tracking/shops/${shopExternalId}`);
    return res.data.shop;
  } catch (err) {
    throw new Error(formatErrorMessage(err, "Unable to fetch shop historical data."));
  }
}

export async function fetchTrackedListings(): Promise<TrackedListingSummary[]> {
  try {
    const res = await axios.get("/api/tracking/listings");
    return res.data.listings || [];
  } catch (err) {
    throw new Error(formatErrorMessage(err, "Unable to load tracked listings."));
  }
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
  try {
    const res = await axios.post("/api/tracking/listings", data);
    return res.data;
  } catch (err) {
    throw new Error(formatErrorMessage(err, "Unable to start tracking listing."));
  }
}

export async function stopTrackingListing(listingExternalId: string): Promise<{ success: boolean }> {
  try {
    const res = await axios.delete(`/api/tracking/listings/${listingExternalId}`);
    return res.data;
  } catch (err) {
    throw new Error(formatErrorMessage(err, "Unable to stop tracking listing."));
  }
}

export async function fetchTrackingAlerts(): Promise<TrackingAlertItem[]> {
  try {
    const res = await axios.get("/api/tracking/alerts");
    return res.data.alerts || [];
  } catch (err) {
    throw new Error(formatErrorMessage(err, "Unable to load tracking alerts."));
  }
}

export async function fetchTrackingQuota(): Promise<TrackingQuotaInfo> {
  try {
    const res = await axios.get("/api/tracking/quota");
    return res.data.quota;
  } catch (err) {
    // Graceful fallback quota for unauthenticated or initial loads
    return {
      trackedShopsCount: 0,
      maxTrackedShops: 10,
      trackedListingsCount: 0,
      maxTrackedListings: 40,
      isShopsQuotaReached: false,
      isListingsQuotaReached: false,
      planName: "Starter",
      maxTrackingDays: 3,
    };
  }
}
