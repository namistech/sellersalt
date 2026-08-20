import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SourceHealthTracker } from "@/marketplaces/core/acquisition/source-health";

export async function GET() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const health = await SourceHealthTracker.getAllHealth();
    return NextResponse.json({ health });
  } catch (error: any) {
    console.error("[GetSourceHealthError]", error);
    return NextResponse.json({ error: error.message || "Failed to retrieve source health" }, { status: 500 });
  }
}
