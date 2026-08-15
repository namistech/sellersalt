import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/send-email";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, org, membership, sellerChannel] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, createdAt: true },
    }),
    organizationId
      ? prisma.organization.findUnique({
          where: { id: organizationId },
          include: { package: { select: { name: true, key: true } } },
        })
      : null,
    organizationId
      ? prisma.membership.findUnique({
          where: { userId_organizationId: { userId, organizationId } },
          select: { role: true },
        })
      : null,
    organizationId
      ? prisma.sellerChannel.findFirst({
          where: { organizationId, platform: "ETSY_SELLER" },
          select: { id: true, label: true, storeUrl: true, status: true, lastSyncedAt: true },
        })
      : null,
  ]);

  return NextResponse.json({
    name: user?.name ?? "",
    email: user?.email ?? "",
    memberSince: user?.createdAt,
    organizationName: org?.name ?? "",
    planName: org?.package?.name ?? org?.plan ?? "Starter",
    planKey: org?.package?.key ?? org?.plan ?? "FREE",
    role: membership?.role ?? "MEMBER",
    connectedEtsyShop: sellerChannel,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, organizationName, email, currentPassword } = body;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // 1. Handle Email Change (Requires Password Verification & Uniqueness Check)
  if (typeof email === "string" && email.trim()) {
    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (normalizedEmail !== user.email.toLowerCase()) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Your current password is required to update your login email." },
          { status: 400 }
        );
      }

      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }

      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: "An account with this email address already exists." }, { status: 409 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { email: normalizedEmail },
      });

      // Send transactional confirmation email
      sendEmail({
        to: normalizedEmail,
        subject: "SellerSalt — Account email updated",
        html: `<p>Hi ${user.name || "there"},</p><p>Your SellerSalt login email address was updated to <strong>${normalizedEmail}</strong>.</p><p>If you did not make this change, please contact support immediately.</p>`,
      }).catch(() => {});
    }
  }

  // 2. Handle Name and Organization Updates
  const updates: Promise<any>[] = [];
  if (typeof name === "string" && name.trim()) {
    updates.push(prisma.user.update({ where: { id: userId }, data: { name: name.trim() } }));
  }

  if (organizationId && typeof organizationName === "string" && organizationName.trim()) {
    updates.push(
      prisma.organization.update({ where: { id: organizationId }, data: { name: organizationName.trim() } })
    );
  }

  await Promise.all(updates);

  return NextResponse.json({ ok: true });
}
