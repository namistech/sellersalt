"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

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
        setOrganizationName(d.organizationName ?? "");
        setMemberSince(d.memberSince ?? null);
        setLoading(false);
      });
  }, []);

  const initial = (name || email || "?").charAt(0).toUpperCase();

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setProfileSaving(true);
    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, organizationName }),
    });
    setProfileSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setProfileError(data.error ?? "Failed to save.");
      return;
    }
    setProfileMessage("Saved.");
    setTimeout(() => setProfileMessage(null), 2000);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }

    setPasswordSaving(true);
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
    setPasswordMessage("Password updated.");
    setTimeout(() => setPasswordMessage(null), 2000);
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Profile</h1>
        <p className="mt-1 text-sm text-muted">Your account and workspace details.</p>
      </header>

      <div className="space-y-6">
        <div className="card max-w-lg">
          <div className="mb-4 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-xl font-semibold text-white">
              {initial}
            </span>
            <div>
              <div className="text-sm font-medium text-ink">{name || "Unnamed"}</div>
              <div className="text-xs text-muted">{email}</div>
              {memberSince && (
                <div className="mt-0.5 text-xs text-muted">
                  Member since {new Date(memberSince).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Your name</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input opacity-60" value={email} disabled />
              <p className="mt-1 text-xs text-muted">Contact us to change the email tied to your login.</p>
            </div>
            <div>
              <label className="label" htmlFor="orgName">Workspace name</label>
              <input
                id="orgName"
                className="input"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </div>
            {profileError && <p className="text-sm text-danger">{profileError}</p>}
            {profileMessage && <p className="text-sm text-success">{profileMessage}</p>}
            <button type="submit" disabled={profileSaving} className="btn-primary">
              {profileSaving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>

        <div className="card max-w-lg">
          <h2 className="mb-4 text-sm font-semibold text-ink">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label" htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                type="password"
                className="input"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                className="input"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
            {passwordMessage && <p className="text-sm text-success">{passwordMessage}</p>}
            <button type="submit" disabled={passwordSaving} className="btn-primary">
              {passwordSaving ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
