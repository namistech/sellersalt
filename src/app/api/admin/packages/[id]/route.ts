import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";
import { logAuditEvent } from "@/lib/audit-log";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return {
    isAdmin: isAdminEmail(session?.user?.email),
    email: session?.user?.email,
    userId: (session?.user as any)?.id,
  };
}

const CANONICAL_SYSTEM_PLAN_KEYS = new Set(["FREE", "STARTED", "PRO", "AGENCY"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const existingPkg = await prisma.package.findUnique({ where: { id } });
  if (!existingPkg) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }

  const body = await req.json();
  const numericFields = [
    "priceUsd",
    "maxConnectors",
    "maxSearchConfigs",
    "maxScheduledSearches",
    "maxTrackedShops",
    "maxProspectsPerMonth",
    "maxSellerChannels",
    "maxTrackingDays",
    "trialDays",
    "trialPriceUsd",
  ];

  const data: Record<string, any> = {};
  for (const field of numericFields) {
    if (body[field] != null) {
      const val = typeof body[field] === "number" ? body[field] : Number(body[field]);
      if (isNaN(val) || val < 0) {
        return NextResponse.json({ error: `Field '${field}' cannot be negative.` }, { status: 400 });
      }
      data[field] = val;
    }
  }

  // Free Explorer plan price must remain 0
  if (existingPkg.key === "FREE") {
    data.priceUsd = 0;
    data.trialDays = null;
    data.trialPriceUsd = null;
  }

  if (body.name != null && String(body.name).trim()) {
    data.name = String(body.name).trim();
  }
  if (typeof body.isActive === "boolean") {
    // System plans cannot be deactivated
    if (CANONICAL_SYSTEM_PLAN_KEYS.has(existingPkg.key) && !body.isActive) {
      return NextResponse.json({ error: "System core plans (Free, Starter, Pro, Agency) cannot be deactivated." }, { status: 400 });
    }
    data.isActive = body.isActive;
  }

  const updated = await prisma.package.update({ where: { id }, data });

  logAuditEvent({
    event: "ADMIN_PACKAGE_UPDATED",
    actor: { id: admin.userId, email: admin.email },
    target: { id: existingPkg.id, email: existingPkg.key },
    metadata: { previous: existingPkg, updated: data },
  }).catch(() => {});

  return NextResponse.json({ package: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const existingPkg = await prisma.package.findUnique({ where: { id } });
  if (!existingPkg) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }

  if (CANONICAL_SYSTEM_PLAN_KEYS.has(existingPkg.key)) {
    return NextResponse.json(
      { error: "Canonical system plan tiers (Free, Starter, Pro, Agency) cannot be deleted." },
      { status: 400 }
    );
  }

  const inUse = await prisma.organization.count({ where: { packageId: id } });
  if (inUse > 0) {
    return NextResponse.json(
      { error: `${inUse} organization(s) are on this package — reassign them before deleting.` },
      { status: 409 }
    );
  }

  await prisma.package.delete({ where: { id } });

  logAuditEvent({
    event: "ADMIN_PACKAGE_DELETED",
    actor: { id: admin.userId, email: admin.email },
    target: { id: existingPkg.id, email: existingPkg.key },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
