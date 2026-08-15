"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "../auth-layout";
import { Button, Input, Alert, Text } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send reset link.");
      } else {
        setMessage(data.message ?? "If an account exists for that email, we've sent a reset link.");
      }
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
        Reset your password
      </h1>
      <Text size="body-sm" color="secondary" className="mb-8">
        Enter the email address tied to your account and we'll send you a secure password reset link.
      </Text>

      {message ? (
        <div className="space-y-6">
          <Alert variant="success">{message}</Alert>
          <Link href="/login" className="block text-center text-sm font-semibold text-brand-primary hover:underline">
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="email"
            label="Email address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          {error && <Alert variant="danger">{error}</Alert>}

          <Button type="submit" variant="primary" loading={loading} fullWidth className="!py-3 text-base">
            Send reset link
          </Button>

          <p className="text-center text-sm text-ink-tertiary">
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-brand-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
