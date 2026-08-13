import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/send-email";
import { isAdminEmail } from "@/lib/is-admin";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email) || !session?.user?.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await sendEmail({
    to: session.user.email,
    subject: "SellerSalt SMTP test",
    html: "<p>If you're reading this, your SMTP settings work.</p>",
    text: "If you're reading this, your SMTP settings work.",
  });

  if (!result.sent) {
    return NextResponse.json({ error: result.reason ?? "Failed to send." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
