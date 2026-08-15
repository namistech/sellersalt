import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { EMAIL_TEMPLATES, sendLifecycleEmail } from "@/services/email/template-registry";
import type { EmailTemplateKey } from "@/services/email/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  const templates = Object.values(EMAIL_TEMPLATES).map((t) => ({
    key: t.key,
    name: t.name,
    description: t.description,
    defaultSubject: t.defaultSubject,
    variables: t.variables,
    sampleHtml: t.generateHtml({
      name: "Alex Smith",
      verificationUrl: "https://staging.sellersalt.com/api/auth/verify-email?token=sample",
      dashboardUrl: "https://staging.sellersalt.com/dashboard",
      resetUrl: "https://staging.sellersalt.com/reset-password?token=sample",
      expiresInHours: "24",
      shopName: "VintageCraftStudio",
      planName: "SellerSalt Pro",
      amount: "$19.00 USD",
      activity: "New login from San Francisco, CA",
      location: "San Francisco, CA",
      workspaceName: "Craft Lab Workspace",
      role: "MEMBER",
      newEmail: "alex.new@example.com",
    }),
  }));

  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  const { templateKey, recipientEmail } = (await req.json()) as {
    templateKey: EmailTemplateKey;
    recipientEmail: string;
  };

  if (!templateKey || !recipientEmail) {
    return NextResponse.json({ error: "Template key and recipient email are required." }, { status: 400 });
  }

  const res = await sendLifecycleEmail(templateKey, recipientEmail, {
    name: "Admin Tester",
    verificationUrl: "https://staging.sellersalt.com/api/auth/verify-email?token=test",
    dashboardUrl: "https://staging.sellersalt.com/dashboard",
    resetUrl: "https://staging.sellersalt.com/reset-password?token=test",
    expiresInHours: "24",
    shopName: "TestEtsyStore",
    planName: "Pro Tier",
    amount: "$19.00 USD",
    activity: "Admin Template Test",
    location: "Test Location",
    workspaceName: "Test Workspace",
    role: "ADMIN",
    newEmail: recipientEmail,
  });

  return NextResponse.json({ success: res.success, error: res.error });
}
