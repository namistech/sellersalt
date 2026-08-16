import { prisma } from "./db";
import { encrypt, decrypt } from "./encryption";

// The known settings this system currently manages. Adding a new one is just
// adding a line here — no schema migration needed, since AppSetting is a
// generic key-value store.
export const SETTING_DEFINITIONS = [
  // Application Branding & Identity
  { key: "app_name", label: "Application Name", isSecret: false },
  { key: "app_logo_url", label: "App Logo (URL)", isSecret: false },
  { key: "app_favicon_url", label: "App Favicon / Icon (URL)", isSecret: false },
  { key: "support_email", label: "Public Support Email", isSecret: false },
  { key: "assistant_name", label: "SaltBot Assistant Display Name", isSecret: false },
  { key: "assistant_logo_url", label: "SaltBot Assistant Logo (URL)", isSecret: false },

  // SEO & Social Defaults
  { key: "seo_default_title", label: "Default SEO Meta Title", isSecret: false },
  { key: "seo_default_description", label: "Default SEO Description", isSecret: false },
  { key: "seo_og_image_url", label: "OpenGraph / Social Preview Image (URL)", isSecret: false },

  // Auth Page Artwork
  { key: "auth_page_logo_url", label: "Login/signup page logo (URL)", isSecret: false },
  { key: "auth_page_image_url", label: "Login/signup page side image (URL)", isSecret: false },

  // SellerSalt University & Education Portal
  { key: "university_enabled", label: "Show SellerSalt University in Navigation (true/false)", isSecret: false },
  { key: "university_url", label: "SellerSalt University Destination URL", isSecret: false },

  // System Announcements & Alerts
  { key: "announcement_urgent_active", label: "Urgent Top Announcement Banner Active (true/false)", isSecret: false },
  { key: "announcement_urgent_text", label: "Urgent Top Announcement Banner Text", isSecret: false },
  { key: "announcement_urgent_link", label: "Urgent Top Announcement Link (URL)", isSecret: false },

  // Etsy Integration Credentials
  { key: "etsy_seller_client_id", label: "Etsy Seller App Keystring (for Seller OAuth)", isSecret: false },
  { key: "etsy_seller_client_secret", label: "Etsy Seller App Shared Secret", isSecret: true },

  // SaltBot LLM provider credentials (OpenRouter/NVIDIA/Gemini/OpenAI) used
  // to live here as generic AppSetting rows. Superseded by the dedicated
  // AiProvider table (migration 20260815203713_add_ai_provider_model_
  // registry, which also migrated any already-configured key over) — that
  // table also tracks status/priority/model selection, which a plain
  // key-value row can't. See src/lib/ai-providers.ts.

  // Secondary Channel Credentials
  { key: "shopify_client_id", label: "Shopify Client ID", isSecret: false },
  { key: "shopify_client_secret", label: "Shopify Client Secret", isSecret: true },
  { key: "shopify_affiliate_url", label: "Shopify affiliate link", isSecret: false },
  { key: "netdrix_shopify_order_url", label: "Netdrix: order a Shopify store (URL)", isSecret: false },
  { key: "netdrix_woocommerce_order_url", label: "Netdrix: order a WooCommerce store (URL)", isSecret: false },

  // Object Storage (avatars and other uploads). Without this, uploads fall
  // back to local container disk, which does NOT survive a redeploy —
  // configure this before relying on avatar uploads in production.
  { key: "s3_bucket", label: "S3/R2 Bucket Name", isSecret: false },
  { key: "s3_region", label: "S3/R2 Region (e.g. us-east-1, or \"auto\" for R2)", isSecret: false },
  { key: "s3_access_key_id", label: "S3/R2 Access Key ID", isSecret: false },
  { key: "s3_secret_access_key", label: "S3/R2 Secret Access Key", isSecret: true },
  { key: "s3_endpoint", label: "S3-compatible Endpoint URL (blank for real AWS S3; required for R2/Spaces/MinIO)", isSecret: false },
  { key: "s3_public_base_url", label: "Public Base URL for uploaded files (e.g. CDN domain; blank to use the bucket's default URL)", isSecret: false },
] as const;

export type SettingKey = (typeof SETTING_DEFINITIONS)[number]["key"];

export async function getSetting(key: SettingKey): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) return null;
  return row.isSecret ? decrypt(row.value) : row.value;
}

export async function getSettings(keys: SettingKey[]): Promise<Record<string, string | null>> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: keys } } });
  const result: Record<string, string | null> = {};
  for (const key of keys) result[key] = null;
  for (const row of rows) {
    result[row.key] = row.isSecret ? decrypt(row.value) : row.value;
  }
  return result;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  const def = SETTING_DEFINITIONS.find((d) => d.key === key);
  if (!def) throw new Error(`Unknown setting key "${key}".`);

  // A saved value like "shopify.pxf.io/9gO2v3" (no protocol) renders as a
  // broken relative link in <a href>. Normalize any *_url key to always have
  // a scheme, so a bare-domain paste can't silently break a button later.
  const normalized =
    key.endsWith("_url") && !/^https?:\/\//i.test(value) ? `https://${value}` : value;

  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: def.isSecret ? encrypt(normalized) : normalized, isSecret: def.isSecret },
    update: { value: def.isSecret ? encrypt(normalized) : normalized },
  });
}
