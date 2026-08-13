"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [userExists, setUserExists] = useState(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setInvalid("Missing invite token.");
      setLoading(false);
      return;
    }
    fetch(`/api/team/accept-invite?token=${token}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) {
          setInvalid(d.error ?? "This invite is invalid.");
        } else {
          setEmail(d.email);
          setOrganizationName(d.organizationName);
          setUserExists(d.userExists);
        }
        setLoading(false);
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    const res = await fetch("/api/team/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(data.error ?? "Something went wrong.");
      return;
    }

    if (data.createdNewAccount) {
      await signIn("credentials", { email: data.email, password, redirect: false });
      router.push("/dashboard");
      router.refresh();
    } else {
      router.push("/login");
    }
  }

  if (loading) return <p className="text-center text-sm text-muted">Loading…</p>;

  if (invalid) {
    return (
      <div className="card text-center">
        <p className="text-sm text-danger">{invalid}</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="mb-4 text-sm text-ink">
        You've been invited to join <strong>{organizationName}</strong> as <strong>{email}</strong>.
      </p>

      {userExists ? (
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
          {submitting ? "Joining…" : "Accept & continue to sign in"}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Set a password</label>
            <input
              id="password"
              type="password"
              className="input"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {submitError && <p className="text-sm text-danger">{submitError}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Joining…" : "Accept invite"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-1 text-xl font-semibold tracking-tight text-ink">SellerSalt</div>
          <p className="text-sm text-muted">Join a workspace</p>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-muted">Loading…</p>}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </div>
  );
}
