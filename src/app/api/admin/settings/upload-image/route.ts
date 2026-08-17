import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { setSetting, type SettingKey } from "@/lib/app-settings";
import { getStorageProvider } from "@/lib/storage/factory";

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

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — branding/marketing images can be larger than an avatar
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image file exceeds 5MB limit." }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid image format. Supported formats: JPEG, PNG, WebP, GIF, SVG." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = await getStorageProvider();
    const result = await storage.upload(buffer, file.name, file.type);

    await setSetting(key as SettingKey, result.url);

    return NextResponse.json({ success: true, url: result.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload image." }, { status: 500 });
  }
}
