/**
 * SellerSalt Background Acquisition Job System Foundation
 * 
 * Defines standardized internal contracts for scheduled background acquisition jobs,
 * scheduled market refreshes, periodic niche tracking, and catalog synchronizations.
 */

import type { MarketplaceId, DataSourceType } from "../types";
import type { AcquisitionReport } from "./orchestrator";

export type AcquisitionJobType =
  | "SCHEDULED_NICHE_REFRESH"
  | "SCHEDULED_SHOP_REFRESH"
  | "SCHEDULED_KEYWORD_REFRESH"
  | "MARKETPLACE_CATALOG_SYNC";

export type AcquisitionJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface AcquisitionJobPayload {
  jobId: string;
  type: AcquisitionJobType;
  marketplace: MarketplaceId;
  targetQuery?: string;
  targetExternalId?: string;
  organizationId?: string;
  preferredSources?: DataSourceType[];
  scheduledAt: Date;
  retryCount?: number;
  maxRetries?: number;
}

export interface AcquisitionJobResult {
  jobId: string;
  type: AcquisitionJobType;
  marketplace: MarketplaceId;
  status: AcquisitionJobStatus;
  startedAt: Date;
  completedAt: Date;
  recordsAcquired: number;
  recordsPersisted: number;
  report?: AcquisitionReport;
  error?: string;
}

/**
 * Common handler contract for executing background acquisition tasks.
 */
export interface AcquisitionJobHandler {
  execute(job: AcquisitionJobPayload): Promise<AcquisitionJobResult>;
}
