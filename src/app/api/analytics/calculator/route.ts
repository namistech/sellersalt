import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateProfitSimulation } from "@/services/revenue-engine";
import type { ProfitCalculatorInput } from "@/types/revenue";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ProfitCalculatorInput;

    const result = calculateProfitSimulation({
      salePrice: Number(body.salePrice) || 0,
      shippingCharged: Number(body.shippingCharged) || 0,
      unitCogs: Number(body.unitCogs) || 0,
      shippingCostIncurred: Number(body.shippingCostIncurred) || 0,
      packagingCost: Number(body.packagingCost) || 0,
      offsiteAds: Boolean(body.offsiteAds),
      offsiteAdsRate: Number(body.offsiteAdsRate) || 0.15,
      quantity: Number(body.quantity) || 1,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error("[ANALYTICS_CALCULATOR_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to calculate profit simulation" },
      { status: 500 }
    );
  }
}
