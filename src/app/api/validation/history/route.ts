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
  const marketplace = searchParams.get("marketplace");
  const verdict = searchParams.get("verdict");

  try {
    const validations = await prisma.productValidation.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(marketplace && marketplace !== "all" ? { marketplace } : {}),
        ...(verdict ? { verdict } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      validations,
      totalCount: validations.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch validation history" },
      { status: 500 }
    );
  }
}
