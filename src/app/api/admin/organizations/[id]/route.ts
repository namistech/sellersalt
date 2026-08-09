import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const { packageId } = await req.json();
  if (!packageId) return NextResponse.json({ error: "packageId is required." }, { status: 400 });

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) return NextResponse.json({ error: "Package not found." }, { status: 404 });

  const updated = await prisma.organization.update({ where: { id }, data: { packageId } });
  return NextResponse.json({ organization: updated });
}
