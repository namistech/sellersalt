import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCategoryTree, searchCategories } from "@/services/category-hunting";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("search") || searchParams.get("q") || "";

  try {
    if (query.trim()) {
      const results = await searchCategories(organizationId, query.trim(), 30);
      return NextResponse.json({ results, total: results.length });
    }

    const { roots, totalNodes } = await fetchCategoryTree(organizationId);
    return NextResponse.json({ roots, totalNodes });
  } catch (err: any) {
    console.error("Failed to load category taxonomy:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load category taxonomy" },
      { status: 500 }
    );
  }
}
