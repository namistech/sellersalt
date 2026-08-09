import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { getConnector } from "@/connectors/registry";
import { checkLimit } from "@/lib/plan-limits";

async function requireOrg() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return null;
  return organizationId;
}

export async function GET() {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Platform connectors (organizationId: null) are available to every org by
  // default — this is what lets a customer start searching without ever
  // connecting anything themselves. Org-owned connectors are an opt-in extra.
  const connectors = await prisma.connector.findMany({
    where: { OR: [{ organizationId }, { organizationId: null }] },
    orderBy: [{ organizationId: "desc" }, { createdAt: "desc" }], // org-owned first, then platform
    select: { id: true, type: true, label: true, status: true, organizationId: true, createdAt: true },
  });

  return NextResponse.json({
    connectors: connectors.map((c: (typeof connectors)[number]) => ({
      ...c,
      scope: c.organizationId ? "own" : "platform",
    })),
  });
}

export async function POST(req: Request) {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitCheck = await checkLimit(organizationId, "connectors");
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Your plan allows up to ${limitCheck.limit} of your own connector(s). Upgrade to add more.` },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { type, label, credentials } = body as {
    type: string;
    label: string;
    credentials: Record<string, string>;
  };

  if (!type || !label || !credentials) {
    return NextResponse.json({ error: "type, label, and credentials are required." }, { status: 400 });
  }

  let connector;
  try {
    connector = getConnector(type);
  } catch {
    return NextResponse.json({ error: `Unsupported connector type "${type}".` }, { status: 400 });
  }

  const test = await connector.testConnection(credentials);
  if (!test.ok) {
    return NextResponse.json(
      { error: `Connection test failed: ${test.message ?? "invalid credentials"}` },
      { status: 400 }
    );
  }

  const created = await prisma.connector.create({
    data: {
      organizationId,
      type: type as any,
      label,
      encryptedCredentials: encrypt(JSON.stringify(credentials)),
      status: "ACTIVE",
    },
    select: { id: true, type: true, label: true, status: true, createdAt: true },
  });

  return NextResponse.json({ connector: created }, { status: 201 });
}
