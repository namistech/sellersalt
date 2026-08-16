/**
 * SellerSalt AI Listing Draft & Generation Domain Types
 */

import type {
  ListingDraftStatus,
  ListingDraft as PrismaListingDraft,
} from "@prisma/client";

export type { ListingDraftStatus };

export interface ListingDraftPayload {
  title: string; // Etsy limit: 140 chars
  description: string;
  tags: string[]; // Exactly <= 13 tags, each <= 20 chars
  materials: string[];
  price: number;
  quantity: number;
  taxonomyId?: number;
  whoMade: "i_did" | "someone_else" | "collective";
  whenMade: string; // e.g. "2020_2026", "made_to_order"
  isSupply: boolean;
  isCustomizable: boolean;
  personalizationInstructions?: string;
  state: "draft" | "active";
}

export interface ListingGenerationMetadata {
  provider: string;
  modelId: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  generatedAt: string;
}

export interface ListingDraft extends Omit<PrismaListingDraft, "generationMetadata"> {
  generationMetadata: ListingGenerationMetadata | null;
}

export interface ListingDraftCreateInput {
  organizationId: string;
  plannerItemId?: string;
  sellerChannelId?: string;

  title: string;
  description: string;
  tags: string[];
  materials?: string[];
  taxonomyId?: number;
  price: number;
  quantity?: number;
  whoMade?: string;
  whenMade?: string;
  isSupply?: boolean;
  isCustomizable?: boolean;
  personalizationInstructions?: string;
  state?: string;

  generationPrompt?: string;
  aiModelUsed?: string;
  generationMetadata?: ListingGenerationMetadata;
  originalityScore?: number;
  originalityStatus?: string;
  maxCommonSubstring?: number;
  seoScore?: number;
}

export interface ListingDraftUpdateInput {
  title?: string;
  description?: string;
  tags?: string[];
  materials?: string[];
  taxonomyId?: number;
  price?: number;
  quantity?: number;
  whoMade?: string;
  whenMade?: string;
  isSupply?: boolean;
  isCustomizable?: boolean;
  personalizationInstructions?: string;
  state?: string;
  status?: ListingDraftStatus;
  originalityScore?: number;
  originalityStatus?: string;
  seoScore?: number;
  etsyListingId?: string;
  etsyDraftUrl?: string;
  lastPushedAt?: Date;
  lastPushError?: string;
}
