import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCoupon, applyCouponDiscount } from "@/lib/coupons";

export async function POST(req: Request) {
  const { code, packageKey } = (await req.json()) as { code: string; packageKey: string };

  const pkg = await prisma.package.findUnique({ where: { key: packageKey } });
  if (!pkg) return NextResponse.json({ valid: false, error: "Package not found." }, { status: 404 });

  const result = await validateCoupon(code);
  if ("error" in result) return NextResponse.json({ valid: false, error: result.error });

  const prices = applyCouponDiscount(pkg, result.coupon);
  return NextResponse.json(prices);
}
