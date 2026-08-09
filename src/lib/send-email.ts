import nodemailer from "nodemailer";
import { prisma } from "./db";
import { decrypt } from "./encryption";

/** Sends an email via the platform's configured SMTP settings. Returns
 * { sent: false, reason } instead of throwing when nothing is configured or
 * active, so callers (password reset, invites) can degrade gracefully rather
 * than 500 the whole request over a missing SMTP setup. */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const settings = await prisma.emailSettings.findFirst({ where: { isActive: true } });
  if (!settings) {
    return { sent: false, reason: "No active SMTP configuration." };
  }

  try {
    const password = decrypt(settings.encryptedPassword);
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.username, pass: password },
    });

    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return { sent: true };
  } catch (err: any) {
    return { sent: false, reason: err.message ?? String(err) };
  }
}
