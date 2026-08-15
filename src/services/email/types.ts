export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<SendEmailResult>;
  testConnection(): Promise<SendEmailResult>;
}

export type EmailTemplateKey =
  | "EMAIL_VERIFICATION"
  | "WELCOME"
  | "PASSWORD_RESET"
  | "PASSWORD_CHANGED"
  | "EMAIL_CHANGED"
  | "SECURITY_ALERT"
  | "TEAM_INVITATION"
  | "SUBSCRIPTION_STARTED"
  | "TRIAL_STARTED"
  | "PAYMENT_SUCCESSFUL"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_CANCELLED"
  | "SUBSCRIPTION_RESUMED"
  | "ETSY_CONNECTED"
  | "ETSY_DISCONNECTED";

export interface EmailTemplateDefinition {
  key: EmailTemplateKey;
  name: string;
  description: string;
  defaultSubject: string;
  variables: string[];
  generateHtml: (vars: Record<string, string>) => string;
  generateText: (vars: Record<string, string>) => string;
}
