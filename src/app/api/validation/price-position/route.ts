import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PricePositioningEngine } from "@/services/intelligence/price-positioning";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { candidatePrice, median, p10, p25, p75, p90 } = body;

    if (typeof candidatePrice !== "number") {
      return NextResponse.json(
        { error: "candidatePrice must be a valid number." },
        { status: 400 }
      );
    }

    const result = PricePositioningEngine.evaluatePosition({
      candidatePrice,
      median: typeof median === "number" ? median : null,
      p10,
      p25,
      p75,
      p90,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to evaluate price positioning" },
      { status: 500 }
    );
  }
}
