import { getServerSession } from "next-auth";
import Link from "next/link";
import { CreditCard, Shield, User, Users, Store, Bell, ArrowRight, Puzzle, Sparkles, Activity } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Heading, Text, Badge, Button } from "@/components/ui";
import { resolveSubscriptionState, resolveEffectiveTier } from "@/services/billing/subscription-lifecycle";
import { PLAN_DEFINITIONS, PlanTierKey } from "@/services/plans/plan-capabilities";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  const [org, sellerChannel] = await Promise.all([
    organizationId
      ? prisma.organization.findUnique({
          where: { id: organizationId },
          include: {
            package: { select: { key: true, name: true, priceUsd: true } },
            subscription: { select: { status: true, currentPeriodEnd: true, provider: true } },
            _count: { select: { memberships: true } },
          },
        })
      : null,
    organizationId
      ? prisma.sellerChannel.findFirst({
          where: { organizationId, platform: "ETSY_SELLER" },
          select: { label: true, status: true },
        })
      : null,
  ]);

  const rawSubStatus = org?.subscription?.status;
  const subState = resolveSubscriptionState(rawSubStatus, {
    currentPeriodEnd: org?.subscription?.currentPeriodEnd,
  });

  const planKey = (org?.package?.key as PlanTierKey) || "FREE";
  const planDef = PLAN_DEFINITIONS[planKey] || PLAN_DEFINITIONS.FREE;

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div>
        <Heading as="h1" size="h2">
          Account &amp; Workspace Settings
        </Heading>
        <Text size="body-md" color="secondary" className="mt-1">
          Manage your account profile, store channels, browser extension pairing, team access, and subscription plan.
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Profile Card */}
        <Card padding="md" className="border-line shadow-xs flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-ink">
                <User className="h-4 w-4" />
              </span>
              <div>
                <Heading as="h2" size="h4">
                  Profile &amp; Security
                </Heading>
              </div>
            </div>
            <Text size="body-sm" color="secondary" className="mb-4">
              Your avatar photo, full name, login email, workspace name, and password security.
            </Text>
          </div>

          <div className="border-t border-line-subtle pt-3 flex items-center justify-between">
            <Text size="meta" color="tertiary" className="truncate max-w-[180px]">
              {session?.user?.email}
            </Text>
            <Link href="/settings/profile">
              <Button variant="secondary" size="compact" className="text-xs">
                Manage Profile →
              </Button>
            </Link>
          </div>
        </Card>

        {/* Channels / Etsy Shop Card */}
        <Card padding="md" className="border-line shadow-xs flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E8F5D]/10 text-[#0E8F5D]">
                  <Store className="h-4 w-4" />
                </span>
                <Heading as="h2" size="h4">
                  Etsy Store Channels
                </Heading>
              </div>
              {sellerChannel ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="neutral">Not Linked</Badge>
              )}
            </div>
            <Text size="body-sm" color="secondary" className="mb-4">
              Connect your authenticated Etsy seller shop to unlock personalized store sales and conversion intelligence.
            </Text>
          </div>

          <div className="border-t border-line-subtle pt-3 flex items-center justify-between">
            <Text size="meta" color="tertiary">
              {sellerChannel ? sellerChannel.label : "Etsy OpenAPI v3"}
            </Text>
            <Link href="/settings/channels">
              <Button variant="secondary" size="compact" className="text-xs">
                {sellerChannel ? "Manage Shop →" : "Connect Shop →"}
              </Button>
            </Link>
          </div>
        </Card>

        {/* Billing & Subscription Card */}
        <Card padding="md" className="border-line shadow-xs flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E8F5D]/10 text-[#0E8F5D]">
                  <CreditCard className="h-4 w-4" />
                </span>
                <Heading as="h2" size="h4">
                  Plan &amp; Subscription
                </Heading>
              </div>
              <Badge
                variant={subState === "ACTIVE" || subState === "TRIALING" ? "success" : "neutral"}
                className="font-semibold text-xs"
              >
                {planDef.name} ({subState})
              </Badge>
            </div>
            <Text size="body-sm" color="secondary" className="mb-4">
              Manage your subscription, view search quota limits, inspect upgrade benefits, and update payment methods.
            </Text>
          </div>

          <div className="border-t border-line-subtle pt-3 flex items-center justify-between">
            <Text size="meta" color="tertiary">
              ${planDef.priceMonthlyUsd}/mo
            </Text>
            <Link href="/settings/billing">
              <Button variant="secondary" size="compact" className="text-xs">
                View Billing &amp; Usage →
              </Button>
            </Link>
          </div>
        </Card>

        {/* Extension Pairing Card */}
        <Card padding="md" className="border-line shadow-xs flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-ink">
                  <Puzzle className="h-4 w-4" />
                </span>
                <Heading as="h2" size="h4">
                  Browser Extension
                </Heading>
              </div>
              <Badge variant="neutral" className="text-xs">
                Manifest V3
              </Badge>
            </div>
            <Text size="body-sm" color="secondary" className="mb-4">
              Pair the SellerSalt Manifest V3 Chrome Extension to audit listing SEO and tags live inside Etsy.
            </Text>
          </div>

          <div className="border-t border-line-subtle pt-3 flex items-center justify-between">
            <Text size="meta" color="tertiary">
              Manifest V3 Extension
            </Text>
            <Link href="/settings/extension">
              <Button variant="secondary" size="compact" className="text-xs">
                Pair Extension →
              </Button>
            </Link>
          </div>
        </Card>

        {/* Team Card */}
        <Card padding="md" className="border-line shadow-xs flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-ink">
                  <Users className="h-4 w-4" />
                </span>
                <Heading as="h2" size="h4">
                  Team Members
                </Heading>
              </div>
              <Badge variant="neutral" className="text-xs">
                {org?._count.memberships ?? 1} Member{org?._count.memberships === 1 ? "" : "s"}
              </Badge>
            </div>
            <Text size="body-sm" color="secondary" className="mb-4">
              Invite colleagues and collaborators to share research streams, saved prospects, and tracked shops.
            </Text>
          </div>

          <div className="border-t border-line-subtle pt-3 flex items-center justify-between">
            <Text size="meta" color="tertiary">
              Workspace Collaboration
            </Text>
            <Link href="/settings/team">
              <Button variant="secondary" size="compact" className="text-xs">
                Manage Team →
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
