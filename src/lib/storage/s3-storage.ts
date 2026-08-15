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

  async upload(file: Buffer, filename: string, mimeType: string): Promise<UploadResult> {
    if (!this.isConfigured()) {
      throw new Error("S3/R2 storage provider is not configured with bucket credentials.");
    }

    const ext = path.extname(filename) || ".png";
    const key = `avatars/avatar_${crypto.randomBytes(16).toString("hex")}${ext}`;

    // No ACL set: modern buckets (especially R2, and AWS's "bucket owner
    // enforced" default) reject or ignore per-object ACLs — public read
    // access must come from a bucket policy or a CDN in front of it, which
    // is on the operator to configure once, not per upload.
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
      // Upload always produces "avatars/<unique-filename>" as the key —
      // whatever URL shape wraps that (default AWS URL, custom endpoint,
      // or a public_base_url/CDN override), the filename is always the
      // last path segment, so this recovers the key regardless of shape.
      const filename = fileKeyOrUrl.split("/").filter(Boolean).pop();
      if (!filename) return false;
      const key = `avatars/${filename}`;
      await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
