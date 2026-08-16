import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase().trim() || "";
  const statusFilter = url.searchParams.get("status") || "all";

  const whereClause: any = {};

  if (search) {
    whereClause.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  if (statusFilter === "verified") {
    whereClause.emailVerified = { not: null };
  } else if (statusFilter === "unverified") {
    whereClause.emailVerified = null;
  } else if (statusFilter === "suspended") {
    whereClause.suspendedAt = { not: null };
  }

  const users = await prisma.user.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              package: { select: { name: true, key: true } },
              subscription: { select: { status: true, provider: true } },
              sellerChannels: { where: { platform: "ETSY_SELLER" }, select: { status: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  const avatarSettings = await prisma.appSetting.findMany({
    where: { key: { in: users.map((u) => `user_avatar_${u.id}`) } },
  });
  const avatarMap = new Map(avatarSettings.map((s) => [s.key.replace("user_avatar_", ""), s.value]));

  const formatted = users.map((u) => {
    const membership = u.memberships[0];
    const primaryOrg = membership?.organization;
    const role = membership?.role || "MEMBER";
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role,
      avatarUrl: avatarMap.get(u.id) ?? null,
      membershipId: membership?.id ?? null,
      organizationId: primaryOrg?.id ?? null,
      organizationName: primaryOrg?.name || "No Workspace",
      planName: primaryOrg?.package?.name || "Starter",
      subscriptionStatus: primaryOrg?.subscription?.status || "INCOMPLETE",
      memberSince: u.createdAt,
      suspended: Boolean(u.suspendedAt),
      emailVerified: Boolean(u.emailVerified),
      verificationEmailCount: u.verificationEmailCount,
      lastVerificationEmailAt: u.lastVerificationEmailAt,
      authMethods: u.authMethods,
      lastLoginAt: u.lastLoginAt,
      etsyConnected: (primaryOrg?.sellerChannels?.[0]?.status ?? null) === "ACTIVE",
    };
  });

  return NextResponse.json({ users: formatted });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").toLowerCase().trim();
  const name = (body.name || "").trim();
  const password = body.password || "";
  const organizationName = (body.organizationName || "").trim();
  const role = body.role === "ADMIN" || body.role === "MEMBER" ? body.role : "OWNER";
  const sendVerification = body.sendVerificationEmail !== false;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const { checkPasswordStrength } = await import("@/lib/password-policy");
  const strength = checkPasswordStrength(password);
  if (!strength.valid) {
    return NextResponse.json(
      { error: `Password does not meet requirements: ${strength.errors.join(", ")}.` },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);

  const orgDisplayName = organizationName || `${name || email.split("@")[0]}'s Workspace`;

  const [org, newUser] = await prisma.$transaction(async (tx) => {
    const createdOrg = await tx.organization.create({
      data: {
        name: orgDisplayName,
        plan: "FREE",
      },
    });

    const createdUser = await tx.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        emailVerified: null, // Unverified by default per security rules
      },
    });

    await tx.membership.create({
      data: {
        userId: createdUser.id,
        organizationId: createdOrg.id,
        role,
      },
    });

    return [createdOrg, createdUser];
  });

  const { logAuditEvent } = await import("@/lib/audit-log");
  await logAuditEvent({
    event: "ADMIN_USER_CREATED",
    actor: { email: session.user.email },
    target: { id: newUser.id, email: newUser.email },
    metadata: { organizationId: org.id, role },
  }).catch(() => {});

  let verificationSent = false;
  if (sendVerification) {
    const { sendVerificationEmail } = await import("@/lib/email-verification");
    const result = await sendVerificationEmail(newUser, {
      trigger: "admin",
      actor: { email: session.user.email },
    }).catch(() => ({ sent: false }));
    verificationSent = Boolean(result.sent);
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role,
      organizationId: org.id,
      organizationName: org.name,
      emailVerified: false,
      verificationSent,
    },
  });
}

