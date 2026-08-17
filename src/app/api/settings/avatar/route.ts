import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage/factory";
import { validateAndSanitizeImage } from "@/lib/file-validation";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateCheck = checkRateLimit(`avatar:${userId}`, "DEFAULT");
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Too many upload attempts. Please wait a moment." },
      { status: 429, headers: rateCheck.headers }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());

    const validation = validateAndSanitizeImage(rawBuffer, file.type, MAX_SIZE_BYTES);
    if (!validation.valid || !validation.sanitizedBuffer) {
      return NextResponse.json(
        { error: validation.error || "Invalid image format." },
        { status: 400 }
      );
    }

    const storage = await getStorageProvider();
    const result = await storage.upload(validation.sanitizedBuffer, file.name, validation.detectedMime || file.type);

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
      const storage = await getStorageProvider();
      await storage.delete(setting.value);
      await prisma.appSetting.delete({ where: { key: settingKey } });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to remove avatar." }, { status: 500 });
  }
}
