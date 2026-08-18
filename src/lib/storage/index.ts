export interface UploadOptions {
  folder?: string;
  prefix?: string;
  isPublic?: boolean;
}

export interface UploadResult {
  url: string;
  key: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StoredObject {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
}

export interface StorageProvider {
  name: string;
  upload(file: Buffer, filename: string, mimeType: string, options?: UploadOptions): Promise<UploadResult>;
  delete(fileKeyOrUrl: string): Promise<boolean>;
  getObject(fileKeyOrUrl: string): Promise<StoredObject | null>;
  isConfigured(): boolean;
}
