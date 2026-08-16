import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) return null;
  return session!.user!.email as string;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const [target, avatarSetting] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                package: { select: { id: true, name: true, key: true, priceUsd: true } },
                subscription: { select: { status: true, provider: true, currentPeriodEnd: true } },
                sellerChannels: {
                  where: { platform: "ETSY_SELLER" },
                  select: { id: true, label: true, storeUrl: true, status: true, lastSyncedAt: true },
                },
                _count: { select: { connectors: true, searchConfigs: true, prospects: true, shopWatches: true } },
              },
            },
          },
        },
        webAuthnCredentials: {
          select: { id: true, name: true, createdAt: true, lastUsedAt: true },
        },
      },
    }),
    prisma.appSetting.findUnique({
      where: { key: `user_avatar_${id}` },
      select: { value: true },
    }),
  ]);

  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { targetId: target.id },
        { targetEmail: target.email },
        { actorEmail: target.email },
      ],
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    user: {
      id: target.id,
      name: target.name,
      email: target.email,
      emailVerified: Boolean(target.emailVerified),
      emailVerifiedAt: target.emailVerified,
      suspended: Boolean(target.suspendedAt),
      suspendedAt: target.suspendedAt,
      authMethods: target.authMethods,
      lastLoginAt: target.lastLoginAt,
      createdAt: target.createdAt,
      verificationEmailCount: target.verificationEmailCount,
      lastVerificationEmailAt: target.lastVerificationEmailAt,
      avatarUrl: avatarSetting?.value ?? null,
      passkeys: target.webAuthnCredentials,
      memberships: target.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          plan: m.organization.plan,
          package: m.organization.package,
          subscription: m.organization.subscription,
          sellerChannels: m.organization.sellerChannels,
          usage: {
            connectors: m.organization._count.connectors,
            searchConfigs: m.organization._count.searchConfigs,
            prospects: m.organization._count.prospects,
            trackedShops: m.organization._count.shopWatches,
          },
        },
      })),
      recentAuditLogs: auditLogs,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id }, include: { memberships: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    suspended?: boolean;
    role?: "OWNER" | "ADMIN" | "MEMBER";
    packageId?: string;
  };

  if (typeof body.suspended === "boolean") {
    if (body.suspended && target.email.toLowerCase() === adminEmail.toLowerCase()) {
      return NextResponse.json({ error: "You can't suspend your own account." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id },
      data: { suspendedAt: body.suspended ? new Date() : null },
    });
  }

  if (body.role) {
    const membership = target.memberships[0];
    if (!membership) return NextResponse.json({ error: "User has no workspace membership to update." }, { status: 400 });
    await prisma.membership.update({ where: { id: membership.id }, data: { role: body.role } });
  }

  if (body.packageId) {
    const membership = target.memberships[0];
    if (!membership) return NextResponse.json({ error: "User has no workspace to assign a package to." }, { status: 400 });
    const pkg = await prisma.package.findUnique({ where: { id: body.packageId } });
    if (!pkg) return NextResponse.json({ error: "Package not found." }, { status: 404 });
    await prisma.organization.update({ where: { id: membership.organizationId }, data: { packageId: pkg.id } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.email.toLowerCase() === adminEmail.toLowerCase()) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  // Memberships/passwordResetTokens/webAuthnCredentials cascade via the
  // schema's onDelete: Cascade — deleting the User row is sufficient.
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
