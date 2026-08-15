"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Mail, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Card, Input, Button, Heading, Text, Alert } from "@/components/ui";
import { maskEmail } from "@/lib/mask-email";

const RESEND_COOLDOWN_SECONDS = 60;

type StatusParam = "invalid" | "expired" | "already-verified" | null;

const STATUS_COPY: Record<Exclude<StatusParam, null>, { title: string; body: string; variant: "warning" | "success" }> = {
  invalid: {
    title: "That verification link isn't valid",
    body: "It may have been copied incorrectly. Request a fresh link below.",
    variant: "warning",
  },
  expired: {
    title: "That verification link has expired",
    body: "Verification links are only valid for 24 hours. Request a fresh one below.",
    variant: "warning",
  },
  "already-verified": {
    title: "Your email is already verified",
    body: "That link was already used — no further action needed.",
    variant: "success",
  },
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailScreen />
    </Suspense>
  );
}

function VerifyEmailScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  const statusParam = searchParams.get("status") as StatusParam;
  const isAuthenticated = sessionStatus === "authenticated";
  const sessionEmail = (session?.user as any)?.email as string | undefined;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function sendVerification(targetEmail: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      if (!res.ok) {
        setError("Couldn't send the verification email. Please try again.");
        return;
      }
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Network error sending verification email.");
    } finally {
      setLoading(false);
    }
  }

  function handleManualResend(e: React.FormEvent) {
    e.preventDefault();
    sendVerification(email);
  }

  // Re-checks the current session's dashboard access — if the account is
  // now verified, the (dashboard) layout will let it through; if not,
  // it redirects straight back here.
  function handleCheckVerified() {
    setChecking(true);
    router.push("/dashboard");
    router.refresh();
  }

  const displayEmail = isAuthenticated ? sessionEmail : email;

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
            {isAuthenticated
              ? "Confirm your email address to unlock your SellerSalt dashboard."
              : "Check your inbox for a verification link to confirm your account and activate your workspace."}
          </Text>
        </div>

        {statusParam && STATUS_COPY[statusParam] && (
          <Alert variant={STATUS_COPY[statusParam].variant} title={STATUS_COPY[statusParam].title}>
            {STATUS_COPY[statusParam].body}
          </Alert>
        )}

        <Card padding="lg" className="border-line shadow-xs bg-white space-y-4">
          {isAuthenticated && sessionEmail ? (
            <div className="space-y-4">
              <div className="text-center space-y-1 py-2">
                <Mail className="h-8 w-8 text-[#0E8F5D] mx-auto" />
                <div className="text-sm font-semibold text-ink">
                  We sent a link to <strong>{maskEmail(sessionEmail)}</strong>
                </div>
                <p className="text-xs text-ink-secondary">
                  Click the link in that email, then come back and continue.
                </p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}
              {sent && !error && (
                <Alert variant="success">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Verification email sent — check your inbox.
                  </span>
                </Alert>
              )}

              <div className="space-y-2">
                <Button variant="primary" fullWidth loading={checking} onClick={handleCheckVerified} className="bg-[#0E8F5D] hover:bg-[#0C7A52]">
                  I've verified my email — Continue <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  loading={loading}
                  disabled={cooldown > 0}
                  onClick={() => sendVerification(sessionEmail)}
                  leadingIcon={cooldown > 0 ? <Clock className="h-3.5 w-3.5" /> : undefined}
                >
                  {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
                </Button>
              </div>

              <div className="pt-2 text-center text-xs text-ink-tertiary">
                Signed up with the wrong email?{" "}
                <a href="mailto:support@sellersalt.com" className="text-[#0E8F5D] font-semibold hover:underline">
                  Contact support
                </a>{" "}
                to have it corrected.
              </div>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full text-center text-xs font-semibold text-ink-tertiary hover:text-ink pt-1"
              >
                Sign out
              </button>
            </div>
          ) : sent ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="h-8 w-8 text-[#0E8F5D] mx-auto" />
              <div className="text-sm font-semibold text-ink">Verification email sent!</div>
              <p className="text-xs text-ink-secondary">
                If an account exists for <strong className="text-ink">{displayEmail}</strong>, a confirmation link has been sent.
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
            <form onSubmit={handleManualResend} className="space-y-4">
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
                disabled={cooldown > 0}
                className="bg-[#0E8F5D] hover:bg-[#0C7A52]"
              >
                {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend Verification Link"}
              </Button>
            </form>
          )}
        </Card>

        {!isAuthenticated && (
          <div className="text-center text-xs text-ink-tertiary">
            Already verified?{" "}
            <Link href="/login" className="text-[#0E8F5D] font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
