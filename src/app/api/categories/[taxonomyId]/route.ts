import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCategoryIntelligence } from "@/services/category-hunting";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taxonomyId: string }> }
) {
  const { taxonomyId } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const numericId = Number(taxonomyId);
  if (isNaN(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid taxonomy category ID" }, { status: 400 });
  }

  try {
    const profile = await fetchCategoryIntelligence(organizationId, numericId);
    return NextResponse.json({ profile });
  } catch (err: any) {
    console.error("Failed to load category intelligence:", err);
    return NextResponse.json(
      { error: err.message || "Category not found or intelligence failed" },
      { status: 404 }
    );
  }
}
