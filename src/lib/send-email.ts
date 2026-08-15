import { getEmailProvider } from "@/services/email/provider";
import { sendLifecycleEmail, EMAIL_TEMPLATES } from "@/services/email/template-registry";
import type { EmailTemplateKey } from "@/services/email/types";

/**
 * Sends an email via the platform's active EmailProvider.
 * Degrades gracefully rather than throwing if not configured.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const provider = getEmailProvider();
  const res = await provider.send(params);
  return { sent: res.success, reason: res.error };
}

export { sendLifecycleEmail, EMAIL_TEMPLATES };
export type { EmailTemplateKey };
