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
