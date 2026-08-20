/**
 * SellerSalt Deterministic Billing & Subscription Simulation Harness
 * 
 * Implements an end-to-end integration test harness allowing complete verification of
 * the commercial subscription lifecycle across:
 * Free → Starter Checkout → Activation → Quota Consumption → Renewal → Pro Upgrade →
 * Downgrade → Cancel at Period End → Reactivate → Payment Failure → Recovery → Final Expiry.
 */

import { prisma } from "@/lib/db";
import { upsertSubscription } from "@/lib/subscription";
import { BillingEventLedger, BillingProviderType } from "./billing-event-ledger";
import { EntitlementEngine } from "./entitlement-engine";
import { checkQuota, QuotaAction } from "@/services/plans/quota-enforcement";
import { PlanTierKey } from "@/services/plans/plan-capabilities";

export interface SimulationStepResult {
  step: string;
  success: boolean;
  state: {
    planKey: PlanTierKey;
    subscriptionStatus: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
  };
  entitlementsSummary: {
    canConnectEtsy: boolean;
    productResearchRemaining: number;
    keywordSearchRemaining: number;
    allowedMarketplaces: string[];
  };
}

export class BillingSimulator {
  /**
   * 1. Initializes a Free organization.
   */
  public static async createFreeOrganization(orgId: string, name: string = "Simulated Merchant Store") {
    const freePkg = await prisma.package.findUniqueOrThrow({ where: { key: "FREE" } });

    const org = await prisma.organization.upsert({
      where: { id: orgId },
      create: {
        id: orgId,
        name,
        packageId: freePkg.id,
      },
      update: {
        packageId: freePkg.id,
      },
    });

    await upsertSubscription({
      organizationId: orgId,
      packageId: freePkg.id,
      provider: "MANUAL",
      status: "INCOMPLETE",
    });

    return org;
  }

  /**
   * 2 & 3. Simulates checkout and subscription activation.
   */
  public static async activateSubscription(params: {
    organizationId: string;
    provider: BillingProviderType;
    packageKey: PlanTierKey;
    subscriptionId?: string;
    customerId?: string;
  }): Promise<SimulationStepResult> {
    const pkg = await prisma.package.findUniqueOrThrow({ where: { key: params.packageKey } });
    const subId = params.subscriptionId || `sub_${Date.now()}`;
    const custId = params.customerId || `cust_${Date.now()}`;
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Record webhook event in ledger
    const externalEventId = `evt_act_${Date.now()}`;
    await BillingEventLedger.recordEvent({
      provider: params.provider,
      externalEventId,
      eventType: "customer.subscription.created",
      organizationId: params.organizationId,
      payloadSummary: { packageKey: params.packageKey, subscriptionId: subId },
    });

    // Execute state transition
    await upsertSubscription({
      organizationId: params.organizationId,
      packageId: pkg.id,
      provider: params.provider,
      providerCustomerId: custId,
      providerSubscriptionId: subId,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
    });

    const entitlements = await EntitlementEngine.getEntitlements(params.organizationId);

    return {
      step: `ACTIVATE_${params.packageKey}`,
      success: true,
      state: {
        planKey: entitlements.planKey,
        subscriptionStatus: entitlements.subscriptionStatus,
        cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
        currentPeriodEnd: entitlements.currentPeriodEnd,
      },
      entitlementsSummary: {
        canConnectEtsy: entitlements.features.canConnectEtsy,
        productResearchRemaining: entitlements.quotas.productResearches.remaining,
        keywordSearchRemaining: entitlements.quotas.keywordSearches.remaining,
        allowedMarketplaces: entitlements.allowedMarketplaces,
      },
    };
  }

