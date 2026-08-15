import type { StorageProvider } from "./index";
import { LocalStorageProvider } from "./local-storage";
import { S3StorageProvider } from "./s3-storage";

let providerInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (providerInstance) return providerInstance;

  const s3 = new S3StorageProvider();
  if (s3.isConfigured()) {
    providerInstance = s3;
  } else {
    providerInstance = new LocalStorageProvider();
  }

  return providerInstance;
}
