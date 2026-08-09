import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { upsertSchedule, removeSchedule, SCHEDULE_FREQUENCIES } from "@/lib/queue";
import { checkLimit } from "@/lib/plan-limits";

async function requireOrg() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.organizationId as string | undefined;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.searchConfig.findFirst({ where: { id, organizationId } });
  if (!config) return NextResponse.json({ error: "Search not found." }, { status: 404 });

  const { scheduleFrequency } = await req.json();
  const freqKey = scheduleFrequency && scheduleFrequency in SCHEDULE_FREQUENCIES ? scheduleFrequency : "MANUAL";
  const cronPattern = SCHEDULE_FREQUENCIES[freqKey];

  if (cronPattern && !config.scheduleCron) {
    const scheduleLimit = await checkLimit(organizationId, "scheduledSearches");
    if (!scheduleLimit.allowed) {
      return NextResponse.json(
        { error: `Your plan allows up to ${scheduleLimit.limit} scheduled (recurring) searches. Upgrade to add more.` },
        { status: 403 }
      );
    }
  }

  await prisma.searchConfig.update({ where: { id }, data: { scheduleCron: cronPattern } });

  if (cronPattern) {
    await upsertSchedule({ searchConfigId: id, organizationId, connectorId: config.connectorId, cronPattern });
  } else {
    await removeSchedule(id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.searchConfig.deleteMany({ where: { id, organizationId } });
  if (result.count === 0) return NextResponse.json({ error: "Search not found." }, { status: 404 });

  await removeSchedule(id);
  return NextResponse.json({ ok: true });
}
