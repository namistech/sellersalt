import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";
import { scheduleVerificationReminders } from "@/lib/queue";
import { checkPasswordStrength } from "@/lib/password-policy";
import { analyzeEmailDomain } from "@/lib/abuse-prevention/disposable-domains";
import { evaluateBusinessDomainPolicy } from "@/lib/abuse-prevention/business-domain-policy";
import { evaluateAccountRisk } from "@/lib/abuse-prevention/account-risk";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";

// One signup = one User + one Organization + one OWNER Membership.
export async function POST(req: Request) {
  // 1. IP Rate Limiting
  const clientIp = extractClientIp(req);
  const rateCheck = checkRateLimit(clientIp, "SIGNUP");
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: `Too many registration attempts. Please try again in ${rateCheck.resetSeconds} seconds.` },
      { status: 429, headers: rateCheck.headers }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, name, organizationName, targetPlan } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // 2. Authoritative Password Policy Check
    const strength = checkPasswordStrength(password);
    if (!strength.valid) {
      return NextResponse.json(
        { error: `Password must include: ${strength.errors.join(", ")}.` },
        { status: 400 }
      );
    }

    // 3. Disposable & Temporary Email Prevention (Part 2)
    const domainAnalysis = await analyzeEmailDomain(normalizedEmail);
    if (domainAnalysis.isDisposable) {
      return NextResponse.json(
        { error: domainAnalysis.error || "Temporary or disposable email addresses are not permitted. Please use a permanent email address." },
        { status: 400 }
      );
    }
    if (!domainAnalysis.isValid) {
      return NextResponse.json(
        { error: domainAnalysis.error || "Invalid email address." },
        { status: 400 }
      );
    }

    // 4. Existing User Check
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    // 5. Business Domain Free-Account Policy (Part 3)
    const planToEvaluate = targetPlan === "STARTED" || targetPlan === "PRO" || targetPlan === "AGENCY" ? targetPlan : "FREE";
    const domainPolicy = await evaluateBusinessDomainPolicy(normalizedEmail, planToEvaluate);
    if (!domainPolicy.allowed) {
      return NextResponse.json(
        {
          error: domainPolicy.reason || "Domain quota reached for free accounts.",
          code: "BUSINESS_DOMAIN_LIMIT_REACHED",
          suggestedAction: domainPolicy.suggestedAction,
        },
        { status: 403 }
      );
    }

    // 6. Account Risk Model Scoring (Part 1)
    const risk = await evaluateAccountRisk({
      email: normalizedEmail,
      ipAddress: clientIp,
      domainFreeAccountCount: domainPolicy.existingFreeAccountCount,
    });

    if (!risk.allowSignup) {
      return NextResponse.json(
        {
          error: "Registration flagged by security screening. Please contact support or use a verified business identity.",
          code: "ACCOUNT_RISK_REJECTED",
        },
        { status: 403 }
      );
    }

    // 7. Create Organization & User
    const passwordHash = await bcrypt.hash(password, 12);

    const org = await prisma.organization.create({
      data: {
        name: organizationName?.trim() || `${name || normalizedEmail}'s workspace`,
        plan: planToEvaluate === "STARTED" || planToEvaluate === "PRO" || planToEvaluate === "AGENCY" ? "PRO" : "FREE",
      },
    });

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || null,
        memberships: {
          create: { organizationId: org.id, role: "OWNER" },
        },
      },
    });

    // 8. Dispatch First Verification Email
    sendVerificationEmail(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: null,
        verificationEmailCount: 0,
        verificationFirstSentAt: null,
        lastVerificationEmailAt: null,
      },
      { trigger: "signup" }
    ).catch((err) => console.error("Failed to send initial verification email:", err));

    scheduleVerificationReminders(user.id).catch((err) =>
      console.error("Failed to schedule verification reminders:", err)
    );

    return NextResponse.json({ ok: true, riskScore: risk.score });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during signup. Please try again." },
      { status: 500 }
    );
  }
}
