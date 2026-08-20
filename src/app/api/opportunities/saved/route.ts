import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const marketplace = searchParams.get("marketplace");

  try {
    const saved = await prisma.savedOpportunity.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(type ? { type } : {}),
        ...(marketplace ? { marketplace } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      savedOpportunities: saved,
      totalCount: saved.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch saved opportunities" },
      { status: 500 }
    );
  }
}
