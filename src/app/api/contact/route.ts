import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/send-email";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json({ error: "Please enter a message of at least 10 characters." }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    // Check if an active email sender is configured or fallback to support address
    const emailSetting = await prisma.emailSettings.findFirst({ where: { isActive: true } });
    const supportRecipient = emailSetting?.fromEmail || process.env.ADMIN_EMAIL || "support@sellersalt.com";

    // Attempt email delivery via the existing transactional SMTP system
    const emailResult = await sendEmail({
      to: supportRecipient,
      subject: `[SellerSalt Support Inquiry] ${cleanSubject}`,
      html: `
        <h3>New Support Message from SellerSalt Contact Form</h3>
        <p><strong>From:</strong> ${cleanName} (${cleanEmail})</p>
        <p><strong>Subject:</strong> ${cleanSubject}</p>
        <hr/>
        <p style="white-space: pre-wrap;">${cleanMessage}</p>
      `,
      text: `Support Message from ${cleanName} (${cleanEmail})\nSubject: ${cleanSubject}\n\n${cleanMessage}`,
    });

    if (!emailResult.sent) {
      console.warn("Contact form email notification warning:", emailResult.reason);
    }

    return NextResponse.json({
      ok: true,
      message: "Thank you! Your message has been received. Our team will get back to you within 24 hours.",
    });
  } catch (error: any) {
    console.error("Contact form submission error:", error);
    return NextResponse.json({ error: "Failed to process your message. Please email support@sellersalt.com directly." }, { status: 500 });
  }
}
