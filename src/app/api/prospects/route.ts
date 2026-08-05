import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prospects = await prisma.prospect.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ prospects });
}
