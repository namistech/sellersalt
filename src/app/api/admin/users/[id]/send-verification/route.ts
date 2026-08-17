import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) return null;
  return session!.user as { id?: string; email: string };
}

// Admin-triggered verification email dispatch.
// Bypasses end-user cooldown/cap restrictions to allow administrators to manually
// re-send verification links to users on demand.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminActor = await requireAdmin();
  if (!adminActor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    include: { memberships: { include: { organization: true } } },
  });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (target.emailVerified) {
    return NextResponse.json({ error: "This user's email is already verified." }, { status: 400 });
  }

  try {
    const result = await sendVerificationEmail(target, {
      trigger: "admin",
      actor: { id: adminActor.id, email: adminActor.email },
      bypassRateLimit: true,
    });

    if (!result.sent) {
      if (result.reason === "already_verified") {
        return NextResponse.json({ error: "This user's email is already verified." }, { status: 400 });
      }
      return NextResponse.json({ error: "Could not send verification email." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `Verification email sent to ${target.email}.`,
      user: {
        id: target.id,
        email: target.email,
        lastVerificationEmailAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Failed to send admin verification email:", err);
    return NextResponse.json(
      { error: err.message || "Failed to deliver verification email through email provider." },
      { status: 500 }
    );
  }
}

