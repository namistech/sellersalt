import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import path from "node:path";
import type { StorageProvider, UploadResult } from "./index";

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

    const url = this.config.publicBaseUrl
      ? `${this.config.publicBaseUrl.replace(/\/+$/, "")}/${key}`
      : this.config.endpoint
        ? `${this.config.endpoint.replace(/\/+$/, "")}/${this.config.bucket}/${key}`
        : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;

    return { url, key, sizeBytes: file.length, mimeType };
  }

  async delete(fileKeyOrUrl: string): Promise<boolean> {
    try {
      if (!fileKeyOrUrl) return false;

      // Extract key from URL or raw key path
      let key = fileKeyOrUrl;
      if (key.startsWith("http://") || key.startsWith("https://")) {
        try {
          const parsed = new URL(key);
          let pathname = parsed.pathname.replace(/^\/+/, "");
          // If pathname starts with bucket name (path style), strip bucket prefix
          if (pathname.startsWith(`${this.config.bucket}/`)) {
            pathname = pathname.substring(this.config.bucket.length + 1);
          }
          key = pathname;
        } catch {
          // Fallback to segments
          const segments = fileKeyOrUrl.split("/").filter(Boolean);
          key = segments.slice(-2).join("/");
        }
      } else if (key.startsWith("/uploads/")) {
        key = key.replace(/^\/uploads\//, "");
      }

      await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return true;
    } catch (err) {
      console.error("[S3StorageProvider:delete] Failed to delete object:", err);
      return false;
    }
  }
}
