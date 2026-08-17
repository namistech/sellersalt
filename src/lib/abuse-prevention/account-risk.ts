/**
 * SellerSalt Canonical Account Risk Model
 * 
 * Computes an explainable multi-signal risk score (0-100) evaluating:
 * - Email verification state
 * - Email domain classification (disposable, public webmail, business domain)
 * - IP velocity & network frequency
 * - Signup attempt velocity
 * - Failed verification / authentication patterns
 * - Free plan creation history
 * 
 * Strictly does NOT attempt fake MAC-address detection, relying instead on
 * technically valid, lawful, and explainable server-side telemetry.
 */

import { analyzeEmailDomain, type EmailDomainAnalysis } from "./disposable-domains";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskSignalPoint {
  signal: string;
  points: number; // Positive = increases risk, Negative = decreases risk (trust signal)
  description: string;
}

export interface AccountRiskAssessment {
  score: number; // 0 (Trusted) to 100 (Maximum Risk)
  level: RiskLevel;
  allowSignup: boolean;
  requiresChallenge: boolean;
  requiresImmediateEmailVerification: boolean;
  signals: RiskSignalPoint[];
  explanation: string;
}

export interface RiskEvaluationContext {
  email: string;
  ipAddress?: string;
  userAgent?: string;
  ipSignupCountLastHour?: number;
  ipSignupCountLast24Hours?: number;
  domainFreeAccountCount?: number;
  failedAttemptsCount?: number;
  hasVerifiedEmail?: boolean;
  hasPaidSubscription?: boolean;
  hasPasskey?: boolean;
  hasTwoFactor?: boolean;
}

/**
 * Evaluates the risk score of an account registration or operation.
 */
export async function evaluateAccountRisk(
  context: RiskEvaluationContext
): Promise<AccountRiskAssessment> {
  const signals: RiskSignalPoint[] = [];
  let rawScore = 0;

  // 1. Email Domain Signal
  const domainAnalysis: EmailDomainAnalysis = await analyzeEmailDomain(context.email);

  if (domainAnalysis.isDisposable) {
    signals.push({
      signal: "DISPOSABLE_EMAIL_DOMAIN",
      points: 80,
      description: `Domain @${domainAnalysis.normalizedDomain} is classified as a disposable or temporary mailbox service.`,
    });
    rawScore += 80;
  } else if (domainAnalysis.isPublicWebmail) {
    // Established public webmail providers provide baseline trust
    signals.push({
      signal: "LEGITIMATE_PUBLIC_WEBMAIL",
      points: -10,
      description: `Domain @${domainAnalysis.normalizedDomain} is an established legitimate public email provider.`,
    });
    rawScore -= 10;
  } else if (domainAnalysis.isBusinessDomain) {
    signals.push({
      signal: "CUSTOM_BUSINESS_DOMAIN",
      points: 5,
      description: `Domain @${domainAnalysis.normalizedDomain} is a private business/custom domain.`,
    });
    rawScore += 5;
  }

  // 2. IP Velocity Signals
  const ipHour = context.ipSignupCountLastHour || 0;
  const ipDay = context.ipSignupCountLast24Hours || 0;

  if (ipHour >= 5) {
    signals.push({
      signal: "EXTREME_IP_VELOCITY_1H",
      points: 50,
      description: `${ipHour} signups originating from the same IP address in the past hour.`,
    });
    rawScore += 50;
  } else if (ipHour >= 2) {
    signals.push({
      signal: "ELEVATED_IP_VELOCITY_1H",
      points: 25,
      description: `${ipHour} signups originating from the same IP address in the past hour.`,
    });
    rawScore += 25;
  }

  if (ipDay >= 10) {
    signals.push({
      signal: "HIGH_IP_VELOCITY_24H",
      points: 30,
      description: `${ipDay} signups originating from the same IP address in the past 24 hours.`,
    });
    rawScore += 30;
  }

  // 3. Domain Multi-Account Velocity
  const domainAccounts = context.domainFreeAccountCount || 0;
  if (domainAnalysis.isBusinessDomain && domainAccounts >= 2) {
    signals.push({
      signal: "BUSINESS_DOMAIN_REPEATED_FREE_ACCOUNTS",
      points: 35,
      description: `${domainAccounts} free workspaces already associated with domain @${domainAnalysis.normalizedDomain}.`,
    });
    rawScore += 35;
  }

  // 4. Failed Attempts Signal
  const failedAttempts = context.failedAttemptsCount || 0;
  if (failedAttempts >= 5) {
    signals.push({
      signal: "HIGH_FAILED_AUTH_ATTEMPTS",
      points: 30,
      description: `${failedAttempts} failed login/verification attempts recorded.`,
    });
    rawScore += 30;
  }

  // 5. Positive Trust Signals (Mitigating Factors)
  if (context.hasPaidSubscription) {
    signals.push({
      signal: "PAID_BILLING_IDENTITY",
      points: -50,
      description: "User has a verified paid billing relationship.",
    });
    rawScore -= 50;
  }

  if (context.hasVerifiedEmail) {
    signals.push({
      signal: "VERIFIED_EMAIL_IDENTITY",
      points: -20,
      description: "Email address has successfully completed link confirmation.",
    });
    rawScore -= 20;
  }

  if (context.hasPasskey || context.hasTwoFactor) {
    signals.push({
      signal: "STRONG_2FA_OR_WEBAUTHN",
      points: -25,
      description: "Hardware passkey or TOTP 2FA enabled on the account.",
    });
    rawScore -= 25;
  }

  // Clamp composite score to 0..100
  const finalScore = Math.max(0, Math.min(100, rawScore));

  let level: RiskLevel = "LOW";
  let allowSignup = true;
  let requiresChallenge = false;
  let requiresImmediateEmailVerification = true;

  if (finalScore >= 75) {
    level = "CRITICAL";
    allowSignup = false;
    requiresChallenge = true;
  } else if (finalScore >= 50) {
    level = "HIGH";
    allowSignup = true;
    requiresChallenge = true;
  } else if (finalScore >= 25) {
    level = "MEDIUM";
    allowSignup = true;
    requiresChallenge = false;
  } else {
    level = "LOW";
    allowSignup = true;
    requiresChallenge = false;
  }

  const explanation = signals
    .map((s) => `${s.points > 0 ? "+" : ""}${s.points} pts (${s.signal}): ${s.description}`)
    .join(" | ");

  return {
    score: finalScore,
    level,
    allowSignup,
    requiresChallenge,
    requiresImmediateEmailVerification,
    signals,
    explanation,
  };
}
