import { prisma } from "./db";
import { encrypt, decrypt } from "./encryption";

// The known settings this system currently manages. Adding a new one is just
// adding a line here — no schema migration needed, since AppSetting is a
// generic key-value store.
export const SETTING_DEFINITIONS = [
  { key: "shopify_client_id", label: "Shopify Client ID", isSecret: false },
  { key: "shopify_client_secret", label: "Shopify Client Secret", isSecret: true },
  { key: "shopify_affiliate_url", label: "Shopify affiliate link", isSecret: false },
  { key: "netdrix_shopify_order_url", label: "Netdrix: order a Shopify store (URL)", isSecret: false },
  { key: "netdrix_woocommerce_order_url", label: "Netdrix: order a WooCommerce store (URL)", isSecret: false },
  { key: "etsy_seller_client_id", label: "Etsy Seller App Keystring (for cross-listing)", isSecret: false },
  { key: "etsy_seller_client_secret", label: "Etsy Seller App Shared Secret", isSecret: true },
  { key: "auth_page_logo_url", label: "Login/signup page logo (URL)", isSecret: false },
  { key: "auth_page_image_url", label: "Login/signup page side image (URL)", isSecret: false },
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
