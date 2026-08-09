import { NextResponse } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

async function findValidInvite(token: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invite = await prisma.invite.findUnique({ where: { tokenHash }, include: { organization: true } });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) return null;
  return invite;
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const invite = await findValidInvite(token);
  if (!invite) return NextResponse.json({ error: "This invite is invalid or has expired." }, { status: 400 });

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });

  return NextResponse.json({
    email: invite.email,
    organizationName: invite.organization.name,
    userExists: Boolean(existingUser),
  });
}

export async function POST(req: Request) {
  const { token, name, password } = await req.json();
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const invite = await findValidInvite(token);
  if (!invite) return NextResponse.json({ error: "This invite is invalid or has expired." }, { status: 400 });

  let user = await prisma.user.findUnique({ where: { email: invite.email } });
  let createdNewAccount = false;

  if (!user) {
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "A password of at least 8 characters is required." }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: { email: invite.email, passwordHash, name: name?.trim() || null },
    });
    createdNewAccount = true;
  }

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: invite.organizationId } },
    create: { userId: user.id, organizationId: invite.organizationId, role: invite.role },
    update: {},
  });

  await prisma.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });

  return NextResponse.json({ ok: true, email: user.email, createdNewAccount });
}
