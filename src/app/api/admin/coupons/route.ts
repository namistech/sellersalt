import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { code, type, value, maxRedemptions, expiresAt } = body;

  if (!code || !type || value === undefined) {
    return NextResponse.json({ error: "code, type, and value are required." }, { status: 400 });
  }
  if (type !== "PERCENT" && type !== "FIXED") {
    return NextResponse.json({ error: "type must be PERCENT or FIXED." }, { status: 400 });
  }

  const created = await prisma.coupon.create({
    data: {
      code: String(code).trim().toUpperCase(),
      type,
      value: Number(value),
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ coupon: created }, { status: 201 });
}
