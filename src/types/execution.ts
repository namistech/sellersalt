/**
 * SellerSalt Etsy Execution & Write-Back Audit Types
 */

import type {
  EtsyExecutionOperation,
  EtsyExecutionStatus,
  EtsyExecutionLog as PrismaEtsyExecutionLog,
} from "@prisma/client";

export type { EtsyExecutionOperation, EtsyExecutionStatus };

export interface EtsyExecutionPayload {
  organizationId: string;
  userId?: string;
  sellerChannelId?: string;
  listingDraftId?: string;
  operationType: EtsyExecutionOperation;
  entityType: "LISTING" | "IMAGE" | "INVENTORY" | "RECEIPT";
  entityId?: string;
  etsyResourceId?: string;
  idempotencyKey: string;
  requestPayload: Record<string, unknown>;
}

export interface EtsyExecutionResult {
  success: boolean;
  operationType: EtsyExecutionOperation;
  etsyResourceId?: string;
  statusCode?: number;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string;
  executedAt: string;
}

export interface EtsyExecutionLog extends Omit<PrismaEtsyExecutionLog, "requestPayload" | "responsePayload"> {
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown> | null;
}
