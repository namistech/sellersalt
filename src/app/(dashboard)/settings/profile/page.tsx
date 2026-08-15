"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Button,
  Input,
  Heading,
  Text,
  Alert,
  Avatar,
} from "@/components/ui";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [memberSince, setMemberSince] = useState<string | null>(null);

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
      .then((d) => {
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setOriginalEmail(d.email ?? "");
        setOrganizationName(d.organizationName ?? "");
        setMemberSince(d.memberSince ?? null);
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
      setProfileMessage("Profile updated successfully.");
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
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <Heading as="h1" size="h2">
          Profile & Account
        </Heading>
        <Text size="body-md" color="secondary" className="mt-1">
          Manage your personal details, workspace identity, and security credentials.
        </Text>
      </div>

      {/* Profile Card */}
      <Card padding="lg" className="border-line shadow-xs space-y-6">
        <div className="flex items-center gap-4 border-b border-line-subtle pb-5">
          <Avatar name={name || email} size="lg" />
          <div>
            <div className="font-semibold text-ink text-base">{name || "Unnamed Account"}</div>
            <div className="text-xs text-ink-tertiary">{email}</div>
            {memberSince && (
              <div className="mt-0.5 text-xs text-ink-tertiary">
                Member since {new Date(memberSince).toLocaleDateString()}
              </div>
            )}
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
            <Button type="submit" variant="primary" loading={profileSaving}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Password Card */}
      <Card padding="lg" className="border-line shadow-xs space-y-5">
        <div>
          <Heading as="h2" size="h4">
            Security & Password
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Update your password to keep your SellerSalt account protected.
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
            <Button type="submit" variant="primary" loading={passwordSaving}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
