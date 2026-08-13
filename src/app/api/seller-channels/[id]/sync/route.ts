import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncSellerChannel } from "@/lib/sync-seller-channel";
import { requireAdminOrg } from "@/lib/require-admin-org";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizationId = await requireAdminOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channel = await prisma.sellerChannel.findFirst({ where: { id, organizationId } });
  if (!channel) return NextResponse.json({ error: "Channel not found." }, { status: 404 });

  const result = await syncSellerChannel(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, newOrders: result.newOrders });
}
