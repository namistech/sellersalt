import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { StorageProvider, UploadResult, StoredObject } from "./index";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export class LocalStorageProvider implements StorageProvider {
  name = "local";
  private baseDir = path.join(process.cwd(), "public", "uploads");

  isConfigured(): boolean {
    return true;
  }

  private extractKey(fileKeyOrUrl: string): string {
    if (!fileKeyOrUrl) return "";
    let key = fileKeyOrUrl.trim();
    if (key.startsWith("/api/assets/")) return key.replace(/^\/api\/assets\//, "");
    if (key.startsWith("/uploads/")) return key.replace(/^\/uploads\//, "");
    return key.replace(/^\/+/, "");
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
      url: `/api/assets/${key}`,
      key,
      sizeBytes: file.length,
      mimeType,
    };
  }

  async getObject(fileKeyOrUrl: string): Promise<StoredObject | null> {
    const key = this.extractKey(fileKeyOrUrl);
    if (!key) return null;
    const filePath = path.join(this.baseDir, key);

    try {
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || "application/octet-stream";
      return {
        buffer,
        mimeType,
        sizeBytes: buffer.length,
      };
    } catch {
      return null;
    }
  }

  async delete(fileKeyOrUrl: string): Promise<boolean> {
    try {
      if (!fileKeyOrUrl) return false;
      const key = this.extractKey(fileKeyOrUrl);
      const filePath = path.join(this.baseDir, key);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
