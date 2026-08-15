export interface UploadResult {
  url: string;
  key: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StorageProvider {
  name: string;
  upload(file: Buffer, filename: string, mimeType: string): Promise<UploadResult>;
  delete(fileKeyOrUrl: string): Promise<boolean>;
  isConfigured(): boolean;
}
