import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { StorageProvider, UploadResult } from "./index";

export class LocalStorageProvider implements StorageProvider {
  name = "local";
  private uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");

  isConfigured(): boolean {
    return true;
  }

  async upload(file: Buffer, filename: string, mimeType: string): Promise<UploadResult> {
    await fs.mkdir(this.uploadDir, { recursive: true });

    const ext = path.extname(filename) || ".png";
    const key = `avatar_${crypto.randomBytes(16).toString("hex")}${ext}`;
    const filePath = path.join(this.uploadDir, key);

    await fs.writeFile(filePath, file);

    return {
      url: `/uploads/avatars/${key}`,
      key,
      sizeBytes: file.length,
      mimeType,
    };
  }

  async delete(fileKeyOrUrl: string): Promise<boolean> {
    try {
      const key = path.basename(fileKeyOrUrl);
      const filePath = path.join(this.uploadDir, key);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
