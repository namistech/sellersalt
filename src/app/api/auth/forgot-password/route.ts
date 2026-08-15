import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/send-email";

const GENERIC_RESPONSE = {
  ok: true,
  message: "If an account exists for that email, we've sent a reset link.",
};

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Same response whether or not the account exists — a different response
  // would let someone probe which emails have accounts on SellerSalt.
  if (!user) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "https://sellersalt.com";
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  const resetUrl = `${cleanBaseUrl}/reset-password?token=${rawToken}`;

  const result = await sendEmail({
    to: user.email,
    subject: "Reset your SellerSalt password",
    html: `
      <p>Someone requested a password reset for your SellerSalt account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a> — this link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
    text: `Reset your password: ${resetUrl} (expires in 1 hour)`,
  });

  if (!result.sent) {
    // Don't leak SMTP failure details to the client, but log it server-side
    // so it's debuggable — the user still gets the generic success message.
    console.error("Password reset email failed to send:", result.reason);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
