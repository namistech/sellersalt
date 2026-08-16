import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { compareProducts } from "@/services/product-hunting";
import type { ProductHuntingResult } from "@/types/product-hunting";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const items: ProductHuntingResult[] = Array.isArray(body.items) ? body.items : [];

    if (items.length < 2) {
      return NextResponse.json(
        { error: "At least 2 products are required for comparison." },
        { status: 400 }
      );
    }

    if (items.length > 5) {
      return NextResponse.json(
        { error: "A maximum of 5 products can be compared simultaneously." },
        { status: 400 }
      );
    }

    const comparison = compareProducts(items);

    return NextResponse.json({ comparison });
  } catch (error: any) {
    console.error("[ProductCompareError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to compare products" },
      { status: 500 }
    );
  }
}
