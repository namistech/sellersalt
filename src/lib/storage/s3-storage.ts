import type { StorageProvider, UploadResult } from "./index";

export class S3StorageProvider implements StorageProvider {
  name = "s3";

  isConfigured(): boolean {
    return Boolean(
      process.env.AWS_S3_BUCKET ||
      process.env.S3_BUCKET ||
      process.env.R2_BUCKET
    );
  }

  async upload(_file: Buffer, _filename: string, _mimeType: string): Promise<UploadResult> {
    if (!this.isConfigured()) {
      throw new Error("S3/R2 storage provider is not configured with bucket credentials.");
    }
    // S3/R2 client integration point
    throw new Error("S3/R2 client requires active AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY credentials.");
  }

  async delete(_fileKeyOrUrl: string): Promise<boolean> {
    return false;
  }
}
