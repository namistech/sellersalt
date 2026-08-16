import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { TrackingAlertItem } from "@/types/tracking";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;

    const alerts = await prisma.trackingAlert.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const formatted: TrackingAlertItem[] = alerts.map((a) => ({
      id: a.id,
      organizationId: a.organizationId,
      targetType: a.targetType as any,
      targetId: a.targetId,
      targetTitle: a.targetTitle,
      eventType: a.eventType as any,
      severity: a.severity as any,
      message: a.message,
      previousValue: a.previousValue,
      currentValue: a.currentValue,
      delta: a.delta,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, alerts: formatted });
  } catch (err: any) {
    console.error("[TRACKING_ALERTS_GET_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch tracking alerts" },
      { status: 500 }
    );
  }
}
