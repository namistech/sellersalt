// Shared password strength policy — single source of truth for both the
// signup form's immediate client-side feedback (checkout-client.tsx) and
// the authoritative server-side check (POST /api/signup). Never logs the
// password itself — only ever returns which named rules failed.

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

const MIN_LENGTH = 8;

// A small, practical blocklist of extremely common passwords — not an
// exhaustive breach-corpus lookup (a different, much larger feature),
// just enough to stop the handful of choices that would otherwise defeat
// the point of the rules below.
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "password1!",
  "12345678",
  "123456789",
  "qwerty123",
  "letmein1",
  "welcome123",
  "admin1234",
  "iloveyou1",
  "sellersalt",
  "sellersalt1",
]);

export function checkPasswordStrength(password: string): PasswordPolicyResult {
  const value = password || "";
  const errors: string[] = [];

  if (value.length < MIN_LENGTH) errors.push(`At least ${MIN_LENGTH} characters`);
  if (!/[a-z]/.test(value)) errors.push("A lowercase letter");
  if (!/[A-Z]/.test(value)) errors.push("An uppercase letter");
  if (!/[0-9]/.test(value)) errors.push("A number");
  if (!/[^A-Za-z0-9]/.test(value)) errors.push("A special character");
  if (COMMON_PASSWORDS.has(value.toLowerCase())) errors.push("Not a commonly used password");

  return { valid: errors.length === 0, errors };
}
