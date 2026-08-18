import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { StorageProvider, UploadResult } from "./index";

export class LocalStorageProvider implements StorageProvider {
  name = "local";
  private baseDir = path.join(process.cwd(), "public", "uploads");

  isConfigured(): boolean {
    return true;
  }

  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
    options?: { folder?: string; prefix?: string; isPublic?: boolean }
  ): Promise<UploadResult> {
    const folder = (options?.folder || "uploads").replace(/^\/+|\/+$/g, "");
    const prefix = (options?.prefix || "asset").replace(/[^a-zA-Z0-9_-]/g, "");
    const ext = path.extname(filename) || ".png";
    const targetDir = path.join(this.baseDir, folder);
    await fs.mkdir(targetDir, { recursive: true });

    const key = `${folder}/${prefix}_${crypto.randomBytes(16).toString("hex")}${ext}`;
    const filenameOnly = path.basename(key);
    const filePath = path.join(targetDir, filenameOnly);

    await fs.writeFile(filePath, file);

    return {
      url: `/uploads/${key}`,
      key,
      sizeBytes: file.length,
      mimeType,
    };
  }

  async delete(fileKeyOrUrl: string): Promise<boolean> {
    try {
      if (!fileKeyOrUrl) return false;
      const cleanPath = fileKeyOrUrl.replace(/^\/uploads\//, "").replace(/^https?:\/\/[^\/]+\/uploads\//, "");
      const filePath = path.join(this.baseDir, cleanPath);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
