import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UnitEconomicsCalculator } from "@/services/intelligence/unit-economics";
import type { UserUnitEconomicsInputs } from "@/marketplaces/core/validation/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as UserUnitEconomicsInputs;
    if (!body || typeof body.sellingPrice !== "number" || typeof body.cogs !== "number") {
      return NextResponse.json(
        { error: "sellingPrice and cogs are required numbers." },
        { status: 400 }
      );
    }

    const report = UnitEconomicsCalculator.calculate(body);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to calculate unit economics" },
      { status: 500 }
    );
  }
}
