import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unassignSeat, removeSeat } from "@/services/tenancy";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: seatId } = await params;
    const { searchParams } = new URL(req.url);
    const action = (searchParams.get("action") || "remove").toLowerCase();

    if (action === "unassign") {
      const result = await unassignSeat(seatId, userId);
      return NextResponse.json({ success: true, seat: result });
    } else {
      const result = await removeSeat(seatId, userId);
      return NextResponse.json({ success: true, seat: result });
    }
  } catch (error: any) {
    const status = error.statusCode || (error.code === "TENANT_ACCESS_DENIED" ? 403 : 400);
    return NextResponse.json({ error: error.message || "Failed to modify seat." }, { status });
  }
}
