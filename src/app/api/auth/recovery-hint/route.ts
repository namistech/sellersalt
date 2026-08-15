import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";
import { sendLifecycleEmail } from "@/services/email/template-registry";

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***@***";
  const user = parts[0]!;
  const domain = parts[1]!;

  const maskedUser =
    user.length <= 2
      ? `${user[0]}*`
      : `${user[0]}${"*".repeat(Math.min(user.length - 2, 4))}${user[user.length - 1]}`;

  return `${maskedUser}@${domain}`;
}

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user) {
    // Return a dummy masked format to prevent email enumeration
    const dummyMask = maskEmail(normalized);
    return NextResponse.json({
      maskedEmail: dummyMask,
      requiresHintVerification: true,
    });
  }

  const masked = maskEmail(user.email);
  return NextResponse.json({
    maskedEmail: masked,
    requiresHintVerification: true,
  });
}
