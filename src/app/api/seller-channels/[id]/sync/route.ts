import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncSellerChannel } from "@/lib/sync-seller-channel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channel = await prisma.sellerChannel.findFirst({ where: { id, organizationId } });
  if (!channel) return NextResponse.json({ error: "Channel not found." }, { status: 404 });

  const result = await syncSellerChannel(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, newOrders: result.newOrders });
}
