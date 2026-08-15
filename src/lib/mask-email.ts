// "aliyan@sellersalt.com" -> "a****@sellersalt.com". Never reveal more than
// the first character of the local part — used on the verification-required
// screen so a logged-in-but-unverified user can confirm which inbox to check
// without a screen-share or shoulder-surf leaking the full address.
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(local.length - 1, 4))}@${domain}`;
}
