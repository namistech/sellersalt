import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { getSellerChannelConnector } from "@/seller-channels/registry";
import { checkLimit } from "@/lib/plan-limits";
import { startSellerChannelSync } from "@/lib/queue";

async function requireOrg() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.organizationId as string | undefined;
}

export async function GET() {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channels = await prisma.sellerChannel.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, platform: true, label: true, storeUrl: true, status: true,
      lastSyncedAt: true, lastSyncError: true, createdAt: true,
    },
  });
  return NextResponse.json({ channels });
}

export async function POST(req: Request) {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitCheck = await checkLimit(organizationId, "sellerChannels");
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Your plan allows connecting up to ${limitCheck.limit} store(s). Upgrade to connect more.` },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { platform, label, storeUrl, credentials } = body as {
    platform: string;
    label: string;
    storeUrl: string;
    credentials: Record<string, string>;
  };

  if (!platform || !storeUrl || !credentials) {
    return NextResponse.json({ error: "platform, storeUrl, and credentials are required." }, { status: 400 });
  }

  let connector;
  try {
    connector = getSellerChannelConnector(platform);
  } catch {
    return NextResponse.json({ error: `"${platform}" isn't supported yet.` }, { status: 400 });
  }

  const test = await connector.testConnection(credentials, storeUrl);
  if (!test.ok) {
    return NextResponse.json({ error: test.message ?? "Couldn't connect with those details." }, { status: 400 });
  }

  const created = await prisma.sellerChannel.create({
    data: {
      organizationId,
      platform: platform as any,
      label: label || storeUrl,
      storeUrl,
      encryptedCredentials: encrypt(JSON.stringify(credentials)),
      status: "ACTIVE",
    },
    select: { id: true, platform: true, label: true, storeUrl: true, status: true, createdAt: true },
  });

  await startSellerChannelSync(created.id);

  return NextResponse.json({ channel: created }, { status: 201 });
}
