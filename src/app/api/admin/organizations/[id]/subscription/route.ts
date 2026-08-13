import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";
import { upsertSubscription } from "@/lib/subscription";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

/** Admin-only: manually grant a subscription to an org, bypassing real
 * billing entirely — the general mechanism for grandfathering existing
 * orgs, comping accounts, or fixing access without a real payment. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const { packageId, status } = (await req.json()) as { packageId: string; status: "ACTIVE" | "TRIALING" };
  if (!packageId) return NextResponse.json({ error: "packageId is required." }, { status: 400 });
  if (status !== "ACTIVE" && status !== "TRIALING") {
    return NextResponse.json({ error: "status must be ACTIVE or TRIALING." }, { status: 400 });
  }

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) return NextResponse.json({ error: "Package not found." }, { status: 404 });

  const sub = await upsertSubscription({ organizationId: id, packageId, provider: "MANUAL", status });
  return NextResponse.json({ subscription: sub });
}

/** Revokes a manually- or provider-granted subscription and falls the org
 * back to the STARTED package, same fallback used on real cancellation. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const existing = await prisma.subscription.findUnique({ where: { organizationId: id } });
  if (!existing) return NextResponse.json({ error: "No subscription to revoke." }, { status: 400 });

  await prisma.subscription.delete({ where: { organizationId: id } });

  const started = await prisma.package.findUnique({ where: { key: "STARTED" } });
  if (started) await prisma.organization.update({ where: { id }, data: { packageId: started.id } });

  return NextResponse.json({ ok: true });
}
