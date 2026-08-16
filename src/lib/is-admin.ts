// Deliberately simple for now — an env-var allowlist rather than a full RBAC
// system. Fine while there's one founder managing packages; worth replacing
// with a real role system once there's a team behind SellerSalt itself.
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  const allowlist = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
