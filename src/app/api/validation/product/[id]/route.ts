import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProductValidationEngine } from "@/services/intelligence/product-validation-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 1. Check DB first
    const saved = await prisma.productValidation.findFirst({
      where: {
        organizationId: session.user.organizationId,
        id,
      },
    });

    if (saved) {
      return NextResponse.json({ validation: saved });
    }

    // 2. Re-run live validation if not found in DB
    const report = await ProductValidationEngine.validateProduct({
      query: decodeURIComponent(id),
      organizationId: session.user.organizationId,
    });

    return NextResponse.json({ validation: report });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch validation" },
      { status: 500 }
    );
  }
}
