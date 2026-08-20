/**
 * SellerSalt Production Environment Configuration Validator
 * 
 * Inspects and categorizes application environment variables to ensure production readiness
 * without crashing local development or leaking secret values into logs or diagnostic surfaces.
 */

export type EnvCategory =
  | "REQUIRED_FOR_BOOT"
  | "REQUIRED_FOR_CORE_RESEARCH"
  | "REQUIRED_FOR_BILLING"
  | "REQUIRED_FOR_EMAIL"
  | "REQUIRED_FOR_MARKETPLACE_INTEGRATIONS"
  | "OPTIONAL"
  | "DEVELOPMENT_ONLY";

export interface EnvVariableSpec {
  name: string;
  category: EnvCategory;
  description: string;
  isSecret: boolean;
  defaultValue?: string;
}

export const ENV_SPECS: EnvVariableSpec[] = [
  // BOOT
  { name: "DATABASE_URL", category: "REQUIRED_FOR_BOOT", description: "PostgreSQL connection string with pooling parameters", isSecret: true },
  { name: "NEXTAUTH_SECRET", category: "REQUIRED_FOR_BOOT", description: "Cryptographic secret for NextAuth JWT session encryption", isSecret: true },
  { name: "NEXTAUTH_URL", category: "REQUIRED_FOR_BOOT", description: "Canonical public base URL (e.g. https://sellersalt.com)", isSecret: false, defaultValue: "http://localhost:3000" },
  { name: "ENCRYPTION_KEY", category: "REQUIRED_FOR_BOOT", description: "AES-256-GCM master secret for token and credential encryption at rest", isSecret: true },

  // BILLING
  { name: "STRIPE_SECRET_KEY", category: "REQUIRED_FOR_BILLING", description: "Stripe API secret key (sk_live_... / sk_test_...)", isSecret: true },
  { name: "STRIPE_WEBHOOK_SECRET", category: "REQUIRED_FOR_BILLING", description: "Stripe webhook signing secret (whsec_...)", isSecret: true },
  { name: "PAYPAL_CLIENT_ID", category: "REQUIRED_FOR_BILLING", description: "PayPal REST API Client ID", isSecret: false },
  { name: "PAYPAL_CLIENT_SECRET", category: "REQUIRED_FOR_BILLING", description: "PayPal REST API Secret", isSecret: true },
  { name: "PAYPAL_WEBHOOK_ID", category: "REQUIRED_FOR_BILLING", description: "PayPal Webhook verification ID", isSecret: true },

  // EMAIL
  { name: "SMTP_HOST", category: "REQUIRED_FOR_EMAIL", description: "Outbound SMTP server host", isSecret: false },
  { name: "SMTP_PORT", category: "REQUIRED_FOR_EMAIL", description: "Outbound SMTP server port (587/465)", isSecret: false, defaultValue: "587" },
  { name: "SMTP_USER", category: "REQUIRED_FOR_EMAIL", description: "SMTP authentication username", isSecret: false },
  { name: "SMTP_PASS", category: "REQUIRED_FOR_EMAIL", description: "SMTP authentication password", isSecret: true },
  { name: "EMAIL_FROM", category: "REQUIRED_FOR_EMAIL", description: "Default sender email address (e.g. noreply@sellersalt.com)", isSecret: false },

  // MARKETPLACES
  { name: "ETSY_CLIENT_ID", category: "REQUIRED_FOR_MARKETPLACE_INTEGRATIONS", description: "Etsy OpenAPI v3 OAuth Client ID / Keystring", isSecret: false },
  { name: "ETSY_CLIENT_SECRET", category: "REQUIRED_FOR_MARKETPLACE_INTEGRATIONS", description: "Etsy OpenAPI v3 OAuth Client Secret", isSecret: true },

  // OPTIONAL
  { name: "REDIS_URL", category: "OPTIONAL", description: "Redis connection URI for distributed caching and BullMQ background workers", isSecret: true },
  { name: "ADMIN_EMAILS", category: "OPTIONAL", description: "Comma-separated list of superadmin user email addresses", isSecret: false },
  { name: "OPENAI_API_KEY", category: "OPTIONAL", description: "OpenAI API key for SaltBot and AI Listing Studio drafting", isSecret: true },
  { name: "ANTHROPIC_API_KEY", category: "OPTIONAL", description: "Anthropic Claude API key for AI generation provider fallback", isSecret: true },
];

export interface ValidationReport {
  isValid: boolean;
  environment: string;
  missingRequired: string[];
  missingBilling: string[];
  missingEmail: string[];
  missingMarketplaces: string[];
  statusMap: Record<string, "CONFIGURED" | "MISSING" | "DEFAULT_USED">;
}

export class EnvironmentValidator {
  /**
   * Validates the runtime environment against canonical specifications.
   */
  public static validate(): ValidationReport {
    const missingRequired: string[] = [];
    const missingBilling: string[] = [];
    const missingEmail: string[] = [];
    const missingMarketplaces: string[] = [];
    const statusMap: Record<string, "CONFIGURED" | "MISSING" | "DEFAULT_USED"> = {};

    for (const spec of ENV_SPECS) {
      const val = process.env[spec.name];
      const isSet = typeof val === "string" && val.trim().length > 0;

      if (isSet) {
        statusMap[spec.name] = "CONFIGURED";
      } else if (spec.defaultValue) {
        statusMap[spec.name] = "DEFAULT_USED";
      } else {
        statusMap[spec.name] = "MISSING";
        if (spec.category === "REQUIRED_FOR_BOOT") {
          missingRequired.push(spec.name);
        } else if (spec.category === "REQUIRED_FOR_BILLING") {
          missingBilling.push(spec.name);
        } else if (spec.category === "REQUIRED_FOR_EMAIL") {
          missingEmail.push(spec.name);
        } else if (spec.category === "REQUIRED_FOR_MARKETPLACE_INTEGRATIONS") {
          missingMarketplaces.push(spec.name);
        }
      }
    }

    const isValid = missingRequired.length === 0;

    return {
      isValid,
      environment: process.env.NODE_ENV || "development",
      missingRequired,
      missingBilling,
      missingEmail,
      missingMarketplaces,
      statusMap,
    };
  }
}
