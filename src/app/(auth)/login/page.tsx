"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { Eye, EyeOff, Store, Fingerprint } from "lucide-react";
import { AuthLayout } from "../auth-layout";
import { Button, Input, Alert, Heading, Text, Divider } from "@/components/ui";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Could not start the sign-in request with that provider. Please try again.",
  OAuthCallback: "That provider's response couldn't be verified. This is usually a temporary issue — please try again.",
  OAuthCreateAccount: "We couldn't create an account from that provider's info. Try signing in with email instead.",
  OAuthAccountNotLinked: "That email is already registered with a different sign-in method. Sign in with your original method, or use a different account.",
  AccessDenied: "Access was denied — you cancelled the authorization, or your account isn't allowed to sign in this way.",
  Configuration: "Sign-in is temporarily misconfigured on our end. Please try again shortly or use email sign-in.",
  Verification: "That sign-in link is invalid or has expired.",
  ACCOUNT_SUSPENDED: "This account has been suspended. Contact support@sellersalt.com if you believe this is a mistake.",
  Default: "Something went wrong signing you in. Please try again.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("error");
    if (code) {
      setError(OAUTH_ERROR_MESSAGES[code] ?? OAUTH_ERROR_MESSAGES.Default);
      return;
    }
    if (searchParams.get("verified") === "1") {
      setNotice("Email confirmed — you're all set. Sign in below.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      code: needsTwoFactor ? twoFactorCode : undefined,
      redirect: false,
    });
    setLoading(false);

    if (res?.error === "2FA_REQUIRED") {
      setNeedsTwoFactor(true);
      return;
    }
    if (res?.error === "2FA_INVALID") {
      setError("That code isn't valid. Check your authenticator app, or use a backup code.");
      return;
    }
    if (res?.error === "ACCOUNT_SUSPENDED") {
      setError(OAUTH_ERROR_MESSAGES.ACCOUNT_SUSPENDED);
      setNeedsTwoFactor(false);
      return;
    }
    if (res?.error) {
      setError("That email and password don't match an account.");
      setNeedsTwoFactor(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handlePasskeyLogin() {
    setError(null);
    if (!window.PublicKeyCredential) {
      setError("Passkeys aren't supported in this browser.");
      return;
    }
    setOauthLoading("passkey");
    try {
      const optionsRes = await fetch("/api/auth/passkey/options", { method: "POST" });
      if (!optionsRes.ok) {
        setError("Could not start passkey sign-in. Please try again.");
        return;
      }
      const { options, challengeToken } = await optionsRes.json();

      const assertion = await startAuthentication({ optionsJSON: options });

      const res = await signIn("passkey", {
        response: JSON.stringify(assertion),
        challengeToken,
        redirect: false,
      });

      if (res?.error === "ACCOUNT_SUSPENDED") {
        setError(OAUTH_ERROR_MESSAGES.ACCOUNT_SUSPENDED);
        return;
      }
      if (res?.error) {
        setError("That passkey isn't recognized. Please try again or use another sign-in method.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Passkey sign-in was cancelled.");
      } else {
        setError(err.message || "Passkey sign-in failed.");
      }
    } finally {
      setOauthLoading(null);
    }
  }

  async function handleOAuth(provider: "google" | "etsy") {
    setError(null);
    setOauthLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch {
      setError(`Failed to connect with ${provider}.`);
      setOauthLoading(null);
    }
  }

  return (
    <AuthLayout>
      <Heading as="h1" size="h2" className="mb-2 text-ink">
        Sign in to your workspace
      </Heading>
      <Text size="body-sm" color="secondary" className="mb-6">
        Access your Opportunity Radar, competitor spy data, and tracked Etsy shops.
      </Text>

      {notice && (
        <Alert variant="success" className="mb-6">
          {notice}
        </Alert>
      )}

      {/* Social / OAuth Logins */}
      {!needsTwoFactor && (
      <div className="space-y-2.5 mb-6">
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={Boolean(oauthLoading) || loading}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted transition shadow-2xs disabled:opacity-50"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
            />
          </svg>
          <span>{oauthLoading === "google" ? "Connecting Google…" : "Continue with Google"}</span>
        </button>

        <button
          type="button"
          onClick={() => handleOAuth("etsy")}
          disabled={Boolean(oauthLoading) || loading}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-[#F1641E]/40 bg-[#F1641E]/5 px-4 py-2.5 text-sm font-semibold text-[#D9531E] hover:bg-[#F1641E]/10 transition shadow-2xs disabled:opacity-50"
        >
          <Store className="h-4 w-4 shrink-0 text-[#F1641E]" />
          <span>{oauthLoading === "etsy" ? "Connecting Etsy…" : "Sign in with Etsy Store"}</span>
        </button>

        <button
          type="button"
          onClick={handlePasskeyLogin}
          disabled={Boolean(oauthLoading) || loading}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted transition shadow-2xs disabled:opacity-50"
        >
          <Fingerprint className="h-4 w-4 shrink-0 text-[#0E8F5D]" />
          <span>{oauthLoading === "passkey" ? "Verifying passkey…" : "Sign in with a passkey"}</span>
        </button>
      </div>
      )}

      {!needsTwoFactor && (
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-line-subtle" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-ink-tertiary font-medium">Or continue with email</span>
          </div>
        </div>
      )}

      {needsTwoFactor ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Heading as="h2" size="h4" className="text-ink mb-1">
              Enter your verification code
            </Heading>
            <Text size="body-sm" color="secondary">
              Open your authenticator app for the code, or enter one of your backup codes.
            </Text>
          </div>

          <Input
            id="twoFactorCode"
            label="6-digit code or backup code"
            type="text"
            required
            autoFocus
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            placeholder="123456"
            autoComplete="one-time-code"
          />

          {error && <Alert variant="danger">{error}</Alert>}

          <div className="pt-2 space-y-2">
            <Button type="submit" variant="primary" loading={loading} fullWidth className="!py-3 text-base font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52]">
              Verify & sign in
            </Button>
            <button
              type="button"
              onClick={() => {
                setNeedsTwoFactor(false);
                setTwoFactorCode("");
                setError(null);
              }}
              className="w-full text-center text-xs font-semibold text-ink-tertiary hover:text-ink"
            >
              ← Back
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="text-label-md font-medium text-ink">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-semibold text-[#0E8F5D] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <div className="pt-2">
            <Button type="submit" variant="primary" loading={loading} fullWidth className="!py-3 text-base font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52]">
              Sign in to SellerSalt
            </Button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-tertiary">
        Don't have an account yet?{" "}
        <Link href="/checkout?plan=PRO" className="font-semibold text-[#0E8F5D] hover:underline">
          Start $1 Trial
        </Link>
      </p>
    </AuthLayout>
  );
}
