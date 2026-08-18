import test from "node:test";
import assert from "node:assert/strict";
import { resolveAssetUrl, extractAssetKey } from "../lib/asset-url";
import { normalizeImageUrl } from "../components/ui/SafeImage";

test("Batch 36: Asset URL Resolution & Image Pipeline Healing", async (t) => {
  await t.test("Preserves legitimate external CDNs and OAuth avatars", () => {
    const etsyUrl = "https://i.etsystatic.com/12345/r/il/abcdef/12345_570xN.jpg";
    assert.equal(resolveAssetUrl(etsyUrl), etsyUrl);

    const googleAvatar = "https://lh3.googleusercontent.com/a/ACg8ocK12345";
    assert.equal(resolveAssetUrl(googleAvatar), googleAvatar);

    const unsplashUrl = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200";
    assert.equal(resolveAssetUrl(unsplashUrl), unsplashUrl);

    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA";
    assert.equal(resolveAssetUrl(dataUrl), dataUrl);
  });

  await t.test("Rewrites unauthenticated Cloudflare R2 S3-API URLs to streaming proxy", () => {
    const directR2Url = "https://123456789abcdef.r2.cloudflarestorage.com/sellersalt-assets/branding/app_logo_123456.png";
    const resolved = resolveAssetUrl(directR2Url);
    assert.equal(resolved, "/api/assets/branding/app_logo_123456.png");

    const directS3Url = "https://sellersalt-assets.s3.us-east-1.amazonaws.com/media/banner_test.webp";
    const resolvedS3 = resolveAssetUrl(directS3Url);
    assert.equal(resolvedS3, "/api/assets/media/banner_test.webp");
  });

  await t.test("Heals corrupted database URLs (triple slash, bare domain prefixing)", () => {
    const tripleSlashUploads = "https:///uploads/branding/app_logo_98765.png";
    assert.equal(resolveAssetUrl(tripleSlashUploads), "/api/assets/branding/app_logo_98765.png");

    const bareUploads = "https://uploads/branding/app_logo_98765.png";
    assert.equal(resolveAssetUrl(bareUploads), "/api/assets/branding/app_logo_98765.png");

    const tripleSlashApi = "https:///api/assets/avatars/user_123.jpg";
    assert.equal(resolveAssetUrl(tripleSlashApi), "/api/assets/avatars/user_123.jpg");
  });

  await t.test("Rewrites local /uploads/ paths to canonical streaming /api/assets/ endpoint", () => {
    const localPath = "/uploads/branding/app_logo_abc.png";
    assert.equal(resolveAssetUrl(localPath), "/api/assets/branding/app_logo_abc.png");
  });

  await t.test("Resolves raw object keys into valid streaming endpoints", () => {
    const rawKey = "branding/app_favicon_123.ico";
    assert.equal(resolveAssetUrl(rawKey), "/api/assets/branding/app_favicon_123.ico");

    const avatarKey = "avatars/user_avatar_456.webp";
    assert.equal(resolveAssetUrl(avatarKey), "/api/assets/avatars/user_avatar_456.webp");
  });

  await t.test("Extracts clean object keys across all storage formats", () => {
    assert.equal(extractAssetKey("/api/assets/branding/app_logo_123.png"), "branding/app_logo_123.png");
    assert.equal(extractAssetKey("/uploads/media/hero.jpg"), "media/hero.jpg");
    assert.equal(extractAssetKey("https://account.r2.cloudflarestorage.com/sellersalt-assets/avatars/u1.png"), "avatars/u1.png");
  });

  await t.test("SafeImage normalizeImageUrl seamlessly uses canonical resolver", () => {
    const r2Url = "https://account.r2.cloudflarestorage.com/sellersalt-assets/branding/app_logo_test.png";
    assert.equal(normalizeImageUrl(r2Url), "/api/assets/branding/app_logo_test.png");
  });
});
