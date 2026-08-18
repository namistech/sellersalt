/**
 * SellerSalt Canonical Asset URL Resolver
 * 
 * Single source of truth for resolving any image or asset reference
 * into a valid, browser-accessible URL.
 * 
 * Handles:
 * - External HTTPS URLs (Etsy, Google, GitHub, Unsplash) -> preserved
 * - CDN URLs (https://assets.sellersalt.com/..., https://pub-xxx.r2.dev/...) -> preserved
 * - Cloudflare R2 direct S3 API URLs (*.r2.cloudflarestorage.com) -> rewritten to /api/assets/${key}
 * - AWS S3 direct API URLs (*.s3.*.amazonaws.com) -> rewritten to /api/assets/${key}
 * - Local /uploads/... paths -> rewritten to /api/assets/${key}
 * - Raw storage keys (branding/logo_xxx.png, avatars/xxx.png) -> rewritten to /api/assets/${key}
 */

export function resolveAssetUrl(urlOrKey?: string | null): string | null {
  if (!urlOrKey || typeof urlOrKey !== "string") return null;
  const trimmed = urlOrKey.trim();
  if (!trimmed) return null;

  // 1. Legitimate external CDNs and media services — pass directly
  if (
    trimmed.startsWith("https://i.etsystatic.com") ||
    trimmed.startsWith("https://img0.etsystatic.com") ||
    trimmed.startsWith("https://img1.etsystatic.com") ||
    trimmed.startsWith("https://lh3.googleusercontent.com") ||
    trimmed.startsWith("https://avatars.githubusercontent.com") ||
    trimmed.startsWith("https://images.unsplash.com") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  // 2. Protocol-relative or HTTP upgrades for secure contexts
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  // Heal corrupted triple-slash or double-prefixed URLs (e.g. https:///uploads/..., https://uploads/..., https:///api/assets/...)
  if (trimmed.startsWith("https:///uploads/") || trimmed.startsWith("http:///uploads/")) {
    const key = trimmed.replace(/^https?:\/\/\/uploads\//, "");
    return `/api/assets/${key}`;
  }
  if (trimmed.startsWith("https://uploads/") || trimmed.startsWith("http://uploads/")) {
    const key = trimmed.replace(/^https?:\/\/uploads\//, "");
    return `/api/assets/${key}`;
  }
  if (trimmed.startsWith("https:///api/assets/") || trimmed.startsWith("http:///api/assets/")) {
    const key = trimmed.replace(/^https?:\/\/\/api\/assets\//, "");
    return `/api/assets/${key}`;
  }

  if (trimmed.startsWith("http://") && !trimmed.includes("localhost") && !trimmed.includes("127.0.0.1")) {
    return `https://${trimmed.slice(7)}`;
  }

  // 3. Direct R2 / S3 S3-API endpoints (which require SigV4 authentication and fail in public browser <img> tags)
  // Example: https://<account-id>.r2.cloudflarestorage.com/<bucket>/<key> or https://<bucket>.s3.<region>.amazonaws.com/<key>
  if (
    trimmed.includes(".r2.cloudflarestorage.com") ||
    trimmed.includes(".s3.") ||
    trimmed.includes(".s3-") ||
    trimmed.includes(".amazonaws.com")
  ) {
    try {
      const parsed = new URL(trimmed);
      let pathname = parsed.pathname.replace(/^\/+/, "");
      const segments = pathname.split("/").filter(Boolean);

      // If URL format is path-style (/bucket/folder/key), strip bucket name
      let key = pathname;
      if (segments.length >= 2 && (segments[0] === "sellersalt-assets" || segments[0].includes("bucket") || segments[0].includes("assets"))) {
        key = segments.slice(1).join("/");
      }

      // Check if custom public CDN is configured in env
      const publicBase = process.env.NEXT_PUBLIC_R2_URL || process.env.R2_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL;
      if (publicBase && !publicBase.includes("r2.cloudflarestorage.com")) {
        return `${publicBase.replace(/\/+$/, "")}/${key}`;
      }

      return `/api/assets/${key}`;
    } catch {
      // Fallback
    }
  }

  // 4. Local uploads path (/uploads/folder/key) -> route to streaming asset endpoint
  if (trimmed.startsWith("/uploads/")) {
    const key = trimmed.replace(/^\/uploads\//, "");
    return `/api/assets/${key}`;
  }

  // 5. Existing canonical asset route
  if (trimmed.startsWith("/api/assets/")) {
    return trimmed;
  }

  // 6. Direct public CDN URLs with custom domains (e.g. assets.sellersalt.com, r2.dev)
  if (
    trimmed.startsWith("https://assets.sellersalt.com") ||
    trimmed.startsWith("https://cdn.sellersalt.com") ||
    trimmed.includes(".r2.dev")
  ) {
    return trimmed;
  }

  // 7. Relative root path (e.g. /icon.png, /apple-icon.png, /logo.svg)
  if (trimmed.startsWith("/") && !trimmed.startsWith("/uploads/")) {
    return trimmed;
  }

  // 8. Raw object keys (e.g. "branding/app_logo_xxx.webp", "avatars/avatar_xxx.png", "media/hero.jpg")
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    const publicBase = process.env.NEXT_PUBLIC_R2_URL || process.env.R2_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL;
    if (publicBase && !publicBase.includes("r2.cloudflarestorage.com")) {
      return `${publicBase.replace(/\/+$/, "")}/${trimmed.replace(/^\/+/, "")}`;
    }
    return `/api/assets/${trimmed.replace(/^\/+/, "")}`;
  }

  return trimmed;
}

/**
 * Extracts raw object key from any stored URL or key reference.
 */
export function extractAssetKey(urlOrKey: string): string {
  if (!urlOrKey) return "";
  let clean = urlOrKey.trim();

  if (clean.startsWith("/api/assets/")) {
    return clean.replace(/^\/api\/assets\//, "");
  }
  if (clean.startsWith("/uploads/")) {
    return clean.replace(/^\/uploads\//, "");
  }

  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const parsed = new URL(clean);
      let pathname = parsed.pathname.replace(/^\/+/, "");
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length >= 2 && (segments[0] === "sellersalt-assets" || segments[0].includes("bucket") || segments[0].includes("assets"))) {
        return segments.slice(1).join("/");
      }
      return pathname;
    } catch {
      const segments = clean.split("/").filter(Boolean);
      return segments.slice(-2).join("/");
    }
  }

  return clean.replace(/^\/+/, "");
}
