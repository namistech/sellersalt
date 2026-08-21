import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assignSeat, getOrgSeatAllocation } from "@/services/tenancy";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const orgId = (session?.user as any)?.organizationId;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetOrgId = searchParams.get("organizationId") || orgId;

    const allocation = await getOrgSeatAllocation(targetOrgId, userId);
    return NextResponse.json(allocation);
  } catch (error: any) {
    const status = error.statusCode || (error.code === "TENANT_ACCESS_DENIED" ? 403 : 500);
    return NextResponse.json({ error: error.message || "Failed to get seat allocation." }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const orgId = (session?.user as any)?.organizationId;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const targetOrgId = body.organizationId || orgId;
    const targetUserId = body.targetUserId;
    const seatType = body.seatType || "STANDARD";

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required." }, { status: 400 });
    }

    const seat = await assignSeat(targetOrgId, targetUserId, seatType, userId);
    return NextResponse.json({ success: true, seat }, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || (error.code === "TENANT_ACCESS_DENIED" ? 403 : 400);
    return NextResponse.json({ error: error.message || "Failed to assign seat." }, { status });
  }
}
