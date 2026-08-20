import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProductValidationEngine } from "@/services/intelligence/product-validation-engine";
import type { ProductValidationRequest } from "@/marketplaces/core/validation/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ProductValidationRequest;
    const requestWithOrg: ProductValidationRequest = {
      ...body,
      organizationId: session.user.organizationId,
    };

    const report = await ProductValidationEngine.validateProduct(requestWithOrg);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to validate product" },
      { status: 500 }
    );
  }
}
