import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// No auth required — this is for Coolify's health check probe, not user-facing.
// Checks a real DB round-trip, not just "the process is running," since a
// dead database connection is the failure mode most worth catching early.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 503 });
  }
}
