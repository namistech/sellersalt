// Shared WebAuthn Relying Party config. Deliberately built from
// NEXTAUTH_URL, never from request headers — same reasoning as the Etsy
// OAuth fix (see CLAUDE.md's Lessons Learned): behind Coolify's proxy,
// header-derived values can reflect the container's internal address
// rather than the public domain. For WebAuthn this isn't just unreliable,
// it's actively unsafe — rpID and origin are cryptographically bound into
// every credential; a wrong value here doesn't just break the flow, it
// can silently produce credentials that only validate against the wrong
// origin.

function appUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.APP_URL;
  if (!url) throw new Error("NEXTAUTH_URL is required to configure WebAuthn.");
  return url.replace(/\/+$/, "");
}

/** The Relying Party ID — the domain (no scheme/port) credentials are
 * bound to. Must exactly match the domain in the browser's address bar. */
export function rpID(): string {
  return new URL(appUrl()).hostname;
}

/** The full origin the browser must report for a ceremony to be
 * considered valid. */
export function expectedOrigin(): string {
  return new URL(appUrl()).origin;
}

export const rpName = "SellerSalt";
