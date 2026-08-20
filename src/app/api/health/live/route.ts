import { NextResponse } from "next/server";

/**
 * Liveness Probe: Verifies the Next.js application process is running and responsive.
 * Does not test external dependencies to prevent cascading restart loops.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "UP",
      timestamp: new Date().toISOString(),
      service: "sellersalt-web",
      uptimeSeconds: Math.floor(process.uptime()),
    },
    { status: 200 }
  );
}
