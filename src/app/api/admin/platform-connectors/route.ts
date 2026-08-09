import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { getConnector } from "@/connectors/registry";
import { isAdminEmail } from "@/lib/is-admin";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const connectors = await prisma.connector.findMany({
    where: { organizationId: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, label: true, status: true, createdAt: true },
  });
  return NextResponse.json({ connectors });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
      organizationId: null,
      type: type as any,
      label,
      encryptedCredentials: encrypt(JSON.stringify(credentials)),
      status: "ACTIVE",
    },
    select: { id: true, type: true, label: true, status: true, createdAt: true },
  });

  return NextResponse.json({ connector: created }, { status: 201 });
}
