"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, Input, Button, Heading, Text, Alert } from "@/components/ui";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setLoading(false);
      if (!res.ok) {
        setError("Failed to dispatch verification email.");
        return;
      }
      setSent(true);
    } catch {
      setLoading(false);
      setError("Network error sending verification email.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#FAFAF8]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#E7FAF1] text-[#0E8F5D] mb-2">
            <Mail className="h-6 w-6" />
          </div>
          <Heading as="h1" size="h3">
            Verify Your Email
          </Heading>
          <Text size="body-sm" color="secondary">
            Check your inbox for a verification link to confirm your account and activate your workspace.
          </Text>
        </div>

        <Card padding="lg" className="border-line shadow-xs bg-white space-y-4">
          {sent ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="h-8 w-8 text-[#0E8F5D] mx-auto" />
              <div className="text-sm font-semibold text-ink">Verification email sent!</div>
              <p className="text-xs text-ink-secondary">
                If an account exists for <strong className="text-ink">{email}</strong>, a confirmation link has been sent.
              </p>
              <div className="pt-2">
                <Link href="/login">
                  <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52]">
                    Return to Login <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResend} className="space-y-4">
              <Input
                id="email"
                label="Account Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              {error && <Alert variant="danger">{error}</Alert>}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                className="bg-[#0E8F5D] hover:bg-[#0C7A52]"
              >
                Resend Verification Link
              </Button>
            </form>
          )}
        </Card>

        <div className="text-center text-xs text-ink-tertiary">
          Already verified?{" "}
          <Link href="/login" className="text-[#0E8F5D] font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
