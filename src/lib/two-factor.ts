import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { encrypt, decrypt } from "./encryption";
import { verifyTOTPCode } from "./totp";

// Shared by the settings UI (setup/disable) and the login-time enforcement
// in auth.ts, so both read/write the exact same encrypted shape — the
// secret and recovery codes are genuine per-user credentials (not admin
// config), so they're encrypted at rest via the same encrypt()/decrypt()
// used for SellerChannel credentials, not stored as plain JSON.

interface TwoFactorRecord {
  enabled: boolean;
  secret: string;
  recoveryCodes: string[];
  enabledAt: string;
}

function settingKey(userId: string): string {
  return `user_2fa_${userId}`;
}

export async function get2FA(userId: string): Promise<TwoFactorRecord | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: settingKey(userId) } });
  if (!row) return null;
  try {
    return JSON.parse(decrypt(row.value)) as TwoFactorRecord;
  } catch {
    return null;
  }
}

export async function save2FA(userId: string, record: TwoFactorRecord): Promise<void> {
  const value = encrypt(JSON.stringify(record));
  await prisma.appSetting.upsert({
    where: { key: settingKey(userId) },
    create: { key: settingKey(userId), value, isSecret: true },
    update: { value },
  });
}

export async function disable2FA(userId: string): Promise<void> {
  await prisma.appSetting.deleteMany({ where: { key: settingKey(userId) } });
}

/** Verifies a login-time code against either the TOTP secret or an unused
 * recovery code. Recovery codes are single-use — a successful match is
 * consumed (persisted) before returning. */
export async function verify2FALoginCode(
  userId: string,
  code: string
): Promise<{ ok: boolean; usedRecoveryCode: boolean }> {
  const record = await get2FA(userId);
  if (!record?.enabled) return { ok: true, usedRecoveryCode: false };

  const cleanCode = code.trim();
  if (verifyTOTPCode(record.secret, cleanCode)) {
    return { ok: true, usedRecoveryCode: false };
  }

  const normalized = cleanCode.toUpperCase();
  const idx = record.recoveryCodes.indexOf(normalized);
  if (idx !== -1) {
    const remaining = [...record.recoveryCodes];
    remaining.splice(idx, 1);
    await save2FA(userId, { ...record, recoveryCodes: remaining });
    return { ok: true, usedRecoveryCode: true };
  }

  return { ok: false, usedRecoveryCode: false };
}

/** Re-authentication check shared by any settings-area action that needs to
 * confirm "this is really the account owner" without forcing a password
 * (disable 2FA, regenerate backup codes, change password). Accepts EITHER
 * the account password OR a current TOTP/backup code for a record already
 * known to be enabled — unlike verify2FALoginCode this does NOT consume a
 * matched backup code, since re-auth checks here aren't a login event and
 * may reasonably be retried. Originally lived only in the 2FA route; moved
 * here so every re-auth caller shares one implementation instead of each
 * duplicating the check. */
export async function verifyPasswordOrCode(
  userId: string,
  record: { secret: string; recoveryCodes: string[] },
  password?: string,
  code?: string
): Promise<boolean> {
  if (code) {
    const ok = verifyTOTPCode(record.secret, code) || record.recoveryCodes.includes(code.trim().toUpperCase());
    if (ok) return true;
  }
  if (password) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return Boolean(user && (await bcrypt.compare(password, user.passwordHash)));
  }
  return false;
}
