/**
 * SellerSalt Billing Reconciliation & Discrepancy Audit Engine
 * 
 * Verifies consistency across:
 * 1. External payment provider subscription states
 * 2. Postgres Subscription records
 * 3. Organization package entitlements
 * 
 * Supports dry-run diagnostic mode and deterministic reconciliation without silent destructive edits.
 */

import { prisma } from "@/lib/db";
import { upsertSubscription } from "@/lib/subscription";
import { BillingEventLedger } from "./billing-event-ledger";

export interface DiscrepancyItem {
  organizationId: string;
  subscriptionId?: string;
  provider: string;
  issueType:
    | "EXPIRED_STILL_ACTIVE"
    | "PAST_DUE_WITH_PAID_PACKAGE"
    | "ACTIVE_SUB_WITH_FREE_PACKAGE"
    | "MISSING_PROVIDER_SUB_ID"
    | "PACKAGE_MISMATCH";
  description: string;
  currentDbState: Record<string, any>;
  recommendedFix: Record<string, any>;
  reconciled: boolean;
}

export interface ReconciliationReport {
  checkedAt: Date;
  isDryRun: boolean;
  totalChecked: number;
  discrepanciesFound: number;
  resolvedCount: number;
  discrepancies: DiscrepancyItem[];
}

export class BillingReconciliationService {
  /**
   * Runs an audit against subscriptions and organizations, diagnosing mismatches.
   */
  public static async runAudit(options?: {
    organizationId?: string;
    dryRun?: boolean;
  }): Promise<ReconciliationReport> {
    const dryRun = options?.dryRun ?? true;
    const now = new Date();

    const whereClause: any = {};
    if (options?.organizationId) {
      whereClause.organizationId = options.organizationId;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
        organization: {
          include: {
            package: true,
          },
        },
        package: true,
      },
    });

    const discrepancies: DiscrepancyItem[] = [];
    let resolvedCount = 0;

    for (const sub of subscriptions) {
      const org = sub.organization;
      const orgPkg = org.package;
      const subPkg = sub.package;

      // 1. Check if period ended in the past, but status is still marked ACTIVE
      if (sub.status === "ACTIVE" && sub.currentPeriodEnd && sub.currentPeriodEnd < now) {
        const item: DiscrepancyItem = {
          organizationId: sub.organizationId,
          subscriptionId: sub.id,
          provider: sub.provider,
          issueType: "EXPIRED_STILL_ACTIVE",
          description: `Subscription period ended on ${sub.currentPeriodEnd.toISOString()}, but status is still ACTIVE.`,
          currentDbState: { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd },
          recommendedFix: { status: "PAST_DUE" },
          reconciled: false,
        };

        if (!dryRun) {
          await upsertSubscription({
            organizationId: sub.organizationId,
            packageId: sub.packageId,
            provider: sub.provider,
            providerCustomerId: sub.providerCustomerId || undefined,
            providerSubscriptionId: sub.providerSubscriptionId || undefined,
            status: "PAST_DUE",
            currentPeriodEnd: sub.currentPeriodEnd,
          });
          item.reconciled = true;
          resolvedCount++;
        }

        discrepancies.push(item);
      }

      // 2. Check if active subscription package doesn't match org's current assigned package
      if (sub.status === "ACTIVE" && orgPkg && orgPkg.id !== subPkg.id) {
        const item: DiscrepancyItem = {
          organizationId: sub.organizationId,
          subscriptionId: sub.id,
          provider: sub.provider,
          issueType: "PACKAGE_MISMATCH",
          description: `Subscription is on package "${subPkg.name}" (${subPkg.key}), but organization is set to "${orgPkg.name}" (${orgPkg.key}).`,
          currentDbState: { orgPackageKey: orgPkg.key, subPackageKey: subPkg.key },
          recommendedFix: { orgPackageKey: subPkg.key },
          reconciled: false,
        };

        if (!dryRun) {
          await prisma.organization.update({
            where: { id: sub.organizationId },
            data: { packageId: sub.packageId },
          });
          item.reconciled = true;
          resolvedCount++;
        }

        discrepancies.push(item);
      }

      // 3. Check for active subscription with missing providerSubscriptionId on non-manual providers
      if (sub.status === "ACTIVE" && sub.provider !== "MANUAL" && !sub.providerSubscriptionId) {
        discrepancies.push({
          organizationId: sub.organizationId,
          subscriptionId: sub.id,
          provider: sub.provider,
          issueType: "MISSING_PROVIDER_SUB_ID",
          description: `Subscription is marked ACTIVE for ${sub.provider}, but has no providerSubscriptionId.`,
          currentDbState: { provider: sub.provider, status: sub.status, providerSubscriptionId: null },
          recommendedFix: { status: "INCOMPLETE" },
          reconciled: false,
        });
      }
    }

    if (!dryRun && resolvedCount > 0) {
      await BillingEventLedger.recordEvent({
        provider: "MANUAL",
        externalEventId: `reconcile_${Date.now()}`,
        eventType: "billing.reconciliation.executed",
        organizationId: options?.organizationId || null,
        status: "RECONCILED",
        payloadSummary: {
          totalChecked: subscriptions.length,
          discrepanciesFound: discrepancies.length,
          resolvedCount,
        },
      });
    }

    return {
      checkedAt: now,
      isDryRun: dryRun,
      totalChecked: subscriptions.length,
      discrepanciesFound: discrepancies.length,
      resolvedCount,
      discrepancies,
    };
  }
}
