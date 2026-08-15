"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { AuthLayout } from "../auth-layout";
import { Button, Input, Alert, Text } from "@/components/ui";

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
      setInvalid("Missing or invalid invite token.");
      setLoading(false);
      return;
    }
    fetch(`/api/team/accept-invite?token=${token}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) {
          setInvalid(d.error ?? "This invite is invalid or has expired.");
        } else {
          setEmail(d.email);
          setOrganizationName(d.organizationName);
          setUserExists(d.userExists);
        }
        setLoading(false);
      })
      .catch(() => {
        setInvalid("Failed to verify invite.");
        setLoading(false);
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
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
    } catch {
      setSubmitError("Network error accepting invite.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Text size="body-sm" color="tertiary">Verifying workspace invitation...</Text>;
  }

  if (invalid) {
    return (
      <div className="space-y-6">
        <Alert variant="danger">{invalid}</Alert>
        <Link href="/login" className="block text-center text-sm font-semibold text-brand-primary hover:underline">
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-surface-muted p-4">
        <Text size="body-sm" color="primary">
          You have been invited to join <strong className="text-ink">{organizationName}</strong> as{" "}
          <strong className="text-ink">{email}</strong>.
        </Text>
      </div>

      {userExists ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Text size="body-sm" color="secondary">
            Your account is already registered. Click below to accept the invitation and access the workspace.
          </Text>
          {submitError && <Alert variant="danger">{submitError}</Alert>}
          <Button type="submit" variant="primary" loading={submitting} fullWidth className="!py-3 text-base">
            Accept & Continue to Sign In
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="name"
            label="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />

          <Input
            id="password"
            label="Set account password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />

          {submitError && <Alert variant="danger">{submitError}</Alert>}

          <Button type="submit" variant="primary" loading={submitting} fullWidth className="!py-3 text-base">
            Create Account & Join Workspace
          </Button>
        </form>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <AuthLayout>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
        Join Workspace
      </h1>
      <Text size="body-sm" color="secondary" className="mb-8">
        Accept your team invitation to access SellerSalt intelligence.
      </Text>

      <Suspense fallback={<Text size="body-sm" color="tertiary">Loading invitation...</Text>}>
        <AcceptInviteForm />
      </Suspense>
    </AuthLayout>
  );
}
