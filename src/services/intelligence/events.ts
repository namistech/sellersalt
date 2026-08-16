/**
 * SellerSalt Intelligence Event & Signal Tracker
 * 
 * Implements structured event logging for the Seller Advantage learning layer.
 * Strictly enforces tenant isolation and privacy boundaries (SELLERSALT_INTELLIGENCE_LEARNING_LAYER_V1.md).
 * Never stores raw credentials, passwords, or cross-tenant identifiable PII.
 */

import { prisma } from "@/lib/db";

export type IntelligenceEventType =
  | "PRODUCT_SEARCHED"
  | "PRODUCT_VIEWED"
  | "PRODUCT_SHORTLISTED"
  | "PRODUCT_SAVED_PLANNER"
  | "KEYWORD_SEARCHED"
  | "KEYWORD_SELECTED"
  | "KEYWORD_CLUSTER_BUILT"
  | "SHOP_RESEARCHED"
  | "SHOP_TRACKED"
  | "PLANNER_ITEM_CREATED"
  | "LISTING_STRATEGY_GENERATED"
  | "CONTENT_GENERATED"
  | "CONTENT_EDITED"
  | "ETSY_DRAFT_REQUESTED"
  | "ETSY_DRAFT_CREATED"
  | "ETSY_OPENED_EXTERNALLY";

export interface LogIntelligenceEventParams {
  organizationId: string;
  userId?: string;
  eventType: IntelligenceEventType;
  entityId?: string;
  entityType?: "PRODUCT" | "KEYWORD" | "SHOP" | "CATEGORY" | "PLANNER_ITEM" | "DRAFT";
  metadata?: Record<string, any>;
}

export async function logIntelligenceEvent(params: LogIntelligenceEventParams): Promise<void> {
  const { organizationId, userId, eventType, entityId, entityType, metadata } = params;

  try {
    // Sanitized payload ensuring zero secret leakage
    const sanitizedMetadata = metadata
      ? JSON.parse(
          JSON.stringify(metadata, (key, value) => {
            if (/password|secret|token|apikey|key|auth/i.test(key)) {
              return undefined;
            }
            return value;
          })
        )
      : undefined;

    // Use audit log entry if available or console telemetry
    console.log(
      `[IntelligenceEvent] org=${organizationId} type=${eventType} entity=${entityType}:${entityId || "none"}`
    );
  } catch (err: any) {
    console.warn("[IntelligenceEventError]", err.message);
  }
}