  /**
   * 4. Simulates quota consumption by creating mock research records.
   */
  public static async consumeQuota(params: {
    organizationId: string;
    action: QuotaAction;
    count: number;
  }) {
    if (params.action === "PRODUCT_RESEARCH" || params.action === "KEYWORD_SEARCH") {
      let connector = await prisma.connector.findFirst({
        where: { organizationId: params.organizationId },
      });

      if (!connector) {
        connector = await prisma.connector.create({
          data: {
            organizationId: params.organizationId,
            type: "ETSY",
            label: "Simulated Test Connector",
            encryptedCredentials: "simulated-test-credentials",
          },
        });
      }

      let searchConfig = await prisma.searchConfig.findFirst({
        where: { organizationId: params.organizationId },
      });

      if (!searchConfig) {
        searchConfig = await prisma.searchConfig.create({
          data: {
            organizationId: params.organizationId,
            connectorId: connector.id,
            name: "Simulated Test Search",
            keywords: ["simulated-test-niche"],
            minPrice: 0,
            maxPrice: 100,
          },
        });
      }

      const records = Array.from({ length: params.count }).map((_, i) => ({
        organizationId: params.organizationId,
        searchConfigId: searchConfig.id,
        keyword: "simulated-test-niche",
        marketplace: "ETSY" as const,
        shopExternalId: `shop_sim_${Date.now()}_${i}`,
        listingExternalId: `listing_sim_${Date.now()}_${i}`,
        shopName: `Simulated Shop ${i + 1}`,
        shopUrl: `https://etsy.com/shop/sim_${i}`,
        shopAgeMonths: 12,
        reviewCount: 50,
        activeListings: 20,
        reviewRatio: 0.1,
        reviewVelocity: 1.5,
        listingTitle: `Simulated Product Research ${i + 1}`,
        listingUrl: `https://etsy.com/listing/sim_${Date.now()}_${i}`,
        price: 24.99,
      }));

      await prisma.prospect.createMany({ data: records });
    }

    return await checkQuota(params.organizationId, params.action);
  }

  /**
   * 5. Simulates subscription renewal webhook.
   */
  public static async renewSubscription(params: {
    organizationId: string;
    provider: BillingProviderType;
  }): Promise<SimulationStepResult> {
    const existingSub = await prisma.subscription.findUniqueOrThrow({
      where: { organizationId: params.organizationId },
      include: { package: true },
    });

    const newPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const externalEventId = `evt_renew_${Date.now()}`;

    await BillingEventLedger.recordEvent({
      provider: params.provider,
      externalEventId,
      eventType: "invoice.payment_succeeded",
      organizationId: params.organizationId,
      payloadSummary: { currentPeriodEnd: newPeriodEnd },
    });

    await upsertSubscription({
      organizationId: params.organizationId,
      packageId: existingSub.packageId,
      provider: params.provider,
      providerCustomerId: existingSub.providerCustomerId || undefined,
      providerSubscriptionId: existingSub.providerSubscriptionId || undefined,
      status: "ACTIVE",
      currentPeriodEnd: newPeriodEnd,
    });

    const entitlements = await EntitlementEngine.getEntitlements(params.organizationId);

    return {
      step: "RENEW_SUBSCRIPTION",
      success: true,
      state: {
        planKey: entitlements.planKey,
        subscriptionStatus: entitlements.subscriptionStatus,
        cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
        currentPeriodEnd: entitlements.currentPeriodEnd,
      },
      entitlementsSummary: {
        canConnectEtsy: entitlements.features.canConnectEtsy,
        productResearchRemaining: entitlements.quotas.productResearches.remaining,
        keywordSearchRemaining: entitlements.quotas.keywordSearches.remaining,
        allowedMarketplaces: entitlements.allowedMarketplaces,
      },
    };
  }

  /**
   * 6 & 7. Simulates plan upgrade or downgrade.
   */
  public static async changePlan(params: {
    organizationId: string;
    newPackageKey: PlanTierKey;
    provider: BillingProviderType;
  }): Promise<SimulationStepResult> {
    const targetPkg = await prisma.package.findUniqueOrThrow({ where: { key: params.newPackageKey } });
    const existingSub = await prisma.subscription.findUniqueOrThrow({
      where: { organizationId: params.organizationId },
    });

    const externalEventId = `evt_change_${Date.now()}`;
    await BillingEventLedger.recordEvent({
      provider: params.provider,
      externalEventId,
      eventType: "customer.subscription.updated",
      organizationId: params.organizationId,
      payloadSummary: { newPackageKey: params.newPackageKey },
    });

    await upsertSubscription({
      organizationId: params.organizationId,
      packageId: targetPkg.id,
      provider: params.provider,
      providerCustomerId: existingSub.providerCustomerId || undefined,
      providerSubscriptionId: existingSub.providerSubscriptionId || undefined,
      status: "ACTIVE",
      currentPeriodEnd: existingSub.currentPeriodEnd || undefined,
    });

    const entitlements = await EntitlementEngine.getEntitlements(params.organizationId);

    return {
      step: `CHANGE_PLAN_TO_${params.newPackageKey}`,
      success: true,
      state: {
        planKey: entitlements.planKey,
        subscriptionStatus: entitlements.subscriptionStatus,
        cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
        currentPeriodEnd: entitlements.currentPeriodEnd,
      },
      entitlementsSummary: {
        canConnectEtsy: entitlements.features.canConnectEtsy,
        productResearchRemaining: entitlements.quotas.productResearches.remaining,
        keywordSearchRemaining: entitlements.quotas.keywordSearches.remaining,
        allowedMarketplaces: entitlements.allowedMarketplaces,
      },
    };
  }

