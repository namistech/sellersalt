/**
 * SellerSalt File & Image Security Validation Layer
 * 
 * Enforces magic-byte verification, MIME type restrictions, and strict
 * SVG sanitization to prevent XSS payloads in uploaded vector graphics.
 */

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export interface FileValidationResult {
  valid: boolean;
  sanitizedBuffer?: Buffer;
  error?: string;
  detectedMime?: string;
}

/**
 * Validates file magic bytes to verify actual content matches declared format.
 */
export function verifyImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47 (0x89 'P' 'N' 'G')
  if (mimeType === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }

  // GIF: 47 49 46 38 ('G' 'I' 'F' '8')
  if (mimeType === "image/gif") {
    return (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    );
  }

  // WebP: RIFF ... WEBP (0x52 0x49 0x46 0x46 ... 0x57 0x45 0x42 0x50)
  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  // ICO: 00 00 01 00
  if (mimeType === "image/x-icon" || mimeType === "image/vnd.microsoft.icon") {
    return buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00;
  }

  // SVG: Handled separately via string parsing and sanitization
  if (mimeType === "image/svg+xml") {
    const text = buffer.toString("utf-8", 0, Math.min(buffer.length, 500)).toLowerCase();
    return text.includes("<svg") || text.includes("<?xml");
  }

  return false;
}

/**
 * Sanitizes SVG content by stripping executable scripts, event handlers,
 * iframe tags, and external entity injections.
 */
export function sanitizeSvg(svgContent: string): { safe: boolean; sanitized?: string; error?: string } {
  if (!svgContent || typeof svgContent !== "string") {
    return { safe: false, error: "Empty SVG content." };
  }

  // Check for XML entity expansion / XXE bombs
  if (/<!entity/i.test(svgContent) || /<!doctype.*system/i.test(svgContent)) {
    return { safe: false, error: "SVG contains disallowed XML entity declarations." };
  }

  let cleaned = svgContent;

  // Remove <script>...</script> tags entirely
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove <foreignObject> tags (often used to embed HTML/JS)
  cleaned = cleaned.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, "");

  // Remove <iframe, <object, <embed, <applet tags
  cleaned = cleaned.replace(/<(iframe|object|embed|applet)\b[^>]*>(.*?<\/\1>)?/gi, "");

  // Remove inline JS event handlers: onclick, onload, onerror, onmouseover, etc.
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Remove javascript: and data:text/html URLs in href or xlink:href
  cleaned = cleaned.replace(/href\s*=\s*["']?\s*(?:javascript|data:text\/html):[^"'\s>]*/gi, 'href=""');
  cleaned = cleaned.replace(/xlink:href\s*=\s*["']?\s*(?:javascript|data:text\/html):[^"'\s>]*/gi, 'xlink:href=""');

  // Verify that it still contains a valid <svg tag
  if (!/<svg\b[^>]*>/i.test(cleaned)) {
    return { safe: false, error: "SVG content did not contain a valid <svg> root element." };
  }

  return { safe: true, sanitized: cleaned };
}

export function sanitizeSvgContent(svgContent: string): string {
  const res = sanitizeSvg(svgContent);
  return res.sanitized || "";
}


/**
 * Validates and sanitizes an uploaded image buffer.
 */
export function validateAndSanitizeImage(
  buffer: Buffer,
  declaredMimeType: string,
  maxSizeBytes = 5 * 1024 * 1024
): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "File buffer is empty." };
  }

  if (buffer.length > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${Math.round(maxSizeBytes / (1024 * 1024))}MB limit.` };
  }

  const mime = declaredMimeType.toLowerCase().trim();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
    return {
      valid: false,
      error: `Unsupported format '${mime}'. Supported: JPEG, PNG, WebP, GIF, SVG, ICO.`,
    };
  }

  // Magic bytes check
  if (!verifyImageMagicBytes(buffer, mime)) {
    return {
      valid: false,
      error: "File header does not match declared image type. Potential spoofing detected.",
    };
  }

  // If SVG, perform content sanitization
  if (mime === "image/svg+xml") {
    const rawSvg = buffer.toString("utf-8");
    const result = sanitizeSvg(rawSvg);
    if (!result.safe || !result.sanitized) {
      return { valid: false, error: result.error || "SVG failed security sanitization." };
    }
    return {
      valid: true,
      sanitizedBuffer: Buffer.from(result.sanitized, "utf-8"),
      detectedMime: mime,
    };
  }

  return {
    valid: true,
    sanitizedBuffer: buffer,
    detectedMime: mime,
  };
}
