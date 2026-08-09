import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, org] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, createdAt: true } }),
    organizationId ? prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }) : null,
  ]);

  return NextResponse.json({
    name: user?.name ?? "",
    email: user?.email ?? "",
    memberSince: user?.createdAt,
    organizationName: org?.name ?? "",
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, organizationName } = await req.json();

  const updates: Promise<any>[] = [];
  if (typeof name === "string" && name.trim()) {
    updates.push(prisma.user.update({ where: { id: userId }, data: { name: name.trim() } }));
  }
  if (organizationId && typeof organizationName === "string" && organizationName.trim()) {
    updates.push(
      prisma.organization.update({ where: { id: organizationId }, data: { name: organizationName.trim() } })
    );
  }
  await Promise.all(updates);

  return NextResponse.json({ ok: true });
}
