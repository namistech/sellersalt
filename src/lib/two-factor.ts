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
