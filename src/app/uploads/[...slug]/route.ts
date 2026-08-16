import { NextResponse } from "next/server";
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
};

// Fallback SVG avatar for missing shop / user profile assets
const FALLBACK_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#141B16"/>
  <circle cx="64" cy="50" r="22" fill="#16C784"/>
  <path d="M28 108 C28 84, 100 84, 100 108" fill="#16C784"/>
</svg>`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");

  // Prevent directory traversal by stripping directory segments and resolving strictly within uploadsDir
  const safeSegments = slug.map((s) => path.basename(s));
  const filePath = path.resolve(uploadsDir, ...safeSegments);

  // Security check: ensure filePath is strictly within uploadsDir
  if (!filePath.startsWith(uploadsDir)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // If an avatar or thumbnail fails to load, gracefully serve the fallback SVG avatar
    const isImageRequest = slug.some((s) => s.includes("avatar") || s.includes("thumb") || s.includes("logo") || s.endsWith(".png") || s.endsWith(".jpg") || s.endsWith(".svg"));
    if (isImageRequest) {
      return new NextResponse(FALLBACK_AVATAR_SVG, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    return new NextResponse("File Not Found", { status: 404 });
  }
}
