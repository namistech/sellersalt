import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { setSetting, type SettingKey } from "@/lib/app-settings";
import { getStorageProvider } from "@/lib/storage/factory";
import { validateAndSanitizeImage } from "@/lib/file-validation";
import { checkRateLimit } from "@/lib/rate-limit";

// Only these AppSetting keys represent an actual image asset — an admin
// can't point this upload endpoint at an arbitrary setting key (e.g. a
// credential or plain URL field) even though AppSetting itself is a
// generic key-value store.
const IMAGE_SETTING_KEYS: SettingKey[] = [
  "app_logo_url",
  "app_favicon_url",
  "assistant_logo_url",
  "seo_og_image_url",
  "auth_page_logo_url",
  "auth_page_image_url",
];

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — branding/marketing images

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return {
    isAdmin: isAdminEmail(session?.user?.email),
    email: session?.user?.email,
  };
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateCheck = checkRateLimit(admin.email || "admin", "ADMIN");
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before uploading again." },
      { status: 429, headers: rateCheck.headers }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const key = formData.get("key") as string | null;

    if (!key || !IMAGE_SETTING_KEYS.includes(key as SettingKey)) {
      return NextResponse.json({ error: "Unknown or non-image setting key." }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());

    // Comprehensive Magic-Bytes, MIME & SVG sanitization check
    const validation = validateAndSanitizeImage(rawBuffer, file.type, MAX_SIZE_BYTES);
    if (!validation.valid || !validation.sanitizedBuffer) {
      return NextResponse.json(
        { error: validation.error || "Image failed security validation." },
        { status: 400 }
      );
    }

    const storage = await getStorageProvider();
    const result = await storage.upload(validation.sanitizedBuffer, file.name, validation.detectedMime || file.type);

    await setSetting(key as SettingKey, result.url);

    return NextResponse.json({ success: true, url: result.url });
  } catch (err: any) {
    console.error("Admin image upload failed:", err);
    return NextResponse.json({ error: err.message || "Failed to upload image." }, { status: 500 });
  }
}
