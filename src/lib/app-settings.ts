import { prisma } from "./db";
import { encrypt, decrypt } from "./encryption";

// The known settings this system currently manages. Adding a new one is just
// adding a line here — no schema migration needed, since AppSetting is a
// generic key-value store.
export const SETTING_DEFINITIONS = [
  // Application Branding & Identity
  { key: "app_name", label: "Application Name", isSecret: false },
  { key: "app_url", label: "Application Canonical Base URL", isSecret: false },
  { key: "app_logo_url", label: "App Logo (URL)", isSecret: false },
  { key: "app_favicon_url", label: "App Favicon / Icon (URL)", isSecret: false },
  { key: "app_icon_square_url", label: "Square App Icon (URL)", isSecret: false },
  { key: "extension_icon_url", label: "Browser Extension Icon (URL)", isSecret: false },
  { key: "support_email", label: "Public Support Email", isSecret: false },
  { key: "default_timezone", label: "Default System Timezone", isSecret: false },
  { key: "default_currency", label: "Default Currency Code", isSecret: false },
  { key: "app_environment", label: "Deployment Environment Descriptor", isSecret: false },
  { key: "maintenance_mode", label: "Maintenance Mode Active (true/false)", isSecret: false },
  { key: "registration_enabled", label: "User Registration Enabled (true/false)", isSecret: false },
  { key: "free_plan_enabled", label: "Free Explorer Plan Active (true/false)", isSecret: false },
  { key: "default_signup_plan", label: "Default Signup Plan Key", isSecret: false },
  { key: "default_org_behavior", label: "Default Organization Creation Behavior", isSecret: false },
  { key: "assistant_name", label: "SaltBot Assistant Display Name", isSecret: false },
  { key: "assistant_logo_url", label: "SaltBot Assistant Logo (URL)", isSecret: false },

  // SEO & Social Defaults
  { key: "seo_default_title", label: "Default SEO Meta Title", isSecret: false },
  { key: "seo_default_description", label: "Default SEO Description", isSecret: false },
  { key: "seo_canonical_url", label: "SEO Canonical Base URL Override", isSecret: false },
  { key: "seo_og_image_url", label: "OpenGraph / Social Preview Image (URL)", isSecret: false },
  { key: "seo_google_site_verification", label: "Google Search Console Verification Token", isSecret: false },
  { key: "seo_bing_site_verification", label: "Bing Webmaster Tools Verification Token", isSecret: false },
  { key: "seo_schema_org_name", label: "Structured Data Organization Name", isSecret: false },
  { key: "seo_schema_website_name", label: "Structured Data WebSite Name", isSecret: false },

  // Auth Page Artwork
  { key: "auth_page_logo_url", label: "Login/signup page logo (URL)", isSecret: false },
  { key: "auth_page_image_url", label: "Login/signup page side image (URL)", isSecret: false },
  { key: "auth_page_image_position_x", label: "Login page image horizontal position (0-100)", isSecret: false },
  { key: "auth_page_image_position_y", label: "Login page image vertical position (0-100)", isSecret: false },

  // Identity & Google OAuth Credentials
  { key: "google_client_id", label: "Google OAuth Client ID", isSecret: false },
  { key: "google_client_secret", label: "Google OAuth Client Secret", isSecret: true },

  // Marketplace: Etsy Integration Credentials
  { key: "etsy_seller_client_id", label: "Etsy Seller App Keystring (for Seller OAuth)", isSecret: false },
  { key: "etsy_seller_client_secret", label: "Etsy Seller App Shared Secret", isSecret: true },
  { key: "etsy_redirect_uri", label: "Etsy OAuth Callback Redirect URI Override", isSecret: false },
  { key: "etsy_oauth_scopes", label: "Etsy OAuth Requested Scopes Override", isSecret: false },

  // Marketplace: Amazon SP-API Credentials
  { key: "amazon_client_id", label: "Amazon SP-API Client ID (LWA)", isSecret: false },
  { key: "amazon_client_secret", label: "Amazon SP-API Client Secret (LWA)", isSecret: true },
  { key: "amazon_seller_id", label: "Amazon Seller ID / Merchant Token", isSecret: false },
  { key: "amazon_region", label: "Amazon SP-API Marketplace Region (e.g. NA, EU, FE)", isSecret: false },

  // Marketplace: Shopify Channel Credentials
  { key: "shopify_client_id", label: "Shopify Client ID / API Key", isSecret: false },
  { key: "shopify_client_secret", label: "Shopify Client Secret", isSecret: true },
  { key: "shopify_affiliate_url", label: "Shopify affiliate link", isSecret: false },
  { key: "netdrix_shopify_order_url", label: "Netdrix: order a Shopify store (URL)", isSecret: false },

  // Marketplace: TikTok Shop Channel Credentials
  { key: "tiktok_app_key", label: "TikTok Shop App Key", isSecret: false },
  { key: "tiktok_app_secret", label: "TikTok Shop App Secret", isSecret: true },
  { key: "tiktok_region", label: "TikTok Shop Region (e.g. US, UK, SEA)", isSecret: false },

  // Marketplace: eBay Channel Credentials
  { key: "ebay_app_id", label: "eBay App ID (Client ID)", isSecret: false },
  { key: "ebay_cert_id", label: "eBay Cert ID (Client Secret)", isSecret: true },
  { key: "ebay_dev_id", label: "eBay Dev ID", isSecret: false },
  { key: "ebay_ru_name", label: "eBay RuName (Redirect URL Name)", isSecret: false },

  // Marketplace: WooCommerce Channel Credentials
  { key: "woocommerce_store_url", label: "WooCommerce Store Base URL", isSecret: false },
  { key: "woocommerce_consumer_key", label: "WooCommerce Consumer Key", isSecret: false },
  { key: "woocommerce_consumer_secret", label: "WooCommerce Consumer Secret", isSecret: true },
  { key: "netdrix_woocommerce_order_url", label: "Netdrix: order a WooCommerce store (URL)", isSecret: false },

  // Marketplace: Walmart Marketplace Credentials
  { key: "walmart_client_id", label: "Walmart Marketplace Client ID", isSecret: false },
  { key: "walmart_client_secret", label: "Walmart Marketplace Client Secret", isSecret: true },

  // Productivity: Google Sheets
  { key: "google_sheets_client_id", label: "Google Sheets OAuth Client ID", isSecret: false },
  { key: "google_sheets_client_secret", label: "Google Sheets OAuth Client Secret", isSecret: true },

  // Productivity: Zapier
  { key: "zapier_client_id", label: "Zapier Client ID", isSecret: false },
  { key: "zapier_client_secret", label: "Zapier Client Secret", isSecret: true },
  { key: "zapier_webhook_url", label: "Zapier Inbound Webhook URL", isSecret: false },

  // Productivity: Make / Integromat
  { key: "make_client_id", label: "Make App Client ID", isSecret: false },
  { key: "make_client_secret", label: "Make App Client Secret", isSecret: true },
  { key: "make_webhook_url", label: "Make Webhook Hook URL", isSecret: false },

  // Productivity: Slack
  { key: "slack_client_id", label: "Slack Client ID", isSecret: false },
  { key: "slack_client_secret", label: "Slack Client Secret", isSecret: true },
  { key: "slack_bot_token", label: "Slack Bot User OAuth Token", isSecret: true },
  { key: "slack_webhook_url", label: "Slack Incoming Webhook URL", isSecret: false },

  // Productivity: Asana
  { key: "asana_client_id", label: "Asana Client ID", isSecret: false },
  { key: "asana_client_secret", label: "Asana Client Secret", isSecret: true },
  { key: "asana_access_token", label: "Asana Personal Access Token", isSecret: true },

  // Productivity: ClickUp
  { key: "clickup_client_id", label: "ClickUp Client ID", isSecret: false },
  { key: "clickup_client_secret", label: "ClickUp Client Secret", isSecret: true },
  { key: "clickup_api_token", label: "ClickUp API Token", isSecret: true },

  // Productivity: Monday.com
  { key: "monday_client_id", label: "Monday.com Client ID", isSecret: false },
  { key: "monday_client_secret", label: "Monday.com Client Secret", isSecret: true },
  { key: "monday_api_token", label: "Monday.com API Token", isSecret: true },

  // Accounting: QuickBooks Online
  { key: "quickbooks_client_id", label: "QuickBooks OAuth Client ID", isSecret: false },
  { key: "quickbooks_client_secret", label: "QuickBooks OAuth Client Secret", isSecret: true },
  { key: "quickbooks_realm_id", label: "QuickBooks Company / Realm ID", isSecret: false },

  // Accounting: Xero
  { key: "xero_client_id", label: "Xero Client ID", isSecret: false },
  { key: "xero_client_secret", label: "Xero Client Secret", isSecret: true },
  { key: "xero_tenant_id", label: "Xero Tenant ID", isSecret: false },

  // Accounting: Zoho CRM
  { key: "zoho_client_id", label: "Zoho CRM Client ID", isSecret: false },
  { key: "zoho_client_secret", label: "Zoho CRM Client Secret", isSecret: true },
  { key: "zoho_org_id", label: "Zoho Organization ID", isSecret: false },

  // CMS: WordPress
  { key: "wordpress_site_url", label: "WordPress Site REST Endpoint URL", isSecret: false },
  { key: "wordpress_app_username", label: "WordPress Application Username", isSecret: false },
  { key: "wordpress_app_password", label: "WordPress Application Password", isSecret: true },

  // AI: OpenAI
  { key: "openai_api_key", label: "OpenAI Secret API Key", isSecret: true },
  { key: "openai_org_id", label: "OpenAI Organization ID", isSecret: false },
  { key: "openai_default_model", label: "OpenAI Default Model", isSecret: false },

  // AI: Anthropic Claude
  { key: "anthropic_api_key", label: "Anthropic Claude API Key", isSecret: true },
  { key: "anthropic_default_model", label: "Anthropic Default Model", isSecret: false },

  // AI: Google Gemini
  { key: "gemini_api_key", label: "Google Gemini API Key", isSecret: true },
  { key: "gemini_default_model", label: "Google Gemini Default Model", isSecret: false },

  // AI: Model Context Protocol (MCP)
  { key: "mcp_server_url", label: "MCP Protocol Server Endpoint URL", isSecret: false },
  { key: "mcp_auth_token", label: "MCP Protocol Bearer Auth Token", isSecret: true },

  // SellerSalt University & Education Portal
  { key: "university_enabled", label: "Show SellerSalt University in Navigation (true/false)", isSecret: false },
  { key: "university_url", label: "SellerSalt University Destination URL", isSecret: false },

  // System Announcements & Alerts
  { key: "announcement_urgent_active", label: "Urgent Top Announcement Banner Active (true/false)", isSecret: false },
  { key: "announcement_urgent_text", label: "Urgent Top Announcement Banner Text", isSecret: false },
  { key: "announcement_urgent_link", label: "Urgent Top Announcement Link (URL)", isSecret: false },

  // Object Storage (Cloudflare R2 & AWS S3)
  { key: "s3_bucket", label: "S3/R2 Bucket Name", isSecret: false },
  { key: "s3_region", label: "S3/R2 Region (e.g. us-east-1, or \"auto\" for R2)", isSecret: false },
  { key: "s3_access_key_id", label: "S3/R2 Access Key ID", isSecret: false },
  { key: "s3_secret_access_key", label: "S3/R2 Secret Access Key", isSecret: true },
  { key: "s3_endpoint", label: "S3-compatible Endpoint URL (blank for real AWS S3; required for R2/Spaces/MinIO)", isSecret: false },
  { key: "s3_public_base_url", label: "Public Base URL for uploaded files (e.g. CDN domain; blank to use the bucket's default URL)", isSecret: false },

  // Abuse Prevention & Risk Configuration
  { key: "disposable_email_domains_custom", label: "Custom Disposable Email Domains List", isSecret: false },
  { key: "free_plan_allowed_domains_custom", label: "Custom Allowed Multi-Free Domains", isSecret: false },
  { key: "max_free_accounts_per_business_domain", label: "Max Free Accounts Per Business Domain", isSecret: false },
] as const;

export type SettingKey = (typeof SETTING_DEFINITIONS)[number]["key"];

export async function getSetting(key: SettingKey): Promise<string | null> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    if (!row) return null;
    return row.isSecret ? decrypt(row.value) : row.value;
  } catch {
    return null;
  }
}

export async function getSettings(keys: SettingKey[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const key of keys) result[key] = null;
  try {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: keys } } });
    for (const row of rows) {
      result[row.key] = row.isSecret ? decrypt(row.value) : row.value;
    }
  } catch {
    // Return empty defaults if database is unreachable
  }
  return result;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  const def = SETTING_DEFINITIONS.find((d) => d.key === key);
  if (!def) throw new Error(`Unknown setting key "${key}".`);

  // Normalize external URLs to include a scheme if missing, but preserve relative asset paths (/api/assets/..., /uploads/...)
  const normalized =
    key.endsWith("_url") && !/^https?:\/\//i.test(value) && !value.startsWith("/")
      ? `https://${value}`
      : value;

  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: def.isSecret ? encrypt(normalized) : normalized, isSecret: def.isSecret },
    update: { value: def.isSecret ? encrypt(normalized) : normalized },
  });
}
