"use client";

import { useEffect, useState } from "react";
import { UserPlus, X, Mail, Shield, User } from "lucide-react";
import {
  Card,
  Button,
  Input,
  Select,
  Heading,
  Text,
  Badge,
  Alert,
  Avatar,
  IconButton,
} from "@/components/ui";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
  joinedAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function loadAll() {
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      setMembers(data.members ?? []);
      setInvites(data.invites ?? []);
    } catch {
      // Degrade gracefully
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      setSending(false);

      if (!res.ok) {
        setError(data.error ?? "Failed to send invite.");
        return;
      }

      setEmail("");
      setRole("MEMBER");
      setShowForm(false);
      loadAll();
    } catch {
      setError("Network error sending invite.");
      setSending(false);
    }
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/team/invites/${id}`, { method: "DELETE" });
    loadAll();
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Heading as="h1" size="h2">
            Team Members
          </Heading>
          <Text size="body-md" color="secondary" className="mt-1">
            Manage who has access to your SellerSalt research streams and competitor tracking.
          </Text>
        </div>

        {!showForm && (
          <Button
            variant="primary"
            size="default"
            onClick={() => setShowForm(true)}
            className="gap-1.5 shadow-sm font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            Invite Colleague
          </Button>
        )}
      </div>

      {/* Invite Form */}
      {showForm && (
        <Card padding="lg" className="border-line shadow-xs space-y-4">
          <div>
            <Heading as="h2" size="h4">
              Invite Someone to Workspace
            </Heading>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              They will receive an email link allowing them to join with their own login.
            </Text>
          </div>

          <form onSubmit={handleInvite} className="space-y-4">
            <Input
              id="inviteEmail"
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
            />

            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: "MEMBER", label: "Member (Research & discover access)" },
                { value: "ADMIN", label: "Admin (Full team & billing management)" },
              ]}
            />

            {error && <Alert variant="danger">{error}</Alert>}

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" variant="primary" loading={sending}>
                Send Invitation
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Members & Invites Cards */}
      {loading ? (
        <Text size="body-sm" color="tertiary">Loading team members...</Text>
      ) : (
        <div className="space-y-6">
          {/* Active Members Card */}
          <Card padding="lg" className="border-line shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <Heading as="h2" size="h4">
                Active Members
              </Heading>
              <Badge variant="neutral" className="text-xs">
                {members.length} Member{members.length === 1 ? "" : "s"}
              </Badge>
            </div>

            <div className="divide-y divide-line-subtle">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name || m.email} size="md" />
                    <div>
                      <div className="text-sm font-semibold text-ink">{m.name || m.email}</div>
                      <div className="text-xs text-ink-tertiary">{m.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-tertiary">
                      Joined {new Date(m.joinedAt).toLocaleDateString()}
                    </span>
                    <Badge
                      variant={m.role === "OWNER" ? "success" : m.role === "ADMIN" ? "info" : "neutral"}
                      className="font-medium text-xs"
                    >
                      {m.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pending Invites Card */}
          {invites.length > 0 && (
            <Card padding="lg" className="border-line shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <Heading as="h2" size="h4">
                  Pending Invitations
                </Heading>
                <Badge variant="warning" className="text-xs">
                  {invites.length} Pending
                </Badge>
              </div>

              <div className="divide-y divide-line-subtle">
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warn-subtle text-warn-strong text-xs font-bold">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-ink">{i.email}</div>
                        <div className="text-xs text-ink-tertiary">
                          Invited as {i.role} · Expires {new Date(i.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={() => handleRevoke(i.id)}
                      className="text-xs text-danger hover:text-danger hover:border-danger/30"
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
