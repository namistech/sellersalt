"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";

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
    const res = await fetch("/api/team");
    const data = await res.json();
    setMembers(data.members ?? []);
    setInvites(data.invites ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
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
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/team/invites/${id}`, { method: "DELETE" });
    loadAll();
  }

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Team</h1>
          <p className="mt-1 text-sm text-muted">Everyone with access to this workspace.</p>
        </div>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <UserPlus className="mr-1.5 inline h-4 w-4" />
            Invite
          </button>
        )}
      </header>

      {showForm && (
        <form onSubmit={handleInvite} className="card mb-6 max-w-md space-y-4">
          <h2 className="text-sm font-semibold text-ink">Invite someone</h2>
          <div>
            <label className="label" htmlFor="inviteEmail">Email</label>
            <input
              id="inviteEmail"
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="inviteRole">Role</label>
            <select id="inviteRole" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="btn-primary">
              {sending ? "Sending…" : "Send invite"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-ink">Members</h2>
            <div className="divide-y divide-line">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-ink">{m.name || m.email}</div>
                    <div className="text-xs text-muted">{m.email}</div>
                  </div>
                  <span className="badge bg-accent-soft text-accent">{m.role}</span>
                </div>
              ))}
            </div>
          </div>

          {invites.length > 0 && (
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-ink">Pending invites</h2>
              <div className="divide-y divide-line">
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <div className="text-sm font-medium text-ink">{i.email}</div>
                      <div className="text-xs text-muted">
                        {i.role} · expires {new Date(i.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(i.id)}
                      aria-label="Revoke invite"
                      className="text-muted hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
