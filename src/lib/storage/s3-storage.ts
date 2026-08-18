import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import path from "node:path";
import type { StorageProvider, UploadResult, StoredObject } from "./index";

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Set for S3-compatible providers (Cloudflare R2, DigitalOcean Spaces,
   * MinIO). Leave unset for real AWS S3. */
  endpoint?: string;
  /** Overrides the derived public URL — set this to a CDN/custom domain
   * in front of the bucket. */
  publicBaseUrl?: string;
}

export class S3StorageProvider implements StorageProvider {
  name = "s3";
  private config: S3Config;
  private client: S3Client;

  constructor(config: S3Config) {
    this.config = config;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    });
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.bucket && this.config.region && this.config.accessKeyId && this.config.secretAccessKey
    );
  }

  private extractKey(fileKeyOrUrl: string): string {
    if (!fileKeyOrUrl) return "";
    let key = fileKeyOrUrl.trim();

    if (key.startsWith("/api/assets/")) {
      return key.replace(/^\/api\/assets\//, "");
    }
    if (key.startsWith("/uploads/")) {
      return key.replace(/^\/uploads\//, "");
    }

    if (key.startsWith("http://") || key.startsWith("https://")) {
      try {
        const parsed = new URL(key);
        let pathname = parsed.pathname.replace(/^\/+/, "");
        if (pathname.startsWith(`${this.config.bucket}/`)) {
          pathname = pathname.substring(this.config.bucket.length + 1);
        }
        return pathname;
      } catch {
        const segments = key.split("/").filter(Boolean);
        return segments.slice(-2).join("/");
      }
    }

    return key.replace(/^\/+/, "");
  }

  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
    options?: { folder?: string; prefix?: string; isPublic?: boolean }
  ): Promise<UploadResult> {
    if (!this.isConfigured()) {
      throw new Error("S3/R2 storage provider is not configured with bucket credentials.");
    }

    const folder = (options?.folder || "uploads").replace(/^\/+|\/+$/g, "");
    const prefix = (options?.prefix || "asset").replace(/[^a-zA-Z0-9_-]/g, "");
    const ext = path.extname(filename) || ".png";
    const key = `${folder}/${prefix}_${crypto.randomBytes(16).toString("hex")}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      })
    );

    const url = this.config.publicBaseUrl && !this.config.publicBaseUrl.includes("r2.cloudflarestorage.com")
      ? `${this.config.publicBaseUrl.replace(/\/+$/, "")}/${key}`
      : `/api/assets/${key}`;

    return { url, key, sizeBytes: file.length, mimeType };
  }

  async getObject(fileKeyOrUrl: string): Promise<StoredObject | null> {
    if (!this.isConfigured()) return null;
    const key = this.extractKey(fileKeyOrUrl);
    if (!key) return null;

    try {
      const res = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        })
      );

      if (!res.Body) return null;
      const byteArray = await res.Body.transformToByteArray();
      const buffer = Buffer.from(byteArray);
      const mimeType = res.ContentType || "application/octet-stream";

      return {
        buffer,
        mimeType,
        sizeBytes: buffer.length,
      };
    } catch (err) {
      console.error("[S3StorageProvider:getObject] Error fetching key:", key, err);
      return null;
    }
  }

  async delete(fileKeyOrUrl: string): Promise<boolean> {
    try {
      if (!fileKeyOrUrl) return false;
      const key = this.extractKey(fileKeyOrUrl);
      if (!key) return false;

      await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return true;
    } catch (err) {
      console.error("[S3StorageProvider:delete] Failed to delete object:", err);
      return false;
    }
  }
}
