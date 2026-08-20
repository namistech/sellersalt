import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProductResearchCommandCenter } from "@/services/intelligence/product-research-command-center";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.researchRun.findFirst({
      where: {
        organizationId: session.user.organizationId,
        id,
      },
    });

    const query = existing?.query || decodeURIComponent(id);
    const refreshed = await ProductResearchCommandCenter.executeSession({
      query,
      organizationId: session.user.organizationId,
    });

    return NextResponse.json({ success: true, session: refreshed });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to refresh research session" },
      { status: 500 }
    );
  }
}
