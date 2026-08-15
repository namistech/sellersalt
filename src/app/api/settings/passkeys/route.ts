import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id as string | undefined;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const credentials = await prisma.webAuthnCredential.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, deviceType: true, backedUp: true, createdAt: true, lastUsedAt: true },
  });

  return NextResponse.json({ passkeys: credentials });
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name } = (await req.json().catch(() => ({}))) as { id?: string; name?: string };
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "id and name are required." }, { status: 400 });
  }

  const result = await prisma.webAuthnCredential.updateMany({
    where: { id, userId },
    data: { name: name.trim() },
  });
  if (result.count === 0) return NextResponse.json({ error: "Passkey not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const result = await prisma.webAuthnCredential.deleteMany({ where: { id, userId } });
  if (result.count === 0) return NextResponse.json({ error: "Passkey not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}
