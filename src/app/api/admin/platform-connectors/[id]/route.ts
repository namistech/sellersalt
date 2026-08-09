import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const result = await prisma.connector.deleteMany({ where: { id, organizationId: null } });
  if (result.count === 0) return NextResponse.json({ error: "Connector not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
