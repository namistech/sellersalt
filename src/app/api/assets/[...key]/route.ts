import { NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage/factory";
import fs from "node:fs/promises";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

// Fallback SVG avatar for missing/broken profile or brand assets
const FALLBACK_ASSET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#141B16"/>
  <circle cx="64" cy="50" r="22" fill="#16C784"/>
  <path d="M28 108 C28 84, 100 84, 100 108" fill="#16C784"/>
</svg>`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  if (!key || key.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Sanitize path segments against directory traversal attacks
  const rawKey = key.join("/");
  const safeSegments = key.map((s) => path.basename(s));
  const normalizedKey = safeSegments.join("/");

  try {
    const storage = await getStorageProvider();
    const result = await storage.getObject(normalizedKey);

    if (result && result.buffer) {
      return new NextResponse(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
          "Content-Type": result.mimeType,
          "Content-Length": String(result.sizeBytes),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Secondary fallback to local public/uploads directory if storage provider missed it
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const localFilePath = path.resolve(uploadsDir, ...safeSegments);

    if (localFilePath.startsWith(uploadsDir)) {
      try {
        const fileBuffer = await fs.readFile(localFilePath);
        const ext = path.extname(localFilePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        return new NextResponse(new Uint8Array(fileBuffer), {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(fileBuffer.length),
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch {
        // Continue to fallback
      }
    }

    // Graceful fallback for image requests
    const isImageRequest = key.some(
      (s) =>
        s.includes("avatar") ||
        s.includes("thumb") ||
        s.includes("logo") ||
        s.endsWith(".png") ||
        s.endsWith(".jpg") ||
        s.endsWith(".webp") ||
        s.endsWith(".svg")
    );

    if (isImageRequest) {
      return new NextResponse(FALLBACK_ASSET_SVG, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    return new NextResponse("Asset Not Found", { status: 404 });
  } catch (err: any) {
    console.error("[api/assets] Error streaming asset key:", rawKey, err);
    return new NextResponse("Error retrieving asset", { status: 500 });
  }
}