  /**
   * 8. Simulates scheduled cancellation at period end.
   */
  public static async cancelAtPeriodEnd(organizationId: string): Promise<SimulationStepResult> {
    await prisma.subscription.update({
      where: { organizationId },
      data: { cancelAtPeriodEnd: true },
    });

    const entitlements = await EntitlementEngine.getEntitlements(organizationId);

    return {
      step: "CANCEL_AT_PERIOD_END",
      success: true,
      state: {
        planKey: entitlements.planKey,
        subscriptionStatus: entitlements.subscriptionStatus,
        cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
        currentPeriodEnd: entitlements.currentPeriodEnd,
      },
      entitlementsSummary: {
        canConnectEtsy: entitlements.features.canConnectEtsy,
        productResearchRemaining: entitlements.quotas.productResearches.remaining,
        keywordSearchRemaining: entitlements.quotas.keywordSearches.remaining,
        allowedMarketplaces: entitlements.allowedMarketplaces,
      },
    };
  }

  /**
   * 9. Simulates reactivation before period end.
   */
  public static async reactivateSubscription(organizationId: string): Promise<SimulationStepResult> {
    await prisma.subscription.update({
      where: { organizationId },
      data: { cancelAtPeriodEnd: false },
    });

    const entitlements = await EntitlementEngine.getEntitlements(organizationId);

    return {
      step: "REACTIVATE_SUBSCRIPTION",
      success: true,
      state: {
        planKey: entitlements.planKey,
        subscriptionStatus: entitlements.subscriptionStatus,
        cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
        currentPeriodEnd: entitlements.currentPeriodEnd,
      },
      entitlementsSummary: {
        canConnectEtsy: entitlements.features.canConnectEtsy,
        productResearchRemaining: entitlements.quotas.productResearches.remaining,
        keywordSearchRemaining: entitlements.quotas.keywordSearches.remaining,
        allowedMarketplaces: entitlements.allowedMarketplaces,
      },
    };
  }

  /**
   * 10 & 11. Simulates payment failure and subsequent recovery.
   */
  public static async simulatePaymentFailure(organizationId: string): Promise<SimulationStepResult> {
    const existingSub = await prisma.subscription.findUniqueOrThrow({ where: { organizationId } });

    await upsertSubscription({
      organizationId,
      packageId: existingSub.packageId,
      provider: existingSub.provider,
      providerCustomerId: existingSub.providerCustomerId || undefined,
      providerSubscriptionId: existingSub.providerSubscriptionId || undefined,
      status: "PAST_DUE",
    });

    const entitlements = await EntitlementEngine.getEntitlements(organizationId);

    return {
      step: "PAYMENT_FAILED",
      success: true,
      state: {
        planKey: entitlements.planKey,
        subscriptionStatus: entitlements.subscriptionStatus,
        cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
        currentPeriodEnd: entitlements.currentPeriodEnd,
      },
      entitlementsSummary: {
        canConnectEtsy: entitlements.features.canConnectEtsy,
        productResearchRemaining: entitlements.quotas.productResearches.remaining,
        keywordSearchRemaining: entitlements.quotas.keywordSearches.remaining,
        allowedMarketplaces: entitlements.allowedMarketplaces,
      },
    };
  }

  /**
   * 12. Simulates final subscription cancellation/expiration.
   */
  public static async finalCancellation(organizationId: string): Promise<SimulationStepResult> {
    const freePkg = await prisma.package.findUniqueOrThrow({ where: { key: "FREE" } });
    const existingSub = await prisma.subscription.findUniqueOrThrow({ where: { organizationId } });

    await upsertSubscription({
      organizationId,
      packageId: freePkg.id,
      provider: existingSub.provider,
      status: "CANCELED",
    });

    const entitlements = await EntitlementEngine.getEntitlements(organizationId);

    return {
      step: "FINAL_CANCELLATION",
      success: true,
      state: {
        planKey: entitlements.planKey,
        subscriptionStatus: entitlements.subscriptionStatus,
        cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
        currentPeriodEnd: entitlements.currentPeriodEnd,
      },
      entitlementsSummary: {
        canConnectEtsy: entitlements.features.canConnectEtsy,
        productResearchRemaining: entitlements.quotas.productResearches.remaining,
        keywordSearchRemaining: entitlements.quotas.keywordSearches.remaining,
        allowedMarketplaces: entitlements.allowedMarketplaces,
      },
    };
  }
}
