import { getServerSession } from "next-auth";
import Link from "next/link";
import { CreditCard, Shield, User, Users, ArrowRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Heading, Text, Badge, Button } from "@/components/ui";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  const org = organizationId
    ? await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          package: { select: { name: true, priceUsd: true } },
          subscription: { select: { status: true } },
          _count: { select: { memberships: true } },
        },
      })
    : null;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Heading as="h1" size="h2">
          Workspace Settings
        </Heading>
        <Text size="body-md" color="secondary" className="mt-1">
          Manage your account profile, team access, and subscription plan.
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Profile Card */}
        <Card padding="md" className="border-line shadow-xs flex flex-col justify-between">
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
              Your name, login email, workspace name, and account password.
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

        {/* Billing Card */}
        <Card padding="md" className="border-line shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary-subtle text-brand-primary">
                  <CreditCard className="h-4 w-4" />
                </span>
                <Heading as="h2" size="h4">
                  Billing & Plan
                </Heading>
              </div>
              <Badge variant="success" className="font-semibold text-brand-primary bg-brand-primary-subtle border border-brand-primary/20">
                {org?.package?.name ?? "Started"} Plan
              </Badge>
            </div>
            <Text size="body-sm" color="secondary" className="mb-4">
              Manage your subscription, view search quota usage, and update payment methods.
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
        <Card padding="md" className="border-line shadow-xs flex flex-col justify-between">
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
              Invite colleagues and collaborators to share research streams and tracked shops.
            </Text>
          </div>

          <div className="border-t border-line-subtle pt-3 flex items-center justify-between">
            <Text size="meta" color="tertiary">
              Workspace Access
            </Text>
            <Link href="/settings/team">
              <Button variant="secondary" size="compact" className="text-xs">
                Manage Team →
              </Button>
            </Link>
          </div>
        </Card>

        {/* Workspace Identity Summary */}
        <Card padding="md" className="border-line shadow-xs flex flex-col justify-between bg-surface-muted">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-ink border border-line">
                <Shield className="h-4 w-4" />
              </span>
              <Heading as="h2" size="h4">
                Workspace Identity
              </Heading>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-line-subtle">
                <span className="text-ink-tertiary">Organization</span>
                <span className="font-medium text-ink">{org?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-line-subtle">
                <span className="text-ink-tertiary">Marketplace Scope</span>
                <span className="font-medium text-brand-primary">Etsy Platform Active</span>
              </div>
            </div>
          </div>

          <div className="pt-3">
            <Text size="meta" color="tertiary">
              Multi-tenant organization boundary secured.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
