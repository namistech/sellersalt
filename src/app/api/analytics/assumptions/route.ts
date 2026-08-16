import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { FinancialCostAssumption } from "@/types/revenue";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;

    const setting = await prisma.appSetting.findUnique({
      where: { key: `financial_assumptions_${organizationId}` },
    });

    const defaults: FinancialCostAssumption = {
      organizationId,
      defaultCogsPercent: 25.0,
      defaultPackagingCost: 1.0,
      defaultShippingCost: 0.0,
      offsiteAdsOptIn: false,
      offsiteAdsRate: 0.15,
      updatedAt: new Date().toISOString(),
    };

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        return NextResponse.json({
          success: true,
          assumptions: { ...defaults, ...parsed, organizationId },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      assumptions: defaults,
    });
  } catch (err: any) {
    console.error("[ANALYTICS_ASSUMPTIONS_GET_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch cost assumptions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const body = await req.json();

    const data: Partial<FinancialCostAssumption> = {
      defaultCogsPercent: typeof body.defaultCogsPercent === "number" ? body.defaultCogsPercent : 25.0,
      defaultPackagingCost: typeof body.defaultPackagingCost === "number" ? body.defaultPackagingCost : 1.0,
      defaultShippingCost: typeof body.defaultShippingCost === "number" ? body.defaultShippingCost : 0.0,
      offsiteAdsOptIn: Boolean(body.offsiteAdsOptIn),
      offsiteAdsRate: typeof body.offsiteAdsRate === "number" ? body.offsiteAdsRate : 0.15,
      updatedAt: new Date().toISOString(),
    };

    const setting = await prisma.appSetting.upsert({
      where: { key: `financial_assumptions_${organizationId}` },
      create: {
        key: `financial_assumptions_${organizationId}`,
        value: JSON.stringify(data),
        isSecret: false,
      },
      update: {
        value: JSON.stringify(data),
      },
    });

    return NextResponse.json({
      success: true,
      assumptions: { ...data, organizationId },
      message: "Cost assumptions saved successfully.",
    });
  } catch (err: any) {
    console.error("[ANALYTICS_ASSUMPTIONS_POST_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to save cost assumptions" },
      { status: 500 }
    );
  }
}
