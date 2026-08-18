import type { StorageProvider } from "./index";
import { LocalStorageProvider } from "./local-storage";
import { S3StorageProvider, type S3Config } from "./s3-storage";
import { getSettings } from "@/lib/app-settings";

/** Admin-configured (AppSetting) credentials win over env vars, matching
 * every other integration in this app — credentials belong in Admin →
 * Site Settings, not hardcoded/env-only. Env vars remain a valid fallback
 * for bootstrapping a fresh environment before anyone has touched the
 * admin UI. */
async function loadS3Config(): Promise<S3Config | null> {
  const settings = await getSettings([
    "s3_bucket",
    "s3_region",
    "s3_access_key_id",
    "s3_secret_access_key",
    "s3_endpoint",
    "s3_public_base_url",
  ]);

  const bucket =
    settings.s3_bucket || process.env.R2_BUCKET || process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || "";
  const region =
    settings.s3_region || process.env.R2_REGION || process.env.AWS_S3_REGION || process.env.S3_REGION || "auto";
  const accessKeyId =
    settings.s3_access_key_id ||
    process.env.R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.S3_ACCESS_KEY_ID ||
    "";
  const secretAccessKey =
    settings.s3_secret_access_key ||
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.S3_SECRET_ACCESS_KEY ||
    "";

  // Derive R2 endpoint from account ID if full endpoint URL is omitted
  const endpoint =
    settings.s3_endpoint ||
    process.env.R2_ENDPOINT ||
    process.env.S3_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

  const publicBaseUrl =
    settings.s3_public_base_url ||
    process.env.R2_PUBLIC_BASE_URL ||
    process.env.S3_PUBLIC_BASE_URL ||
    undefined;

  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return { bucket, region, accessKeyId, secretAccessKey, endpoint, publicBaseUrl };
}

/** Not cached across requests — AppSetting-backed config can change at
 * runtime via the admin UI, and this is only called on actual upload/
 * delete operations, not hot paths. */
export async function getStorageProvider(): Promise<StorageProvider> {
  const s3Config = await loadS3Config();
  if (s3Config) {
    const s3 = new S3StorageProvider(s3Config);
    if (s3.isConfigured()) return s3;
  }
  return new LocalStorageProvider();
}
