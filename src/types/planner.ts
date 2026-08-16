/**
 * SellerSalt Planner & Strategic Workbench Domain Types
 */

import type {
  PlannerItemType,
  PlannerItemStatus,
  PlannerItem as PrismaPlannerItem,
} from "@prisma/client";

export type { PlannerItemType, PlannerItemStatus };

export interface PlannerResearchSnapshot {
  price?: number;
  estDailySales?: number;
  totalSales?: number;
  reviewCount?: number;
  activeListings?: number;
  shopAgeMonths?: number;
  opportunityScore?: number;
  discoveredKeywords?: string[];
  extractedTags?: string[];
  capturedAt?: string;
  [key: string]: unknown;
}

export interface PlannerProvenance {
  sourceType: "PROSPECT" | "SHOP" | "KEYWORD" | "SEO_AUDIT" | "MANUAL" | string;
  sourceId?: string | null;
  sourceShopExternalId?: string | null;
  sourceShopName?: string | null;
  sourceListingUrl?: string | null;
  sourceListingTitle?: string | null;
  researchSnapshot?: PlannerResearchSnapshot | null;
}

export interface PlannerItem extends Omit<PrismaPlannerItem, "researchSnapshot" | "metadata"> {
  researchSnapshot: PlannerResearchSnapshot | null;
  metadata: Record<string, unknown> | null;
}

export interface PlannerItemCreateInput {
  organizationId: string;
  userId?: string;
  type: PlannerItemType;
  title: string;
  status?: PlannerItemStatus;
  priority?: number;
  notes?: string;
  metadata?: Record<string, unknown>;

  // Provenance
  sourceType?: string;
  sourceId?: string;
  sourceShopExternalId?: string;
  sourceShopName?: string;
  sourceListingUrl?: string;
  sourceListingTitle?: string;
  researchSnapshot?: PlannerResearchSnapshot;

  // Strategic Targets
  targetCategory?: string;
  targetPrice?: number;
  estimatedCogs?: number;
  targetKeywords?: string[];
  dueDate?: Date;
}

export interface PlannerItemUpdateInput {
  title?: string;
  type?: PlannerItemType;
  status?: PlannerItemStatus;
  priority?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  targetCategory?: string;
  targetPrice?: number;
  estimatedCogs?: number;
  targetKeywords?: string[];
  dueDate?: Date | null;
  completedAt?: Date | null;
}

export interface PlannerFilterOptions {
  organizationId: string;
  status?: PlannerItemStatus | "ALL";
  type?: PlannerItemType | "ALL";
  priority?: number;
  searchQuery?: string;
}
