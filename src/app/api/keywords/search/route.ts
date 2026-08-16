import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchStandaloneKeywordResearch } from "@/services/keyword-research";
import type { KeywordSearchRequest } from "@/types/keyword-research";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as KeywordSearchRequest;

    if (!body.query || typeof body.query !== "string" || !body.query.trim()) {
      return NextResponse.json({ error: "Query keyword is required." }, { status: 400 });
    }

    const response = await fetchStandaloneKeywordResearch(organizationId, {
      query: body.query.trim(),
      limit: body.limit || 50,
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
      categoryTaxonomyId: body.categoryTaxonomyId,
    });

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Keyword search failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute standalone keyword research" },
      { status: 500 }
    );
  }
}
