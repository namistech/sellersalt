/**
 * SellerSalt SSRF (Server-Side Request Forgery) Defense Layer
 * 
 * Validates any external URL provided by users or connectors to prevent
 * unauthorized connections to internal networks, localhost, metadata APIs
 * (169.254.169.254), or Docker internal addresses.
 */

import { URL } from "node:url";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "postgres",
  "redis",
  "coolify",
  "app",
  "web",
  "db",
]);

export interface SsrfValidationResult {
  safe: boolean;
  error?: string;
  url?: URL;
}

/**
 * Checks whether an IP address belongs to a private, loopback, link-local,
 * or cloud metadata subnet.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip) return true;

  // Normalize IPv6 representation
  const cleanIp = ip.replace(/^\[|\]$/g, "").trim();

  // IPv4 Loopback
  if (cleanIp.startsWith("127.")) return true;
  if (cleanIp === "0.0.0.0") return true;

  // IPv4 Private Class A: 10.0.0.0 - 10.255.255.255
  if (cleanIp.startsWith("10.")) return true;

  // IPv4 Private Class B: 172.16.0.0 - 172.31.255.255
  const parts = cleanIp.split(".").map(Number);
  if (parts.length === 4) {
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // IPv4 Private Class C: 192.168.0.0 - 192.168.255.255
    if (parts[0] === 192 && parts[1] === 168) return true;
    // IPv4 Link-Local / Cloud Metadata (169.254.0.0/16 - e.g. 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // Carrier-grade NAT: 100.64.0.0/10
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  }

  // IPv6 Loopback & Link-local
  if (cleanIp === "::1" || cleanIp === "::") return true;
  if (cleanIp.toLowerCase().startsWith("fe80:")) return true; // Link-local
  if (cleanIp.toLowerCase().startsWith("fc00:") || cleanIp.toLowerCase().startsWith("fd00:")) return true; // Unique local

  return false;
}

/**
 * Validates a user-supplied URL against SSRF vulnerabilities before fetching.
 */
export function validateUrlForSsrf(rawUrl: string): SsrfValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { safe: false, error: "Empty or invalid URL provided." };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { safe: false, error: "Malformed URL format." };
  }

  // Only allow HTTP and HTTPS protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      safe: false,
      error: `Disallowed URL protocol '${parsed.protocol}'. Only http: and https: are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check blocked literal hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, error: "Access to internal hostname is forbidden." };
  }

  // Check internal TLDs (.local, .internal, .lan, .corp, .docker, etc.)
  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".docker") ||
    hostname.endsWith(".test")
  ) {
    return { safe: false, error: "Access to internal network domains is forbidden." };
  }

  // Check if hostname is directly an IP address
  if (isPrivateOrReservedIp(hostname)) {
    return { safe: false, error: "Access to private or internal IP addresses is forbidden." };
  }

  return { safe: true, url: parsed };
}

export function isSafeExternalUrl(rawUrl: string): boolean {
  return validateUrlForSsrf(rawUrl).safe;
}

