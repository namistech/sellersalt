import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage/factory";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image file exceeds 2MB limit." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid image format. Supported formats: JPEG, PNG, WebP." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorageProvider();
    const result = await storage.upload(buffer, file.name, file.type);

    const settingKey = `user_avatar_${userId}`;
    await prisma.appSetting.upsert({
      where: { key: settingKey },
      create: { key: settingKey, value: result.url, isSecret: false },
      update: { value: result.url },
    });

    return NextResponse.json({ success: true, avatarUrl: result.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload avatar." }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settingKey = `user_avatar_${userId}`;
    const setting = await prisma.appSetting.findUnique({ where: { key: settingKey } });

    if (setting?.value) {
      const storage = getStorageProvider();
      await storage.delete(setting.value);
      await prisma.appSetting.delete({ where: { key: settingKey } });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to remove avatar." }, { status: 500 });
  }
}
