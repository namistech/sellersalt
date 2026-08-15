"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Store,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  User as UserIcon,
  Trash2,
  AlertTriangle,
  Upload,
  Camera,
  Laptop,
  Globe,
  Clock,
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
  connectedEtsyShop: {
    id: string;
    label: string;
    storeUrl: string;
    status: string;
    lastSyncedAt: string | null;
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
        setProfileError(data.error ?? "Failed to upload avatar.");
        return;
      }

      setAvatarUrl(data.avatarUrl);
      setProfileMessage("Avatar updated successfully.");
      setTimeout(() => setProfileMessage(null), 3000);
    } catch {
      setAvatarUploading(false);
      setProfileError("Network error uploading avatar.");
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUploading(true);
    setProfileError(null);

    try {
      const res = await fetch("/api/settings/avatar", { method: "DELETE" });
      const data = await res.json();
      setAvatarUploading(false);

      if (!res.ok) {
        setProfileError(data.error ?? "Failed to remove avatar.");
        return;
      }

      setAvatarUrl(null);
      setProfileMessage("Avatar removed.");
      setTimeout(() => setProfileMessage(null), 3000);
    } catch {
      setAvatarUploading(false);
      setProfileError("Network error removing avatar.");
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setProfileSaving(true);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          organizationName,
          email: isEmailChanged ? email : undefined,
          currentPassword: isEmailChanged ? currentPasswordForEmail : undefined,
        }),
      });

      const data = await res.json();
      setProfileSaving(false);

      if (!res.ok) {
        setProfileError(data.error ?? "Failed to save profile.");
        return;
      }

      setOriginalEmail(email);
      setCurrentPasswordForEmail("");
      setProfileMessage("Profile and workspace details updated successfully.");
      setTimeout(() => setProfileMessage(null), 3000);
    } catch {
      setProfileError("Network error saving profile.");
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      setPasswordSaving(false);

      if (!res.ok) {
        setPasswordError(data.error ?? "Failed to change password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
      setTimeout(() => setPasswordMessage(null), 3000);
    } catch {
      setPasswordError("Network error updating password.");
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return <Text size="body-sm" color="tertiary">Loading profile details...</Text>;
  }

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div>
        <Heading as="h1" size="h2">
          Account & Profile Center
        </Heading>
        <Text size="body-md" color="secondary" className="mt-1">
          Manage your personal credentials, workspace identity, connected marketplaces, and active security sessions.
        </Text>
      </div>

      {profileMessage && <Alert variant="success">{profileMessage}</Alert>}
      {profileError && <Alert variant="danger">{profileError}</Alert>}

      {/* Profile Overview Header Card */}
      <Card padding="lg" className="border-line shadow-xs bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <Avatar src={avatarUrl || undefined} name={name || email} size="lg" className="h-16 w-16 text-lg border border-line" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Change Avatar"
              >
                <Camera className="h-5 w-5" />
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
                <span className="font-bold text-ink text-lg">{name || "Account Member"}</span>
                <Badge variant="success">
                  {profileData?.role ?? "OWNER"}
                </Badge>
                <Badge variant="neutral">
                  {profileData?.planName ?? "Starter Plan"}
                </Badge>
              </div>
              <div className="text-xs text-ink-secondary mt-1">{email}</div>
              {profileData?.memberSince && (
                <div className="text-[11px] text-ink-tertiary mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3 inline" /> Member since {new Date(profileData.memberSince).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                variant="tertiary"
                size="compact"
                onClick={handleRemoveAvatar}
                loading={avatarUploading}
                className="text-xs text-danger hover:text-danger-strong"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Personal & Workspace Information */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-6">
        <div>
          <Heading as="h2" size="h4">
            Personal & Workspace Information
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Your name and primary workspace identify you across SellerSalt research tools.
          </Text>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="name"
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
            />

            <Input
              id="organizationName"
              label="Workspace Name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g. Jane's Digital Goods"
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
                    <Badge variant="neutral">
                      Not Connected
                    </Badge>
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
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted border border-line">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
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

          {/* Email Authentication Identity */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-secondary">
                <ShieldCheck className="h-5 w-5 text-[#0E8F5D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Email & Password Auth</span>
                  <Badge variant="success">Active</Badge>
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Primary credential authentication with encrypted password hash.
                </p>
              </div>
            </div>
          </div>
        </div>
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
