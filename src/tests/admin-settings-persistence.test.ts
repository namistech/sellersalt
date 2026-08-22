import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import {
  SETTING_DEFINITIONS,
  getSetting,
  getSettings,
  setSetting,
  ensureDefaultSettings,
  type SettingKey,
} from "@/lib/app-settings";

test("Admin Settings Persistence: Setting a value persists to database and survives simulated redeploy / defaults check", async () => {
  // 1. Manually set custom branding and secret settings
  await setSetting("app_name", "SellerSalt Custom Enterprise");
  await setSetting("seo_default_title", "Custom SEO Title for High Volume Sellers");
  await setSetting("google_ads_developer_token", "dev_token_secret_12345");

  // Verify direct retrieval from database
  const appName = await getSetting("app_name");
  const seoTitle = await getSetting("seo_default_title");
  const devToken = await getSetting("google_ads_developer_token");

  assert.equal(appName, "SellerSalt Custom Enterprise");
  assert.equal(seoTitle, "Custom SEO Title for High Volume Sellers");
  assert.equal(devToken, "dev_token_secret_12345");

  // Verify that raw database value for secret is encrypted
  const rawDevTokenRow = await prisma.appSetting.findUnique({
    where: { key: "google_ads_developer_token" },
  });
  assert.ok(rawDevTokenRow);
  assert.equal(rawDevTokenRow.isSecret, true);
  assert.notEqual(rawDevTokenRow.value, "dev_token_secret_12345", "Secret must be encrypted at rest");
  const decodedBuf = Buffer.from(rawDevTokenRow.value, "base64");
  assert.ok(decodedBuf.length >= 28, "Encrypted secret must be valid base64 with iv + authTag + ciphertext");

  // 2. Simulate redeploy / boot-up default initialization
  await ensureDefaultSettings({
    app_name: "Default App Name Placeholder",
    seo_default_title: "Default SEO Placeholder",
    google_ads_developer_token: "default_dev_token",
    support_email: "support@sellersalt.com",
  });

  // Verify that existing settings were NOT overwritten
  const preservedAppName = await getSetting("app_name");
  const preservedSeoTitle = await getSetting("seo_default_title");
  const preservedDevToken = await getSetting("google_ads_developer_token");

  assert.equal(
    preservedAppName,
    "SellerSalt Custom Enterprise",
    "Manually configured app_name must survive defaults check without being overwritten"
  );
  assert.equal(
    preservedSeoTitle,
    "Custom SEO Title for High Volume Sellers",
    "Manually configured seo_default_title must survive defaults check without being overwritten"
  );
  assert.equal(
    preservedDevToken,
    "dev_token_secret_12345",
    "Manually configured google_ads_developer_token must survive defaults check without being overwritten"
  );

  // Genuinely missing setting was populated
  const populatedSupportEmail = await getSetting("support_email");
  assert.equal(populatedSupportEmail, "support@sellersalt.com");
});

test("Admin Settings Persistence: getSettings batch retrieval returns decrypted secrets and plain values accurately", async () => {
  await setSetting("app_url", "https://sellersalt.com");
  await setSetting("google_client_secret", "google_secret_998877");

  const results = await getSettings(["app_url", "google_client_secret", "maintenance_mode"]);

  assert.equal(results.app_url, "https://sellersalt.com");
  assert.equal(results.google_client_secret, "google_secret_998877");
  assert.equal(results.maintenance_mode, null);
});
