import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const { isActive, value, maxRedemptions, expiresAt } = await req.json();
  const data: any = {};
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (value !== undefined) data.value = Number(value);
  if (maxRedemptions !== undefined) data.maxRedemptions = maxRedemptions === null ? null : Number(maxRedemptions);
  if (expiresAt !== undefined) data.expiresAt = expiresAt === null ? null : new Date(expiresAt);

  const updated = await prisma.coupon.update({ where: { id }, data });
  return NextResponse.json({ coupon: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
