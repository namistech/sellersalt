import { getServerSession } from "next-auth";
import Link from "next/link";
import { CreditCard, Shield, User, Users, Store, Bell, ArrowRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Heading, Text, Badge, Button } from "@/components/ui";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  const [org, sellerChannel] = await Promise.all([
    organizationId
      ? prisma.organization.findUnique({
          where: { id: organizationId },
          include: {
            package: { select: { name: true, priceUsd: true } },
            subscription: { select: { status: true } },
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

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div>
        <Heading as="h1" size="h2">
          Workspace Settings
        </Heading>
        <Text size="body-md" color="secondary" className="mt-1">
          Manage your account profile, store channels, team access, and subscription plan.
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
                  Profile & Security
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

        {/* Billing Card */}
        <Card padding="md" className="border-line shadow-xs flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E8F5D]/10 text-[#0E8F5D]">
                  <CreditCard className="h-4 w-4" />
                </span>
                <Heading as="h2" size="h4">
                  Billing & Plan
                </Heading>
              </div>
              <Badge variant="success" className="font-semibold text-[#0E8F5D] bg-[#E7FAF1] border border-[#0E8F5D]/20">
                {org?.package?.name ?? "Starter"} Plan
              </Badge>
            </div>
            <Text size="body-sm" color="secondary" className="mb-4">
              Manage your subscription, view search quota limits, and update payment methods.
            </Text>
          </div>

          <div className="border-t border-line-subtle pt-3 flex items-center justify-between">
            <Text size="meta" color="tertiary">
              ${org?.package?.priceUsd ?? 19}/mo
            </Text>
            <Link href="/settings/billing">
              <Button variant="secondary" size="compact" className="text-xs">
                View Billing →
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
