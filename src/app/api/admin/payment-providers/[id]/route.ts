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

  const { isActive, mode } = await req.json();
  const data: any = {};
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (mode !== undefined) data.mode = mode;

  const updated = await prisma.paymentProvider.update({ where: { id }, data });

  return NextResponse.json({ provider: { id: updated.id, isActive: updated.isActive, mode: updated.mode } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  await prisma.paymentProvider.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
