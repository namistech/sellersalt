import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ResearchQueueManager } from "@/services/intelligence/research-queue";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const success = await ResearchQueueManager.removeFromQueue(id, session.user.organizationId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to remove from research queue" },
      { status: 500 }
    );
  }
}
