/**
 * SellerSalt Private Beta Access Control
 * 
 * Provides gated private-beta admission controls, invite code validation,
 * and tenant-safe allowlist management during closed beta operations.
 */

import { isAdminEmail } from "@/lib/is-admin";

export interface BetaAccessResult {
  allowed: boolean;
  reason?: "PUBLIC_ACCESS" | "ADMIN_OVERRIDE" | "VALID_INVITE_CODE" | "BETA_RESTRICTED";
  message?: string;
}

export class PrivateBetaManager {
  /**
   * Checks whether the application is running in closed private beta mode.
   */
  public static isBetaMode(): boolean {
    return process.env.PRIVATE_BETA_MODE === "true";
  }

  /**
   * Retrieves configured invite codes from environment.
   */
  public static getValidInviteCodes(): string[] {
    const raw = process.env.BETA_INVITE_CODES || "SALT-BETA-2026,EARLY-FOUNDER,SELLER-SALT-VIP";
    return raw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);
  }

  /**
   * Validates a user-supplied beta invitation code.
   */
  public static validateInviteCode(code?: string | null): boolean {
    if (!code || typeof code !== "string") return false;
    const clean = code.trim().toUpperCase();
    const validCodes = this.getValidInviteCodes();
    return validCodes.includes(clean);
  }

  /**
   * Evaluates whether a given user session is permitted to access the application.
   */
  public static evaluateAccess(user?: {
    email?: string | null;
    role?: string | null;
    isBetaApproved?: boolean;
    inviteCode?: string | null;
  }): BetaAccessResult {
    // 1. If beta mode is disabled, full public access is granted
    if (!this.isBetaMode()) {
      return { allowed: true, reason: "PUBLIC_ACCESS" };
    }

    // 2. Superadmins always bypass private beta gates
    if (user?.email && isAdminEmail(user.email)) {
      return { allowed: true, reason: "ADMIN_OVERRIDE" };
    }

    // 3. User with explicit beta approval
    if (user?.isBetaApproved) {
      return { allowed: true, reason: "VALID_INVITE_CODE" };
    }

    // 4. User supplying valid invite code
    if (user?.inviteCode && this.validateInviteCode(user.inviteCode)) {
      return { allowed: true, reason: "VALID_INVITE_CODE" };
    }

    // 5. Blocked by private beta
    return {
      allowed: false,
      reason: "BETA_RESTRICTED",
      message: "SellerSalt is currently in private beta. Please enter a valid invitation code to continue.",
    };
  }
}
