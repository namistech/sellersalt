/**
 * SellerSalt Merchant Journey Telemetry Engine
 * 
 * Records privacy-safe, organization-scoped journey events across the 5 canonical stages:
 * DISCOVER → RESEARCH → VALIDATE → PLAN → LAUNCH (+ ONBOARDING & BILLING).
 * 
 * Invariants: Zero PII, zero tokens, zero card numbers, multi-tenant scoped.
 */

import { logger } from "@/lib/observability/structured-logger";

export type JourneyStage =
  | "ONBOARDING"
  | "DISCOVER"
  | "RESEARCH"
  | "VALIDATE"
  | "PLAN"
  | "LAUNCH"
  | "BILLING";

export type JourneyEventType =
  | "onboarding_started"
  | "onboarding_completed"
  | "discovery_started"
  | "discovery_completed"
  | "opportunity_opened"
  | "opportunity_saved"
  | "opportunity_researched"
  | "product_validation_started"
  | "product_validation_completed"
  | "workspace_created"
  | "workspace_refreshed"
  | "sourcing_plan_viewed"
  | "economics_viewed"
  | "planner_item_created"
  | "listing_studio_opened"
  | "listing_draft_created"
  | "listing_draft_approved"
  | "seo_audit_started"
  | "seo_audit_completed"
  | "marketplace_connection_started"
  | "marketplace_connection_completed"
  | "upgrade_started"
  | "checkout_started"
  | "subscription_activated";

export interface JourneyEventPayload {
  organizationId: string;
  userId?: string;
  stage: JourneyStage;
  eventType: JourneyEventType;
  entityId?: string;
  entityType?: "PROSPECT" | "SEARCH_CONFIG" | "VALIDATION" | "WORKSPACE" | "DRAFT" | "SEO_AUDIT" | "PLAN";
  correlationId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  timestamp?: Date;
}

export interface JourneyEventRecord extends JourneyEventPayload {
  id: string;
  recordedAt: Date;
}

// In-memory telemetry event buffer
const JOURNEY_EVENT_BUFFER: JourneyEventRecord[] = [];
const MAX_TELEMETRY_BUFFER_SIZE = 1000;

// Prohibited PII / Secret Key Patterns
const FORBIDDEN_METADATA_KEYS = [
  "password",
  "secret",
  "token",
  "auth",
  "key",
  "apikey",
  "card",
  "cvv",
  "email",
  "phone",
  "address",
];

export class MerchantJourneyTelemetry {
  /**
   * Sanitizes metadata to strictly reject any prohibited PII or credentials.
   */
  private static sanitizeMetadata(
    meta?: Record<string, string | number | boolean | null>
  ): Record<string, string | number | boolean | null> {
    if (!meta || typeof meta !== "object") return {};
    const sanitized: Record<string, string | number | boolean | null> = {};

    for (const [k, v] of Object.entries(meta)) {
      const lowerKey = k.toLowerCase();
      const isForbidden = FORBIDDEN_METADATA_KEYS.some((f) => lowerKey.includes(f));
      if (!isForbidden) {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  /**
   * Records a canonical merchant journey event.
   */
  public static recordEvent(event: JourneyEventPayload): JourneyEventRecord {
    if (!event.organizationId || typeof event.organizationId !== "string") {
      throw new Error("[MerchantJourneyTelemetry] organizationId is strictly required.");
    }

    const cleanMeta = this.sanitizeMetadata(event.metadata);
    const id = `jrn_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const record: JourneyEventRecord = {
      ...event,
      id,
      metadata: cleanMeta,
      recordedAt: event.timestamp || new Date(),
    };

    JOURNEY_EVENT_BUFFER.unshift(record);
    if (JOURNEY_EVENT_BUFFER.length > MAX_TELEMETRY_BUFFER_SIZE) {
      JOURNEY_EVENT_BUFFER.pop();
    }

    logger.info("Merchant journey event recorded", {
      correlationId: event.correlationId,
      metadata: {
        id,
        org: event.organizationId,
        stage: event.stage,
        type: event.eventType,
        entityType: event.entityType,
      },
    });

    return record;
  }

  /**
   * Retrieves journey events scoped to a specific organization or all if unspecified.
   */
  public static getEvents(organizationId?: string, limit = 100): JourneyEventRecord[] {
    const list = organizationId
      ? JOURNEY_EVENT_BUFFER.filter((e) => e.organizationId === organizationId)
      : JOURNEY_EVENT_BUFFER;

    return list.slice(0, limit);
  }

  /**
   * Clears the event buffer (useful for test isolates).
   */
  public static clearBuffer(): void {
    JOURNEY_EVENT_BUFFER.length = 0;
  }
}
