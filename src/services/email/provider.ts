import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import type { EmailProvider, EmailMessage, SendEmailResult } from "./types";

export class SmtpEmailProvider implements EmailProvider {
  name = "SMTP";

  private async getTransporter() {
    const settings = await prisma.emailSettings.findFirst({ where: { isActive: true } });
    if (!settings) return null;

    const password = decrypt(settings.encryptedPassword);
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.username, pass: password },
    });

    return { transporter, settings };
  }

  async send(msg: EmailMessage): Promise<SendEmailResult> {
    const ctx = await this.getTransporter();
    if (!ctx) {
      return { success: false, error: "No active SMTP configuration found." };
    }

    try {
      const from = `"${msg.fromName || ctx.settings.fromName}" <${msg.fromEmail || ctx.settings.fromEmail}>`;
      await ctx.transporter.sendMail({
        from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  async testConnection(): Promise<SendEmailResult> {
    const ctx = await this.getTransporter();
    if (!ctx) {
      return { success: false, error: "No active SMTP configuration." };
    }

    try {
      await ctx.transporter.verify();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}

export class AwsSesEmailProvider implements EmailProvider {
  name = "AWS_SES";

  isConfigured(): boolean {
    return Boolean(
      process.env.AWS_SES_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    );
  }

  async send(_msg: EmailMessage): Promise<SendEmailResult> {
    if (!this.isConfigured()) {
      return { success: false, error: "AWS SES is not configured in environment variables." };
    }
    // AWS SES SendRawEmail / SendEmail seam
    return { success: false, error: "AWS SES client integration point ready." };
  }

  async testConnection(): Promise<SendEmailResult> {
    return { success: this.isConfigured(), error: this.isConfigured() ? undefined : "AWS SES not configured." };
  }
}

let activeProvider: EmailProvider = new SmtpEmailProvider();

export function getEmailProvider(): EmailProvider {
  return activeProvider;
}

export function setEmailProvider(provider: EmailProvider) {
  activeProvider = provider;
}
