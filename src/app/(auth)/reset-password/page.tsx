"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "../auth-layout";
import { Button, Input, Alert, Text } from "@/components/ui";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <Alert variant="danger">This password reset link is invalid or has expired.</Alert>
        <Link href="/forgot-password" className="block text-center text-sm font-semibold text-brand-primary hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6">
        <Alert variant="success">Password updated successfully! Redirecting you to sign in...</Alert>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
        placeholder="Re-enter your password"
        autoComplete="new-password"
      />

      {error && <Alert variant="danger">{error}</Alert>}

      <Button type="submit" variant="primary" loading={loading} fullWidth className="!py-3 text-base">
        Update password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
        Set a new password
      </h1>
      <Text size="body-sm" color="secondary" className="mb-8">
        Choose a secure password with at least 8 characters.
      </Text>

      <Suspense fallback={<Text size="body-sm" color="tertiary">Loading reset token...</Text>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
