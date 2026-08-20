import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ResearchQueueManager } from "@/services/intelligence/research-queue";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await ResearchQueueManager.getQueue(session.user.organizationId);
    return NextResponse.json({ items, count: items.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch research queue" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const item = await ResearchQueueManager.addToQueue({
      ...body,
      organizationId: session.user.organizationId,
    });
    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add to research queue" },
      { status: 500 }
    );
  }
}
