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

  const body = await req.json();
  const allowedFields = [
    "name", "priceUsd", "maxConnectors", "maxSearchConfigs",
    "maxScheduledSearches", "maxTrackedShops", "maxProspectsPerMonth",
  ];
  const data: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] != null) data[field] = typeof body[field] === "number" ? body[field] : Number(body[field]) || body[field];
  }

  const updated = await prisma.package.update({ where: { id }, data });
  return NextResponse.json({ package: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const inUse = await prisma.organization.count({ where: { packageId: id } });
  if (inUse > 0) {
    return NextResponse.json(
      { error: `${inUse} organization(s) are on this package — reassign them before deleting.` },
      { status: 409 }
    );
  }

  await prisma.package.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
