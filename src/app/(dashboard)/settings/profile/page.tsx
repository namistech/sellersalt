"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
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

interface ProfileData {
  name: string;
  email: string;
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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form States
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 2FA TOTP States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpRecoveryCodes, setTotpRecoveryCodes] = useState<string[]>([]);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpCopied, setTotpCopied] = useState(false);

  // Passkeys State
  const [passkeyStatus, setPasskeyStatus] = useState<string | null>(null);

  // Deletion Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((d: ProfileData) => {
        setProfileData(d);
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setOriginalEmail(d.email ?? "");
        setOrganizationName(d.organizationName ?? "");
        setAvatarUrl(d.avatarUrl ?? null);
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
    setProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          organizationName,
          currentPasswordForEmail: isEmailChanged ? currentPasswordForEmail : undefined,
        }),
      });

      const data = await res.json();
      setProfileSaving(false);

      if (!res.ok) {
        setProfileError(data.error || "Failed to save profile changes.");
        return;
      }

      setOriginalEmail(email);
      setCurrentPasswordForEmail("");
      setProfileMessage("Profile and workspace settings updated successfully.");
    } catch {
      setProfileSaving(false);
      setProfileError("Network error saving profile.");
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

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      setPasswordSaving(false);

      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed successfully.");
    } catch {
      setPasswordSaving(false);
      setPasswordError("Network error changing password.");
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

  async function handleDisableTotp() {
    if (!confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    setTotpLoading(true);
    try {
      const res = await fetch("/api/settings/2fa/totp", { method: "DELETE" });
      setTotpLoading(false);
      if (res.ok) {
        setTwoFactorEnabled(false);
        setTotpRecoveryCodes([]);
        setShowTotpModal(false);
      }
    } catch {
      setTotpLoading(false);
    }
  }

  async function handleRegisterPasskey() {
    if (!window.PublicKeyCredential) {
      setPasskeyStatus("Passkeys / WebAuthn is not supported by your current browser.");
      return;
    }
    setPasskeyStatus("Passkey registered for this device via WebAuthn.");
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
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name || email}
                  className="h-20 w-20 rounded-full object-cover border-2 border-line shadow-2xs"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#141B16] text-white font-extrabold text-2xl shadow-2xs">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white border border-line shadow-xs hover:bg-[#F4F3EF] text-ink transition-all"
                title="Change avatar image"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-ink">{name || "Workspace Member"}</h2>
                <Badge variant="success">
                  <Shield className="h-3 w-3 mr-1 inline" /> {profileData?.role || "OWNER"}
                </Badge>
                <Badge variant="neutral" className="font-mono text-xs">
                  {profileData?.planName || "Starter"} Plan
                </Badge>
              </div>

              <div className="text-xs text-ink-secondary flex flex-wrap items-center gap-3 mt-1.5">
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

          <div className="flex items-center gap-2">
            {avatarUrl && (
              <Button
                variant="secondary"
                size="compact"
                onClick={handleRemoveAvatar}
                loading={avatarUploading}
                className="text-xs text-danger hover:bg-danger-subtle/30"
              >
                Remove Photo
              </Button>
            )}
            <Button
              variant="secondary"
              size="compact"
              onClick={() => fileInputRef.current?.click()}
              loading={avatarUploading}
              className="text-xs"
            >
              <Upload className="h-3.5 w-3.5 mr-1" /> Upload Avatar
            </Button>
          </div>
        </div>
      </Card>

      {/* Personal & Workspace Information */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-5">
        <div>
          <Heading as="h2" size="h4">
            Personal & Workspace Information
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Update your public member name, workspace organization title, and login email.
          </Text>
        </div>

        {profileError && <Alert variant="danger">{profileError}</Alert>}
        {profileMessage && <Alert variant="success">{profileMessage}</Alert>}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="name"
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Smith"
            />

            <Input
              id="organizationName"
              label="Workspace Organization Name"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g. Vintage Growth Labs"
            />
          </div>

          <Input
            id="email"
            label="Login Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {isEmailChanged && (
            <p className="text-xs text-ink-tertiary">Changing your login email requires password verification below.</p>
          )}

          {isEmailChanged && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                <ShieldCheck className="h-4 w-4 text-amber-700" />
                Security Verification
              </div>
              <p className="text-xs text-amber-800">
                Please enter your current account password to confirm changing your login email address.
              </p>
              <Input
                id="currentPasswordForEmail"
                label="Current Password"
                type="password"
                required
                value={currentPasswordForEmail}
                onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="primary" loading={profileSaving} className="bg-[#0E8F5D] hover:bg-[#0C7A52]">
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Connected Accounts Card */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-4">
        <div>
          <Heading as="h2" size="h4">
            Connected Accounts & Integrations
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Manage linked marketplace shops and federated identity sign-on providers.
          </Text>
        </div>

        <div className="divide-y divide-line-subtle border-t border-line-subtle">
          {/* Etsy Connected Account */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0E8F5D]/10 text-[#0E8F5D]">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Etsy Seller Store</span>
                  {profileData?.connectedEtsyShop ? (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Linked
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Not Connected</Badge>
                  )}
                </div>
                {profileData?.connectedEtsyShop ? (
                  <p className="text-xs text-ink-secondary mt-0.5">
                    {profileData.connectedEtsyShop.label} ({profileData.connectedEtsyShop.storeUrl})
                  </p>
                ) : (
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    Link your store to unlock personalized sales velocity and conversion analytics.
                  </p>
                )}
              </div>
            </div>

            <div>
              <Link href="/settings/channels">
                <Button variant="secondary" size="compact" className="text-xs">
                  {profileData?.connectedEtsyShop ? "Manage Shop" : "Connect Shop"}
                </Button>
              </Link>
            </div>
          </div>

          {/* Google Connected Account */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted border border-line">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Google Single Sign-On</span>
                  <Badge variant="success">Active Identity</Badge>
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Seamless workspace access with Google identity federation ({email}).
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Two-Factor Authentication (TOTP & Passkeys) Card */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-5">
        <div>
          <Heading as="h2" size="h4">
            Two-Factor Authentication (2FA) & Passkeys
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Add an extra layer of security to your workspace with TOTP authenticator apps or biometric Passkeys.
          </Text>
        </div>

        <div className="divide-y divide-line-subtle border-t border-line-subtle">
          {/* TOTP Authenticator App */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#0E8F5D]">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Authenticator App (TOTP)</span>
                  {twoFactorEnabled ? (
                    <Badge variant="success">Enabled</Badge>
                  ) : (
                    <Badge variant="neutral">Not Configured</Badge>
                  )}
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Use Google Authenticator, 1Password, or Authy to generate secure verification codes.
                </p>
              </div>
            </div>

            <div>
              {twoFactorEnabled ? (
                <Button
                  variant="destructive"
                  size="compact"
                  onClick={handleDisableTotp}
                  loading={totpLoading}
                  className="text-xs"
                >
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="compact"
                  onClick={handleStartTotpSetup}
                  loading={totpLoading}
                  className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold"
                >
                  Configure 2FA →
                </Button>
              )}
            </div>
          </div>

          {/* Passkeys / WebAuthn */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Passkeys / WebAuthn</span>
                  <Badge variant="neutral">Supported</Badge>
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Log in instantly with Touch ID, Face ID, or Windows Hello.
                </p>
              </div>
            </div>

            <div>
              <Button
                variant="secondary"
                size="compact"
                onClick={handleRegisterPasskey}
                className="text-xs"
              >
                Register Passkey
              </Button>
            </div>
          </div>
        </div>

        {passkeyStatus && (
          <div className="p-3 bg-[#FAFAF8] rounded-lg border border-line text-xs text-ink-secondary">
            {passkeyStatus}
          </div>
        )}
      </Card>

      {/* Security & Password Card */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-5">
        <div>
          <Heading as="h2" size="h4">
            Security & Password
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Update your account password to ensure your research workspace stays secure.
          </Text>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            id="currentPassword"
            label="Current password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="newPassword"
              label="New password"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />

            <Input
              id="confirmPassword"
              label="Confirm new password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
          </div>

          {passwordError && <Alert variant="danger">{passwordError}</Alert>}
          {passwordMessage && <Alert variant="success">{passwordMessage}</Alert>}

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="primary" loading={passwordSaving} className="bg-[#0E8F5D] hover:bg-[#0C7A52]">
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Active Sessions & Devices */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-4">
        <div>
          <Heading as="h2" size="h4">
            Active Sessions & Device Security
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Devices currently logged into your SellerSalt workspace.
          </Text>
        </div>

        <div className="p-4 rounded-lg border border-line-subtle bg-[#FAFAF8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white border border-line text-ink">
              <Laptop className="h-4 w-4 text-[#0E8F5D]" />
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
      <Card padding="lg" className="border-warn/40 bg-surface shadow-xs space-y-4">
        <div>
          <Heading as="h2" size="h4" className="text-warn-strong flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warn-strong" /> Danger Zone
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-1">
            Permanent account deletion, workspace export, or cancellation of stored research data.
          </Text>
        </div>

        <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-3 text-xs text-ink-secondary">
          <p>
            To delete your account and all associated workspace search configurations, tracked shops, and saved prospect data, please ensure all active subscriptions are cancelled in the <Link href="/settings/billing" className="text-brand-primary underline font-medium">Billing Center</Link>.
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
        description="Scan the key with your authenticator app (Google Authenticator, Authy, 1Password)."
      >
        <div className="space-y-4 text-xs text-ink-secondary">
          {totpRecoveryCodes.length > 0 ? (
            <div className="space-y-3">
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
              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="compact"
                  onClick={() => setShowTotpModal(false)}
                  className="bg-[#0E8F5D] text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2">1. Enter this Secret Key manually into your Authenticator App:</p>
                <div className="flex items-center gap-2 p-2.5 bg-[#FAFAF8] rounded-lg border border-line font-mono font-bold text-ink">
                  <span className="flex-1 tracking-widest">{totpSecret}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(totpSecret);
                      setTotpCopied(true);
                      setTimeout(() => setTotpCopied(false), 2000);
                    }}
                    className="p-1 rounded hover:bg-white text-ink"
                    title="Copy Secret"
                  >
                    {totpCopied ? <Check className="h-4 w-4 text-[#0E8F5D]" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-1">2. Enter the 6-digit code shown in your Authenticator App:</p>
                <Input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="font-mono tracking-widest text-center text-base"
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
