"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { startRegistration } from "@simplewebauthn/browser";
import {
  User,
  Building,
  Mail,
  Shield,
  Key,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Camera,
  Laptop,
  Globe,
  Clock,
  ShieldCheck,
  Smartphone,
  Fingerprint,
  Copy,
  Check,
  RefreshCw,
  Store,
  Download,
  QrCode,
  Pencil,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Heading,
  Text,
  Alert,
  Avatar,
  Badge,
} from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { checkPasswordStrength } from "@/lib/password-policy";

interface ProfileData {
  name: string;
  email: string;
  emailVerified?: boolean;
  avatarUrl: string | null;
  memberSince: string | null;
  organizationName: string;
  planName: string;
  planKey: string;
  role: string;
  connectedEtsyShop?: {
    id: string;
    label: string;
    storeUrl: string;
    status: string;
  } | null;
}

// Live client-side feedback for the real server-enforced policy in
// src/lib/password-policy.ts (length, lower/upper/digit/special, common-
// password blocklist). This is UX assistance only — checkPasswordStrength
// is the same pure function the server route imports, so the meter never
// drifts from what will actually be accepted; the server remains the
// real gate per CLAUDE.md's client-checks-are-never-the-gate rule.
function PasswordStrengthMeter({ password }: { password: string }) {
  const { errors } = checkPasswordStrength(password);
  const isCommon = errors.includes("Not a commonly used password");
  const criteriaErrors = errors.filter((e) => e !== "Not a commonly used password");
  const TOTAL_CRITERIA = 5; // length, lowercase, uppercase, digit, special char
  const satisfied = TOTAL_CRITERIA - criteriaErrors.length;

  let label: string;
  let barColor: string;
  let textColor: string;
  if (isCommon || satisfied <= 2) {
    label = isCommon ? "Weak — too common" : "Weak";
    barColor = "bg-red-500";
    textColor = "text-red-600";
  } else if (satisfied === 3) {
    label = "Fair";
    barColor = "bg-amber-500";
    textColor = "text-amber-600";
  } else if (satisfied === 4) {
    label = "Good";
    barColor = "bg-blue-500";
    textColor = "text-blue-600";
  } else {
    label = "Strong";
    barColor = "bg-[#0E8F5D]";
    textColor = "text-[#0E8F5D]";
  }

  const segments = 4;
  const filledSegments = Math.max(1, Math.round((satisfied / TOTAL_CRITERIA) * segments));

  const checklistItems: Array<{ key: string; label: string; met: boolean }> = [
    { key: "length", label: "8+ characters", met: password.length >= 8 },
    { key: "lower", label: "Lowercase letter", met: /[a-z]/.test(password) },
    { key: "upper", label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { key: "digit", label: "Number", met: /[0-9]/.test(password) },
    { key: "special", label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < filledSegments ? barColor : "bg-surface-muted"}`}
            />
          ))}
        </div>
        <span className={`text-[11px] font-semibold ${textColor}`}>{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {checklistItems.map((item) => (
          <span
            key={item.key}
            className={`px-1.5 py-0.5 rounded ${
              item.met ? "bg-[#E7FAF1] text-[#0E8F5D]" : "bg-[#F4F3EF] text-[#7C847E]"
            }`}
          >
            {item.met ? `✓ ${item.label}` : item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [reauthCode, setReauthCode] = useState("");
  // Only meaningful when 2FA is enabled — lets the user pick which
  // re-auth factor the "Current Password" slot in the form represents.
  const [passwordReauthMethod, setPasswordReauthMethod] = useState<"password" | "code">("password");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetLinkSending, setResetLinkSending] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);

  // 2FA TOTP States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [totpQrDataUrl, setTotpQrDataUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpRecoveryCodes, setTotpRecoveryCodes] = useState<string[]>([]);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpCopied, setTotpCopied] = useState(false);
  const [recoveryCodesCopied, setRecoveryCodesCopied] = useState(false);
  const [disableTotpPassword, setDisableTotpPassword] = useState("");
  const [showDisableTotpConfirm, setShowDisableTotpConfirm] = useState(false);

  useEffect(() => {
    if (!totpUri) {
      setTotpQrDataUrl("");
      return;
    }
    // Rendered entirely client-side (qrcode npm package) — never sent to a
    // third-party QR image service, which would leak the raw TOTP secret
    // (embedded in the otpauth:// URI) to an outside server.
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(totpUri, { width: 220, margin: 1 }).then((url) => {
        if (!cancelled) setTotpQrDataUrl(url);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [totpUri]);
  const [codesCopied, setCodesCopied] = useState(false);

  // Deletion Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Notification Preferences States
  const [productAlerts, setProductAlerts] = useState(true);
  const [competitorSpikeAlerts, setCompetitorSpikeAlerts] = useState(true);
  const [catalogSeoAlerts, setCatalogSeoAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((d: any) => {
        setProfileData(d);
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setOriginalEmail(d.email ?? "");
        setOrganizationName(d.organizationName ?? "");
        setAvatarUrl(d.avatarUrl ?? null);
        if (d.notifications) {
          setProductAlerts(d.notifications.productAlerts ?? true);
          setCompetitorSpikeAlerts(d.notifications.competitorSpikeAlerts ?? true);
          setCatalogSeoAlerts(d.notifications.catalogSeoAlerts ?? true);
          setSecurityAlerts(d.notifications.securityAlerts ?? true);
        }
        setAvatarFailed(false);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/settings/2fa/totp")
      .then((r) => r.json())
      .then((d) => {
        if (d.enabled) setTwoFactorEnabled(true);
      })
      .catch(() => {});
  }, []);


  const isEmailChanged = email.toLowerCase().trim() !== originalEmail.toLowerCase().trim();

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Avatar file size must be less than 2MB.");
      return;
    }

    setAvatarUploading(true);
    setProfileError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/settings/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setAvatarUploading(false);

      if (!res.ok) {
        setProfileError(data.error || "Failed to upload avatar.");
        return;
      }

      setAvatarUrl(data.avatarUrl);
      setAvatarFailed(false);
      setProfileMessage("Avatar updated successfully.");
    } catch {
      setAvatarUploading(false);
      setProfileError("Network error while uploading avatar.");
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUploading(true);
    setProfileError(null);

    try {
      const res = await fetch("/api/settings/avatar", { method: "DELETE" });
      setAvatarUploading(false);

      if (res.ok) {
        setAvatarUrl(null);
        setProfileMessage("Avatar removed.");
      }
    } catch {
      setAvatarUploading(false);
      setProfileError("Failed to remove avatar.");
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setProfileError("Please enter your display name.");
      return;
    }
    setProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          organizationName: organizationName.trim(),
          currentPassword: isEmailChanged ? currentPasswordForEmail : undefined,
        }),
      });

      const data = await res.json();
      setProfileSaving(false);

      if (!res.ok) {
        setProfileError(data.error || "Failed to save profile changes.");
        return;
      }

      setOriginalEmail(email.trim());
      setCurrentPasswordForEmail("");
      setIsEditingProfile(false);
      setIsEditingWorkspace(false);
      setProfileMessage("Profile and workspace settings saved successfully.");
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              name: name.trim(),
              organizationName: organizationName.trim(),
              email: email.trim(),
            }
          : prev
      );
    } catch {
      setProfileSaving(false);
      setProfileError("Network error saving profile.");
    }
  }

  async function handleSaveNotifications() {
    setNotifSaving(true);
    setNotifMessage(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: {
            productAlerts,
            competitorSpikeAlerts,
            catalogSeoAlerts,
            securityAlerts,
          },
        }),
      });
      setNotifSaving(false);
      if (res.ok) {
        setNotifMessage("Notification preferences saved.");
        setTimeout(() => setNotifMessage(null), 3000);
      }
    } catch {
      setNotifSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    // Immediate UX feedback only — the server re-checks this
    // authoritatively via checkPasswordStrength regardless of what's sent.
    const strength = checkPasswordStrength(newPassword);
    if (!strength.valid) {
      setPasswordError(`New password must include: ${strength.errors.join(", ")}.`);
      return;
    }

    const usingCode = twoFactorEnabled && passwordReauthMethod === "code";
    if (usingCode && !reauthCode.trim()) {
      setPasswordError("Enter a current 2FA or backup code.");
      return;
    }
    if (!usingCode && !currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: usingCode ? undefined : currentPassword,
          code: usingCode ? reauthCode.trim() : undefined,
          newPassword,
        }),
      });

      const data = await res.json();
      setPasswordSaving(false);

      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password.");
        return;
      }

      setCurrentPassword("");
      setReauthCode("");
      setNewPassword("");
      setConfirmPassword("");
      setResetLinkSent(false);
      setPasswordMessage("Password changed successfully.");
    } catch {
      setPasswordSaving(false);
      setPasswordError("Network error changing password.");
    }
  }

  // Alternative to typing the current password: reuses the existing,
  // already-audited forgot-password flow (single-use expiring hashed
  // token emailed to the account's own address) so a signed-in user can
  // complete a password change without ever needing to know/type their
  // old one. Same generic response either way — no new endpoint needed.
  async function handleSendPasswordResetLink() {
    setPasswordError(null);
    setPasswordMessage(null);
    setResetLinkSending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json().catch(() => ({}));
      setResetLinkSending(false);
      setResetLinkSent(true);
      setPasswordMessage(`If ${email} has an account, a reset link is on its way — check your inbox.`);
    } catch {
      setResetLinkSending(false);
      setPasswordError("Network error sending the reset link. Please try again.");
    }
  }

  async function handleStartTotpSetup() {
    setTotpLoading(true);
    setTotpError(null);
    try {
      const res = await fetch("/api/settings/2fa/totp");
      const data = await res.json();
      setTotpLoading(false);
      if (data.secret) {
        setTotpSecret(data.secret);
        setTotpUri(data.otpAuthUri || "");
        setShowTotpModal(true);
      }
    } catch {
      setTotpLoading(false);
      setTotpError("Failed to initiate 2FA setup.");
    }
  }

  async function handleVerifyAndEnableTotp() {
    if (!totpCode || totpCode.length !== 6) {
      setTotpError("Please enter a valid 6-digit code.");
      return;
    }

    setTotpLoading(true);
    setTotpError(null);

    try {
      const res = await fetch("/api/settings/2fa/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: totpSecret, code: totpCode }),
      });

      const data = await res.json();
      setTotpLoading(false);

      if (!res.ok) {
        setTotpError(data.error || "Verification failed. Please try again.");
        return;
      }

      setTwoFactorEnabled(true);
      setTotpRecoveryCodes(data.recoveryCodes || []);
    } catch {
      setTotpLoading(false);
      setTotpError("Network error verifying 2FA code.");
    }
  }

  async function handleConfirmDisableTotp() {
    if (!disableTotpPassword.trim()) {
      setTotpError("Enter your password or a current 2FA/backup code to confirm.");
      return;
    }
    setTotpLoading(true);
    setTotpError(null);
    try {
      // Accept either a password or a 6-digit/backup code in the same field.
      const isCode = /^\d{6}$/.test(disableTotpPassword.trim()) || /^[0-9A-F]{4}-[0-9A-F]{4}$/i.test(disableTotpPassword.trim());
      const res = await fetch("/api/settings/2fa/totp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isCode ? { code: disableTotpPassword.trim() } : { password: disableTotpPassword }),
      });
      const data = await res.json();
      setTotpLoading(false);
      if (!res.ok) {
        setTotpError(data.error || "Could not disable 2FA.");
        return;
      }
      setTwoFactorEnabled(false);
      setTotpRecoveryCodes([]);
      setShowTotpModal(false);
      setShowDisableTotpConfirm(false);
      setDisableTotpPassword("");
    } catch {
      setTotpLoading(false);
      setTotpError("Network error disabling 2FA.");
    }
  }

  async function handleRegenerateRecoveryCodes() {
    const password = window.prompt("Enter your password or a current 2FA/backup code to regenerate backup codes:");
    if (!password?.trim()) return;
    setTotpLoading(true);
    try {
      const isCode = /^\d{6}$/.test(password.trim()) || /^[0-9A-F]{4}-[0-9A-F]{4}$/i.test(password.trim());
      const res = await fetch("/api/settings/2fa/totp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isCode ? { code: password.trim() } : { password }),
      });
      const data = await res.json();
      setTotpLoading(false);
      if (!res.ok) {
        setProfileError(data.error || "Could not regenerate backup codes.");
        return;
      }
      setTotpRecoveryCodes(data.recoveryCodes || []);
      setShowTotpModal(true);
      setProfileMessage("New backup codes generated. Your old codes no longer work.");
    } catch {
      setTotpLoading(false);
      setProfileError("Network error regenerating backup codes.");
    }
  }

  function handleCopyRecoveryCodes() {
    navigator.clipboard.writeText(totpRecoveryCodes.join("\n"));
    setRecoveryCodesCopied(true);
    setTimeout(() => setRecoveryCodesCopied(false), 2000);
  }

  function handleDownloadRecoveryCodes() {
    const text = `SellerSalt 2FA Backup Recovery Codes\nGenerated: ${new Date().toISOString()}\nAccount: ${email}\n\n${totpRecoveryCodes.join("\n")}\n\nKeep these codes in a safe password manager. Each code can be used once.`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellersalt-2fa-recovery-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Passkeys State
  const [passkeys, setPasskeys] = useState<
    Array<{ id: string; name: string | null; deviceType: string; backedUp: boolean; createdAt: string; lastUsedAt: string | null }>
  >([]);
  const [passkeyStatus, setPasskeyStatus] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  function loadPasskeys() {
    fetch("/api/settings/passkeys")
      .then((r) => r.json())
      .then((d) => {
        if (d.passkeys) setPasskeys(d.passkeys);
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadPasskeys();
  }, []);

  async function handleRegisterPasskey() {
    setPasskeyLoading(true);
    setPasskeyStatus(null);
    try {
      if (!window.PublicKeyCredential) {
        setPasskeyStatus("Passkeys / WebAuthn is not supported by your current browser.");
        return;
      }

      const optionsRes = await fetch("/api/settings/passkeys/register/options");
      if (!optionsRes.ok) {
        setPasskeyStatus("Could not start passkey setup. Please try again.");
        return;
      }
      const { options, challengeToken } = await optionsRes.json();

      const registrationResponse = await startRegistration({ optionsJSON: options });

      const deviceLabel =
        /iphone|ipad/i.test(navigator.userAgent) ? "iOS device" :
        /android/i.test(navigator.userAgent) ? "Android device" :
        /mac/i.test(navigator.userAgent) ? "Mac" :
        /win/i.test(navigator.userAgent) ? "Windows device" : "Device";

      const verifyRes = await fetch("/api/settings/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: registrationResponse,
          challengeToken,
          name: `${deviceLabel} Passkey`,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setPasskeyStatus(verifyData.error || "Passkey verification failed.");
        return;
      }

      loadPasskeys();
      setPasskeyStatus("Passkey successfully registered.");
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setPasskeyStatus("Passkey setup cancelled or timed out.");
      } else if (err.name === "InvalidStateError") {
        setPasskeyStatus("This device's passkey is already registered.");
      } else {
        setPasskeyStatus(err.message || "Passkey setup error.");
      }
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handleRenamePasskey(id: string, currentName: string | null) {
    const nextName = window.prompt("Rename this passkey", currentName || "");
    if (!nextName || !nextName.trim()) return;
    try {
      await fetch("/api/settings/passkeys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: nextName.trim() }),
      });
      loadPasskeys();
    } catch {}
  }

  async function handleDeletePasskey(id: string) {
    if (!confirm("Remove this registered passkey?")) return;
    try {
      await fetch("/api/settings/passkeys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadPasskeys();
    } catch {}
  }

  const initials = (name || email || "U").substring(0, 2).toUpperCase();

  return (
    <div className="max-w-4xl space-y-8 pb-16">
      {/* Page Header */}
      <div>
        <Heading as="h1" size="h2">
          Account & Profile Hub
        </Heading>
        <Text size="body-md" color="secondary" className="mt-1">
          Manage your personal credentials, avatar photo, workspace identity, connected accounts, and 2FA security.
        </Text>
      </div>

      {/* Profile Header Identity Card */}
      <Card padding="lg" className="border-line shadow-xs bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              {avatarUrl && !avatarFailed ? (
                <img
                  src={avatarUrl}
                  alt={name || email}
                  onError={() => setAvatarFailed(true)}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-line shadow-sm"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-[#141B16] text-[#0E8F5D] border border-line flex items-center justify-center text-xl font-extrabold shadow-sm">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 rounded-2xl bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Change Avatar"
              >
                <Camera className="h-6 w-6" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-ink">{name || "SellerSalt Member"}</h2>
                <Badge variant="neutral">{profileData?.role || "OWNER"}</Badge>
                <Badge variant="success">{profileData?.planName || "Starter"}</Badge>
                {profileData?.emailVerified ? (
                  <Badge variant="success">✓ Email Verified</Badge>
                ) : (
                  <Link href="/verify-email">
                    <Badge variant="warning" className="hover:underline cursor-pointer">
                      ⚠ Unverified — Confirm Email
                    </Badge>
                  </Link>
                )}
              </div>
              <div className="text-xs text-ink-secondary mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-ink-tertiary" /> {email}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-ink-tertiary" /> {organizationName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="compact"
              onClick={() => fileInputRef.current?.click()}
              loading={avatarUploading}
              className="text-xs"
            >
              <Upload className="h-3.5 w-3.5 mr-1" /> Upload Photo
            </Button>
            {avatarUrl && (
              <Button
                variant="destructive"
                size="compact"
                onClick={handleRemoveAvatar}
                loading={avatarUploading}
                className="text-xs"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 1. Personal Profile Card (Read-Only Display by Default) */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <Heading as="h2" size="h4">
              Personal Identity &amp; Profile
            </Heading>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              Your public display name, email, and authentication credentials.
            </Text>
          </div>
          {!isEditingProfile && (
            <Button
              variant="secondary"
              size="compact"
              onClick={() => setIsEditingProfile(true)}
              className="text-xs font-semibold"
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit Profile
            </Button>
          )}
        </div>

        {profileMessage && <Alert variant="success">{profileMessage}</Alert>}
        {profileError && <Alert variant="danger">{profileError}</Alert>}

        {!isEditingProfile ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-ink-tertiary text-[10px] font-bold uppercase">Display Name</div>
              <div className="font-extrabold text-sm text-ink">{name || "—"}</div>
              <div className="text-[11px] text-ink-tertiary">Shown in team channels and header bar.</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-ink-tertiary text-[10px] font-bold uppercase">Login Email</div>
              <div className="font-extrabold text-sm text-ink flex items-center gap-2">
                <span>{email}</span>
                {profileData?.emailVerified && <Badge variant="success" className="text-[10px]">Verified</Badge>}
              </div>
              <div className="text-[11px] text-ink-tertiary">Primary account authentication address.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Display / Profile Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                />
              </div>

              <div>
                <Input
                  type="email"
                  label="Account Login Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                />
              </div>
            </div>

            {isEmailChanged && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="text-xs font-bold text-amber-900">
                  Confirm Email Change
                </div>
                <p className="text-[11px] text-amber-800">
                  To protect your account, enter your current password to confirm updating your login address.
                </p>
                <Input
                  type="password"
                  label="Current Password"
                  required
                  value={currentPasswordForEmail}
                  onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => {
                  setName(profileData?.name || "");
                  setEmail(profileData?.email || "");
                  setIsEditingProfile(false);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="compact"
                loading={profileSaving}
                className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-bold px-4"
              >
                Save Profile
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* 2. Workspace & Organization Card (Read-Only Display by Default) */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <Heading as="h2" size="h4">
              Workspace &amp; Team Details
            </Heading>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              Your primary business entity name and multi-tenant organization.
            </Text>
          </div>
          {!isEditingWorkspace && (
            <Button
              variant="secondary"
              size="compact"
              onClick={() => setIsEditingWorkspace(true)}
              className="text-xs font-semibold"
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit Workspace
            </Button>
          )}
        </div>

        {!isEditingWorkspace ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-ink-tertiary text-[10px] font-bold uppercase">Workspace Title</div>
              <div className="font-extrabold text-sm text-ink">{organizationName || "—"}</div>
              <div className="text-[11px] text-ink-tertiary">Organization workspace name.</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-ink-tertiary text-[10px] font-bold uppercase">Subscription Tier</div>
              <div className="font-extrabold text-sm text-[#0E8F5D]">{profileData?.planName || "Starter"}</div>
              <div className="text-[11px] text-ink-tertiary">Active plan entitlements.</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-ink-tertiary text-[10px] font-bold uppercase">Your Role</div>
              <div className="font-extrabold text-sm text-ink">{profileData?.role || "OWNER"}</div>
              <div className="text-[11px] text-ink-tertiary">Workspace permission level.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Input
                label="Organization / Workspace Title"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g. Acme Handmade Studio"
              />
              <span className="text-[11px] text-ink-tertiary mt-1 block">
                Brand title shown on team reports and exports.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => {
                  setOrganizationName(profileData?.organizationName || "");
                  setIsEditingWorkspace(false);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="compact"
                loading={profileSaving}
                className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-bold px-4"
              >
                Save Workspace
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Notification Preferences */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line-subtle pb-3">
          <div>
            <Heading as="h2" size="h4">
              Notification Preferences
            </Heading>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              Control which email alerts and opportunity digests you receive.
            </Text>
          </div>
          {notifMessage && <span className="text-xs font-bold text-[#0E8F5D]">{notifMessage}</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] flex items-start gap-3 cursor-pointer hover:bg-white transition">
            <input
              type="checkbox"
              checked={productAlerts}
              onChange={(e) => setProductAlerts(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-line text-[#0E8F5D] focus:ring-[#0E8F5D]"
            />
            <div>
              <div className="text-xs font-bold text-ink">Product Opportunity Alerts</div>
              <div className="text-[11px] text-ink-tertiary">Real-time alerts when new high-score opportunities match your saved searches.</div>
            </div>
          </label>

          <label className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] flex items-start gap-3 cursor-pointer hover:bg-white transition">
            <input
              type="checkbox"
              checked={competitorSpikeAlerts}
              onChange={(e) => setCompetitorSpikeAlerts(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-line text-[#0E8F5D] focus:ring-[#0E8F5D]"
            />
            <div>
              <div className="text-xs font-bold text-ink">Competitor Sales Velocity Spikes</div>
              <div className="text-[11px] text-ink-tertiary">Alerts when tracked competitor shops launch winning listings or surge in daily sales.</div>
            </div>
          </label>

          <label className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] flex items-start gap-3 cursor-pointer hover:bg-white transition">
            <input
              type="checkbox"
              checked={catalogSeoAlerts}
              onChange={(e) => setCatalogSeoAlerts(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-line text-[#0E8F5D] focus:ring-[#0E8F5D]"
            />
            <div>
              <div className="text-xs font-bold text-ink">Catalog SEO &amp; Tag Gap Audits</div>
              <div className="text-[11px] text-ink-tertiary">Weekly diagnostic digests highlighting unused tag slots in your connected store.</div>
            </div>
          </label>

          <label className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] flex items-start gap-3 cursor-pointer hover:bg-white transition">
            <input
              type="checkbox"
              checked={securityAlerts}
              onChange={(e) => setSecurityAlerts(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-line text-[#0E8F5D] focus:ring-[#0E8F5D]"
            />
            <div>
              <div className="text-xs font-bold text-ink">Account &amp; Security Notices</div>
              <div className="text-[11px] text-ink-tertiary">Critical notifications regarding 2FA, passkeys, and password changes.</div>
            </div>
          </label>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            variant="secondary"
            size="compact"
            loading={notifSaving}
            onClick={handleSaveNotifications}
            className="text-xs font-semibold"
          >
            Save Notification Preferences
          </Button>
        </div>
      </Card>

      {/* Connected Accounts Section */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-4">
        <div>
          <Heading as="h2" size="h4">
            Connected Authentication Accounts
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Single Sign-On providers linked to this SellerSalt workspace.
          </Text>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white border border-line flex items-center justify-center font-bold text-ink shadow-2xs">
                G
              </div>
              <div>
                <div className="font-bold text-xs text-ink">Google Account</div>
                <div className="text-[11px] text-ink-tertiary">Single sign-on authentication</div>
              </div>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>

          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white border border-line flex items-center justify-center font-bold text-amber-600 shadow-2xs">
                E
              </div>
              <div>
                <div className="font-bold text-xs text-ink">Etsy Seller Store</div>
                <div className="text-[11px] text-ink-tertiary">
                  {profileData?.connectedEtsyShop ? profileData.connectedEtsyShop.label : "Store OAuth integration"}
                </div>
              </div>
            </div>
            {profileData?.connectedEtsyShop ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Link href="/settings/channels">
                <Button variant="secondary" size="compact" className="text-xs">
                  Connect →
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Sign-In Security & Passkeys */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-6">
        <div>
          <Heading as="h2" size="h4">
            Sign-In Security & Passkeys
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Protect your workspace account with authenticator apps and device passkeys.
          </Text>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Authenticator App */}
          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white border border-line flex items-center justify-center text-[#0E8F5D] shadow-2xs">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-ink">Authenticator App</div>
                  <div className="text-[11px] text-ink-tertiary">Google Authenticator, 1Password, Authy</div>
                </div>
              </div>
              <Badge variant={twoFactorEnabled ? "success" : "neutral"}>
                {twoFactorEnabled ? "Active" : "Disabled"}
              </Badge>
            </div>

            <div className="pt-2 border-t border-line-subtle flex justify-end gap-2">
              {twoFactorEnabled ? (
                <>
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={handleRegenerateRecoveryCodes}
                    loading={totpLoading}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate backup codes
                  </Button>
                  <Button
                    variant="destructive"
                    size="compact"
                    onClick={() => {
                      setShowDisableTotpConfirm(true);
                      setDisableTotpPassword("");
                      setTotpError(null);
                    }}
                    loading={totpLoading}
                    className="text-xs"
                  >
                    Disable 2FA
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="compact"
                  onClick={handleStartTotpSetup}
                  loading={totpLoading}
                  className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white"
                >
                  + Set Up Authenticator App
                </Button>
              )}
            </div>
          </div>

          {/* Passkeys */}
          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white border border-line flex items-center justify-center text-purple-600 shadow-2xs">
                    <Fingerprint className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-ink">Passkeys</div>
                    <div className="text-[11px] text-ink-tertiary">Touch ID, Face ID, Windows Hello, or Security Key</div>
                  </div>
                </div>
                <Badge variant={passkeys.length > 0 ? "success" : "neutral"}>
                  {passkeys.length > 0 ? `${passkeys.length} Registered` : "Ready"}
                </Badge>
              </div>

              {/* Registered passkeys list */}
              {passkeys.length > 0 && (
                <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto">
                  {passkeys.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded-lg bg-white border border-line-subtle flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate">{p.name || "Device passkey"}</div>
                        <div className="text-[10px] text-ink-tertiary">
                          Added {new Date(p.createdAt).toLocaleDateString()}
                          {p.lastUsedAt ? ` · Last used ${new Date(p.lastUsedAt).toLocaleDateString()}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRenamePasskey(p.id, p.name)}
                          className="p-1 rounded text-ink-tertiary hover:text-ink hover:bg-surface-muted"
                          title="Rename Passkey"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePasskey(p.id)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Remove Passkey"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-line-subtle flex items-center justify-between">
              <span className="text-[11px] text-ink-tertiary">{passkeyStatus || "Biometric / Device Security"}</span>
              <Button
                variant="secondary"
                size="compact"
                loading={passkeyLoading}
                onClick={handleRegisterPasskey}
                className="text-xs"
              >
                + Register Device
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Password & Security Credentials Form */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-6">
        <div>
          <Heading as="h2" size="h4">
            Password & Security Credentials
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Change your password or manage recovery verification channels.
          </Text>
        </div>

        {passwordMessage && <Alert variant="success">{passwordMessage}</Alert>}
        {passwordError && <Alert variant="danger">{passwordError}</Alert>}

        <form onSubmit={handleChangePassword} className="space-y-4">
          {twoFactorEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-tertiary">Verify your identity with:</span>
              <div className="inline-flex rounded-md border border-line overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPasswordReauthMethod("password")}
                  className={`px-2.5 py-1 text-[11px] font-medium ${
                    passwordReauthMethod === "password" ? "bg-[#0E8F5D] text-white" : "bg-white text-ink hover:bg-surface-muted"
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordReauthMethod("code")}
                  className={`px-2.5 py-1 text-[11px] font-medium border-l border-line ${
                    passwordReauthMethod === "code" ? "bg-[#0E8F5D] text-white" : "bg-white text-ink hover:bg-surface-muted"
                  }`}
                >
                  2FA / backup code
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(!twoFactorEnabled || passwordReauthMethod === "password") && (
              <Input
                type="password"
                label="Current Password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            )}
            {twoFactorEnabled && passwordReauthMethod === "code" && (
              <Input
                type="text"
                label="2FA or Backup Code"
                required
                value={reauthCode}
                onChange={(e) => setReauthCode(e.target.value)}
                placeholder="123456 or A1B2-C3D4"
              />
            )}
            <Input
              type="password"
              label="New Password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Input
              type="password"
              label="Confirm New Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {newPassword.length > 0 && (
            <PasswordStrengthMeter password={newPassword} />
          )}

          {!twoFactorEnabled && (
            <div className="flex items-center justify-between rounded-lg border border-line-subtle bg-[#FAFAF8] px-3 py-2">
              <Text size="body-sm" color="secondary">
                Don&apos;t know your current password?
              </Text>
              <Button
                type="button"
                variant="tertiary"
                size="compact"
                loading={resetLinkSending}
                disabled={resetLinkSent}
                onClick={handleSendPasswordResetLink}
                className="text-xs"
              >
                {resetLinkSent ? "Reset link sent" : "Email me a reset link instead"}
              </Button>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="compact"
              loading={passwordSaving}
              className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold"
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Active Sessions Card */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-4">
        <div>
          <Heading as="h2" size="h4">
            Active Devices & Sessions
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Devices currently logged into your SellerSalt workspace.
          </Text>
        </div>

        <div className="p-4 rounded-xl border border-line-subtle bg-[#FAFAF8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-line text-ink">
              <Laptop className="h-5 w-5 text-[#0E8F5D]" />
            </div>
            <div>
              <div className="text-xs font-bold text-ink flex items-center gap-2">
                Current Web Browser Session
                <span className="h-1.5 w-1.5 rounded-full bg-[#0E8F5D]" />
              </div>
              <div className="text-[11px] text-ink-tertiary mt-0.5">
                Active now · Authenticated via JWT Session
              </div>
            </div>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </Card>

      {/* Danger Zone Card */}
      <Card padding="lg" className="border-red-200 bg-red-50/20 shadow-xs space-y-4">
        <div>
          <Heading as="h2" size="h4" className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" /> Danger Zone
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-1">
            Permanent account deletion, workspace export, or cancellation of stored research data.
          </Text>
        </div>

        <div className="rounded-xl border border-red-200 bg-white p-4 space-y-3 text-xs text-ink-secondary">
          <p>
            To delete your account and all associated workspace search configurations, tracked shops, and saved prospect data, please ensure all active subscriptions are cancelled in the <Link href="/settings/billing" className="text-[#0E8F5D] underline font-medium">Billing Center</Link>.
          </p>
          <div className="pt-1">
            <Button
              variant="destructive"
              size="compact"
              onClick={() => setShowDeleteModal(true)}
              className="text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Account & Workspace
            </Button>
          </div>
        </div>
      </Card>

      {/* 2FA TOTP Setup Dialog */}
      <Dialog
        open={showTotpModal}
        onClose={() => setShowTotpModal(false)}
        title="Setup Two-Factor Authentication"
        description="Scan the QR code with your authenticator app or enter the manual key below."
      >
        <div className="space-y-4 text-xs text-ink-secondary">
          {totpRecoveryCodes.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0E8F5D]">
                <CheckCircle2 className="h-5 w-5" /> 2FA Successfully Enabled!
              </div>
              <p className="text-xs text-ink">
                Save these backup recovery codes in a secure password manager. If you lose access to your authenticator device, you can use these to recover your account:
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 bg-[#FAFAF8] rounded-lg border border-line font-mono text-xs text-ink select-all">
                {totpRecoveryCodes.map((c, i) => (
                  <div key={i} className="p-1 bg-white border border-line-subtle rounded text-center">
                    {c}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={handleDownloadRecoveryCodes}
                    className="text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                  </Button>
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={handleCopyRecoveryCodes}
                    className="text-xs"
                  >
                    {recoveryCodesCopied ? (
                      <Check className="h-3.5 w-3.5 mr-1 text-[#0E8F5D]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    {recoveryCodesCopied ? "Copied" : "Copy"}
                  </Button>
                </div>

                <Button
                  variant="primary"
                  size="compact"
                  onClick={() => setShowTotpModal(false)}
                  className="bg-[#0E8F5D] text-white font-semibold"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* QR Code Display */}
              <div className="flex flex-col items-center justify-center p-4 bg-[#FAFAF8] rounded-xl border border-line space-y-2">
                <div className="text-[11px] font-bold text-ink">Scan with Authenticator App:</div>
                <div className="p-2 bg-white rounded-lg border border-line shadow-2xs h-44 w-44 flex items-center justify-center">
                  {totpQrDataUrl ? (
                    <img src={totpQrDataUrl} alt="2FA QR Code" className="h-full w-full" />
                  ) : (
                    <span className="text-[10px] text-ink-tertiary">Generating QR code…</span>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-1 font-semibold text-ink">Or enter Secret Key manually:</p>
                <div className="flex items-center gap-2 p-2.5 bg-[#FAFAF8] rounded-lg border border-line font-mono font-bold text-ink">
                  <span className="flex-1 tracking-widest text-xs truncate">{totpSecret}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(totpSecret);
                      setTotpCopied(true);
                      setTimeout(() => setTotpCopied(false), 2000);
                    }}
                    className="p-1 rounded hover:bg-white text-ink shrink-0"
                    title="Copy Secret"
                  >
                    {totpCopied ? <Check className="h-4 w-4 text-[#0E8F5D]" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-1 font-semibold text-ink">Enter 6-digit Verification Code:</p>
                <Input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="font-mono tracking-widest text-center text-base font-bold"
                />
              </div>

              {totpError && <Alert variant="danger">{totpError}</Alert>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="compact" onClick={() => setShowTotpModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="compact"
                  disabled={totpCode.length !== 6}
                  loading={totpLoading}
                  onClick={handleVerifyAndEnableTotp}
                  className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-semibold"
                >
                  Verify & Activate 2FA
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>

      {/* Disable 2FA Confirmation Dialog */}
      <Dialog
        open={showDisableTotpConfirm}
        onClose={() => setShowDisableTotpConfirm(false)}
        title="Disable Two-Factor Authentication"
        description="This removes an active layer of account protection. Confirm with your password or a current 2FA/backup code."
      >
        <div className="space-y-4">
          <Input
            id="disableTotpConfirm"
            label="Password or 2FA/backup code"
            type="password"
            autoFocus
            value={disableTotpPassword}
            onChange={(e) => setDisableTotpPassword(e.target.value)}
            placeholder="Password, 123456, or a backup code"
          />
          {totpError && <Alert variant="danger">{totpError}</Alert>}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="compact"
              onClick={() => setShowDisableTotpConfirm(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="compact"
              loading={totpLoading}
              onClick={handleConfirmDisableTotp}
              className="text-xs"
            >
              Disable 2FA
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account & Workspace"
        description="This action cannot be undone. All your saved searches, tracked shops, and prospect history will be permanently deleted."
      >
        <div className="space-y-4 text-xs text-ink-secondary">
          <p>
            To confirm deletion, please type <strong className="text-ink font-bold">DELETE</strong> in the box below:
          </p>
          <Input
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            placeholder="Type DELETE to confirm"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="compact" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="compact"
              disabled={deleteConfirmationText !== "DELETE"}
              loading={deleting}
              onClick={() => {
                setDeleting(true);
                window.location.href = `mailto:support@sellersalt.com?subject=Permanent Account Deletion Request for ${email}&body=Please permanently delete my SellerSalt account (${email}) and workspace.`;
              }}
            >
              Permanently Delete Account
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
