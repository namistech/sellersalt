"use client";

import { useEffect, useState } from "react";
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

interface ProfileData {
  name: string;
  email: string;
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

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((d: ProfileData) => {
        setProfileData(d);
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setOriginalEmail(d.email ?? "");
        setOrganizationName(d.organizationName ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isEmailChanged = email.toLowerCase().trim() !== originalEmail.toLowerCase().trim();

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
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <Heading as="h1" size="h2">
          Profile & Account Center
        </Heading>
        <Text size="body-md" color="secondary" className="mt-1">
          Manage your personal credentials, workspace identity, and connected ecommerce integrations.
        </Text>
      </div>

      {/* Account Identity Card */}
      <Card padding="lg" className="border-line shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line-subtle pb-5">
          <div className="flex items-center gap-4">
            <Avatar name={name || email} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink text-base">{name || "Account Member"}</span>
                <Badge variant="success">
                  {profileData?.role ?? "OWNER"}
                </Badge>
                <Badge variant="neutral">
                  {profileData?.planName ?? "Starter Plan"}
                </Badge>
              </div>
              <div className="text-xs text-ink-tertiary mt-0.5">{email}</div>
              {profileData?.memberSince && (
                <div className="text-[11px] text-ink-tertiary mt-0.5">
                  Member since {new Date(profileData.memberSince).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            id="name"
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />

          <Input
            id="email"
            label="Login email address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helpText={isEmailChanged ? "Changing your login email requires password verification." : undefined}
          />

          {isEmailChanged && (
            <div className="rounded-lg border border-line bg-surface-muted p-4 space-y-3">
              <Text size="body-sm" color="primary" className="font-medium">
                Confirm email change
              </Text>
              <Input
                id="currentPasswordForEmail"
                label="Enter current password to verify"
                type="password"
                required
                value={currentPasswordForEmail}
                onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
              />
            </div>
          )}

          <Input
            id="orgName"
            label="Workspace name"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="My Ecommerce Agency"
          />

          {profileError && <Alert variant="danger">{profileError}</Alert>}
          {profileMessage && <Alert variant="success">{profileMessage}</Alert>}

          <div className="pt-2">
            <Button type="submit" variant="primary" loading={profileSaving} className="bg-[#0E8F5D] hover:bg-[#0C7A52]">
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Connected Accounts Card */}
      <Card padding="lg" className="border-line shadow-xs space-y-4">
        <div>
          <Heading as="h2" size="h4">
            Connected Accounts & Integrations
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Manage linked store channels and authentication identities.
          </Text>
        </div>

        <div className="divide-y divide-line-subtle border-t border-line-subtle">
          {/* Etsy Connected Account */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
                    Link your store to unlock personalized sales and conversion analytics.
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
            <div className="flex items-center gap-3">
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
                  <Badge variant="success">OAuth 2.0</Badge>
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Seamless workspace access with Google identity federation ({email}).
                </p>
              </div>
            </div>
          </div>

          {/* Email Authentication Identity */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
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

      {/* Password & Security Card */}
      <Card padding="lg" className="border-line shadow-xs space-y-5">
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

          {passwordError && <Alert variant="danger">{passwordError}</Alert>}
          {passwordMessage && <Alert variant="success">{passwordMessage}</Alert>}

          <div className="pt-2">
            <Button type="submit" variant="primary" loading={passwordSaving} className="bg-[#0E8F5D] hover:bg-[#0C7A52]">
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger Zone Card */}
      <Card padding="lg" className="border-warn/40 bg-surface shadow-xs space-y-4">
        <div>
          <Heading as="h2" size="h4" className="text-warn-strong">
            Account Management & Danger Zone
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-1">
            Permanent account deletion, workspace export, or cancellation of stored research data.
          </Text>
        </div>

        <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-3 text-xs text-ink-secondary">
          <p>
            To delete your account and all associated workspace search configurations, tracked shops, and saved prospect data, please ensure all active subscriptions are cancelled in the <Link href="/settings/billing" className="text-brand-primary underline">Billing Center</Link>, then contact our support team.
          </p>
          <div className="pt-1">
            <a
              href="mailto:support@sellersalt.com?subject=Account Deletion Request&body=Please permanently delete my SellerSalt account and associated workspace data."
              className="inline-block"
            >
              <Button variant="destructive" size="compact" className="text-xs">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Request Account Deletion
              </Button>
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
