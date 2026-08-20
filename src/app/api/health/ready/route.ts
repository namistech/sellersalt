import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Readiness Probe: Verifies whether the application has active database connectivity
 * and is ready to accept production traffic.
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: "UP" | "DOWN"; latencyMs?: number; error?: string }> = {};

  let isReady = true;

  // 1. PostgreSQL Database Check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "UP",
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: any) {
    isReady = false;
    checks.database = {
      status: "DOWN",
      error: "Database connectivity check failed.",
    };
  }

  // 2. Core Schema Table Probe
  if (checks.database?.status === "UP") {
    try {
      const orgCount = await prisma.organization.count();
      checks.schema = {
        status: "UP",
        latencyMs: 1,
      };
    } catch {
      isReady = false;
      checks.schema = {
        status: "DOWN",
        error: "Schema query check failed.",
      };
    }
  }

  const durationMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: isReady ? "READY" : "NOT_READY",
      timestamp: new Date().toISOString(),
      service: "sellersalt-api",
      durationMs,
      checks,
    },
    { status: isReady ? 200 : 503 }
  );
}
