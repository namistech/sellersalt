import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stopSellerChannelSync } from "@/lib/queue";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Decouple independent user listing drafts from this channel
  await prisma.listingDraft.updateMany({
    where: { sellerChannelId: id, organizationId },
    data: { sellerChannelId: null },
  }).catch(() => {});

  // 2. Remove channel-specific execution logs and synced orders
  await prisma.etsyExecutionLog.deleteMany({
    where: { sellerChannelId: id, organizationId },
  }).catch(() => {});

  // 3. Stop background sync queue
  await stopSellerChannelSync(id).catch(() => {});

  // 4. Delete the seller channel record (purges encrypted tokens)
  const result = await prisma.sellerChannel.deleteMany({ where: { id, organizationId } });
  if (result.count === 0) return NextResponse.json({ error: "Channel not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
