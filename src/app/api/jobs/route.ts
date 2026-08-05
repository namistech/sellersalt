import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { prospectingQueue } from "@/lib/queue";

async function requireOrg() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.organizationId as string | undefined;
}

export async function GET() {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.job.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { searchConfig: { select: { name: true } }, connector: { select: { label: true } } },
  });
  return NextResponse.json({ jobs });
}

// Triggers a "Run now" for an existing search config — this is the
// "user action triggers an automation" flow the dashboard is built around.
export async function POST(req: Request) {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchConfigId } = await req.json();
  if (!searchConfigId) return NextResponse.json({ error: "searchConfigId is required." }, { status: 400 });

  const searchConfig = await prisma.searchConfig.findFirst({
    where: { id: searchConfigId, organizationId },
  });
  if (!searchConfig) return NextResponse.json({ error: "Search config not found." }, { status: 404 });

  const job = await prisma.job.create({
    data: {
      organizationId,
      connectorId: searchConfig.connectorId,
      searchConfigId: searchConfig.id,
      status: "QUEUED",
      triggeredBy: "USER",
    },
  });

  await prospectingQueue.add(
    "run-search",
    {
      jobId: job.id,
      organizationId,
      connectorId: searchConfig.connectorId,
      searchConfigId: searchConfig.id,
    },
    { jobId: job.id }
  );

  return NextResponse.json({ job }, { status: 201 });
}
