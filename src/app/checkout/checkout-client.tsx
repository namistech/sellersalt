"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck, Zap, Lock, Eye, EyeOff, Sparkles, ArrowRight, HelpCircle } from "lucide-react";
import {
  Card,
  Input,
  Button,
  Alert,
  Badge,
  Heading,
  Text,
  Divider,
} from "@/components/ui";
import { checkPasswordStrength } from "@/lib/password-policy";

export interface PackageData {
  key: string;
  name: string;
  priceUsd: number;
  trialDays: number | null;
  trialPriceUsd: number | null;
  maxConnectors: number;
  maxSearchConfigs: number;
  maxTrackedShops: number;
  maxProspectsPerMonth: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  STRIPE: "Pay with Card (Stripe)",
  PAYPAL: "Pay with PayPal",
  SAFEPAY: "Pay with Safepay",
  PAYFAST: "Pay with PayFast (Debit / Credit)",
};

export function CheckoutClient({
  packages,
  preselectedKey,
  availableProviders,
}: {
  packages: PackageData[];
  preselectedKey: string;
  availableProviders: string[];
}) {
  const router = useRouter();
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [selectedKey, setSelectedKey] = useState(preselectedKey);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpened, setCheckoutOpened] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    trialPriceUsd: number | null;
    priceUsd: number;
  } | null>(null);

  // Account section
  const [accountMode, setAccountMode] = useState<"signup" | "login">("signup");
  const [accountForm, setAccountForm] = useState({
    name: "",
    organizationName: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  const selected = packages.find((p) => p.key === selectedKey) ?? packages[0];
  const isFreePlan = selected.key === "FREE" || selected.priceUsd === 0;

  function selectPlan(key: string) {
    setSelectedKey(key);
    setAppliedCoupon(null);
    setCouponError(null);
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponError(null);
    setCouponApplying(true);
    try {
      const res = await fetch("/api/billing/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, packageKey: selected.key }),
      });
      const data = await res.json();
      if (!data.valid) {
        setCouponError(data.error ?? "Invalid coupon code.");
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon({
        code: couponInput.trim().toUpperCase(),
        trialPriceUsd: data.trialPriceUsd,
        priceUsd: data.priceUsd,
      });
    } catch {
      setCouponError("Something went wrong validating coupon.");
    } finally {
      setCouponApplying(false);
    }
  }

  const displayTrialPriceUsd = appliedCoupon ? appliedCoupon.trialPriceUsd : selected.trialPriceUsd;
  const displayPriceUsd = appliedCoupon ? appliedCoupon.priceUsd : selected.priceUsd;
  const dueToday = isFreePlan
    ? 0
    : displayTrialPriceUsd !== null && displayTrialPriceUsd !== undefined
    ? displayTrialPriceUsd
    : displayPriceUsd;

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    setAccountSubmitting(true);

    if (accountMode === "signup") {
      const strength = checkPasswordStrength(accountForm.password);
      if (!strength.valid) {
        setAccountError(`Password must include: ${strength.errors.join(", ")}.`);
        setAccountSubmitting(false);
        return;
      }

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...accountForm,
          targetPlan: selected.key,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAccountError(data.error ?? "Something went wrong creating your account.");
        setAccountSubmitting(false);
        return;
      }
    }

    const signInRes = await signIn("credentials", {
      email: accountForm.email,
      password: accountForm.password,
      redirect: false,
    });
    setAccountSubmitting(false);

    if (signInRes?.error) {
      setAccountError(
        accountMode === "signup"
          ? "Account created, but sign-in failed. Please try logging in."
          : "Invalid email or password."
      );
      return;
    }
    await updateSession();

    if (isFreePlan) {
      router.push("/dashboard");
    }
  }

  async function handleCheckout(provider: string) {
    if (isFreePlan) {
      router.push("/dashboard");
      return;
    }

    setError(null);
    setLoadingProvider(provider);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageKey: selected.key,
          provider,
          couponCode: appliedCoupon?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not initiate checkout session.");
        setLoadingProvider(null);
        return;
      }
      const win = window.open(data.url, "_blank", "noopener,noreferrer");
      if (!win) {
        // Popup blocked — fall back to same-tab navigation
        window.location.href = data.url;
        return;
      }
      setCheckoutOpened(true);
    } catch {
      setError("Network error starting checkout. Please try again.");
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#141B16]">
      {/* Top Brand Bar */}
      <header className="border-b border-[#E3E6E0] bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#0E8F5D] text-white font-bold flex items-center justify-center text-base shadow-xs group-hover:bg-[#0C7A52] transition-colors">
              S
            </div>
            <span className="font-extrabold text-lg tracking-tight text-[#141B16]">
              SellerSalt
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#525B55]">
            <Lock className="h-3.5 w-3.5 text-[#0E8F5D]" />
            <span>Secure, Encrypted Checkout</span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Container */}
      <main className="max-w-6xl mx-auto px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ============================================================ */}
          {/* LEFT COLUMN: Account Authentication & Security Assurances   */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <Badge variant="success" className="mb-2.5 text-xs font-semibold text-[#0E8F5D] bg-[#E7FAF1] border border-[#0E8F5D]/20">
                <Sparkles className="h-3 w-3 mr-1 inline" /> Etsy E-Commerce Intelligence
              </Badge>
              <Heading as="h1" size="h2" className="text-2xl sm:text-3xl font-extrabold text-[#141B16]">
                Set Up Your SellerSalt Workspace
              </Heading>
              <Text size="body-md" color="secondary" className="mt-1 text-[#525B55]">
                {isAuthenticated
                  ? "Your account is verified. Select your preferred payment gateway on the right to start researching."
                  : "Create your login below to activate your Opportunity Radar and competitor research streams."}
              </Text>
            </div>

            {/* Account Card */}
            {isAuthenticated ? (
              <Card padding="lg" className="border-[#E3E6E0] bg-white shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center font-bold text-base border border-[#0E8F5D]/30">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#7C847E] uppercase tracking-wider">
                        Authenticated Workspace
                      </div>
                      <div className="text-sm font-bold text-[#141B16]">
                        {session?.user?.email}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="tertiary"
                    size="compact"
                    onClick={() => signOut({ callbackUrl: "/checkout" })}
                    className="text-xs text-[#7C847E] hover:text-[#141B16]"
                  >
                    Switch Account
                  </Button>
                </div>
              </Card>
            ) : (
              <Card padding="lg" className="border-[#E3E6E0] bg-white shadow-xs space-y-5">
                {/* Account Mode Toggle Tabs */}
                <div className="flex items-center border-b border-[#E3E6E0] pb-4 justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#141B16]">
                      {accountMode === "signup" ? "1. Create Your Account" : "1. Sign In to Existing Account"}
                    </h2>
                    <p className="text-xs text-[#7C847E] mt-0.5">
                      {accountMode === "signup"
                        ? "Instant setup — your credentials will be ready immediately."
                        : "Log in with your existing credentials to proceed to payment."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMode((m) => (m === "signup" ? "login" : "signup"));
                      setAccountError(null);
                    }}
                    className="text-xs font-bold text-[#0E8F5D] hover:underline"
                  >
                    {accountMode === "signup" ? "Log in instead →" : "New user? Sign up →"}
                  </button>
                </div>

                {/* 1-Click Social Sign In Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => signIn("google", { callbackUrl: "/checkout" })}
                    className="flex items-center justify-center gap-2 rounded-lg border border-[#E3E6E0] bg-white px-3 py-2 text-xs font-semibold text-[#141B16] hover:bg-[#FAFAF8] transition shadow-2xs"
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
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
                    <span>Continue with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => signIn("etsy", { callbackUrl: "/checkout" })}
                    className="flex items-center justify-center gap-2 rounded-lg border border-[#F1641E]/40 bg-[#F1641E]/5 px-3 py-2 text-xs font-semibold text-[#D9531E] hover:bg-[#F1641E]/10 transition shadow-2xs"
                  >
                    <span>Sign in with Etsy</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E3E6E0]" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white px-2 text-[#7C847E] font-medium">Or enter email below</span>
                  </div>
                </div>

                <form onSubmit={handleAccountSubmit} className="space-y-4">
                  {accountMode === "signup" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        id="organizationName"
                        label="Workspace / Business Name"
                        placeholder="e.g. Acme Etsy Labs"
                        value={accountForm.organizationName}
                        onChange={(e) =>
                          setAccountForm({ ...accountForm, organizationName: e.target.value })
                        }
                      />
                      <Input
                        id="name"
                        label="Your Full Name"
                        placeholder="e.g. Jane Doe"
                        value={accountForm.name}
                        onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                      />
                    </div>
                  )}

                  <Input
                    id="email"
                    label="Email Address"
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    autoComplete="email"
                  />

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="password" className="text-xs font-semibold text-[#141B16]">
                        Password
                      </label>
                      {/* Forgot password link on checkout login form (Part 25) */}
                      {accountMode === "signup" ? (
                        <span className="text-[11px] text-[#7C847E]">Min 8 characters</span>
                      ) : (
                        <Link
                          href="/forgot-password"
                          className="text-[11px] font-semibold text-[#0E8F5D] hover:underline"
                        >
                          Forgot password?
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={accountMode === "signup" ? 8 : undefined}
                        placeholder="••••••••••••"
                        value={accountForm.password}
                        onChange={(e) =>
                          setAccountForm({ ...accountForm, password: e.target.value })
                        }
                        autoComplete={accountMode === "signup" ? "new-password" : "current-password"}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7C847E] hover:text-[#141B16]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {accountMode === "signup" && (
                      <div className="mt-2 space-y-1.5">
                        <div className="text-[11px] text-[#7C847E]">
                          Use at least 8 characters, including a number and a symbol.
                        </div>
                      </div>
                    )}
                  </div>

                  {accountError && <Alert variant="danger">{accountError}</Alert>}

                  <Button
                    type="submit"
                    variant="primary"
                    size="default"
                    fullWidth
                    loading={accountSubmitting}
                    className="!py-3 text-sm font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white shadow-xs"
                  >
                    {accountSubmitting
                      ? "Verifying Account…"
                      : accountMode === "signup"
                      ? isFreePlan
                        ? "Create Account & Activate Free Explorer →"
                        : "Save Account & Continue to Payment →"
                      : "Sign In & Continue →"}
                  </Button>
                </form>
              </Card>
            )}

            {/* Trust & Guarantee Section */}
            <Card padding="md" className="border-[#E3E6E0] bg-white shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#525B55]">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#0E8F5D] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#141B16]">Zero Lock-In</strong>
                    Cancel anytime with 1-click in billing settings.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Zap className="h-4 w-4 text-[#0E8F5D] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#141B16]">Instant Access</strong>
                    Full Opportunity Radar, competitor spy, and live Etsy scrapers unlock immediately.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Lock className="h-4 w-4 text-[#0E8F5D] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#141B16]">Secure Billing</strong>
                    Tokenized and processed securely via certified gateways.
                  </div>
                </div>
              </div>
            </Card>

            <p className="text-[11px] text-[#7C847E] leading-relaxed">
              By proceeding with checkout, you agree to SellerSalt's{" "}
              <Link href="/terms" target="_blank" className="text-[#141B16] underline font-medium">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-[#141B16] underline font-medium">
                Privacy Policy
              </Link>
              . You may cancel your subscription at any time from your billing settings to prevent future charges.
            </p>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: Plan Summary, Pricing Breakdown & Gateway CTA */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 space-y-6">
            {/* Plan Card with Visually Dominant Selection (Part 24) */}
            <Card padding="lg" className="border-2 border-[#0E8F5D] bg-white shadow-md space-y-5 relative">
              {/* Selected Tier Banner */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0E8F5D]" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0E8F5D]">
                      Selected Plan
                    </span>
                  </div>
                  <Badge variant="success" className="text-[11px] font-semibold text-[#0E8F5D] bg-[#E7FAF1] border border-[#16C784]/30">
                    {isFreePlan ? "Free Explorer" : selected.trialDays ? `${selected.trialDays}-Day Trial` : "Monthly Subscription"}
                  </Badge>
                </div>

                {/* Plan Option Switcher */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#FAFAF8] border border-[#E3E6E0]">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.key}
                      type="button"
                      onClick={() => selectPlan(pkg.key)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                        selected.key === pkg.key
                          ? "bg-[#0E8F5D] text-white shadow-xs"
                          : "text-[#525B55] hover:text-[#141B16] hover:bg-white"
                      }`}
                    >
                      {pkg.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E3E6E0] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#525B55]">
                  <span>Tier</span>
                  <span className="font-bold text-[#141B16]">{selected.name}</span>
                </div>

                {selected.trialDays && !isFreePlan && (
                  <div className="flex items-center justify-between text-xs text-[#525B55]">
                    <span>{selected.trialDays}-Day Full Access Trial</span>
                    <span className="font-mono font-bold text-[#0E8F5D]">
                      ${(displayTrialPriceUsd ?? 1).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-[#525B55]">
                  <span>Recurring monthly billing</span>
                  <span className="font-mono font-semibold text-[#141B16]">
                    {isFreePlan ? "$0.00 / mo" : `$${displayPriceUsd.toFixed(2)} / mo`}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-xs text-[#0E8F5D] font-medium pt-1 border-t border-[#E3E6E0]">
                    <span>Coupon "{appliedCoupon.code}" Discount</span>
                    <span>Applied ✓</span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#E3E6E0] flex items-baseline justify-between">
                  <div className="text-xs font-bold text-[#141B16] uppercase tracking-wider">
                    Total Due Today:
                  </div>
                  <div className="text-2xl font-extrabold font-mono text-[#141B16]">
                    ${dueToday.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Coupon Code Input */}
              {!isFreePlan && (
                <div>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg bg-[#E7FAF1] px-3.5 py-2 text-xs text-[#0E8F5D] font-medium border border-[#0E8F5D]/30">
                      <span>Coupon "{appliedCoupon.code}" active</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponInput("");
                        }}
                        className="font-bold underline hover:text-[#0C7A52]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Promo or Coupon Code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={handleApplyCoupon}
                        loading={couponApplying}
                        disabled={!couponInput.trim()}
                        className="shrink-0 text-xs font-semibold px-4"
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                  {couponError && <p className="mt-1 text-xs text-danger">{couponError}</p>}
                </div>
              )}

              {/* Features Included List */}
              <div className="space-y-2 pt-2 border-t border-[#E3E6E0]">
                <div className="text-xs font-semibold text-[#141B16] uppercase tracking-wider">
                  Included with {selected.name}:
                </div>
                <ul className="space-y-2 text-xs text-[#525B55]">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0" />
                    <span><strong>{selected.maxSearchConfigs}</strong> Saved Keyword Searches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0" />
                    <span><strong>{selected.maxTrackedShops}</strong> Tracked Competitor Shops</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0" />
                    <span><strong>{selected.maxProspectsPerMonth.toLocaleString()}</strong> Prospect Lookups / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0" />
                    <span>Deterministic Opportunity Radar Scoring</span>
                  </li>
                </ul>
              </div>

              {/* Payment Action Section */}
              <div className="pt-3 border-t border-[#E3E6E0]">
                {!isAuthenticated ? (
                  <div className="p-3.5 rounded-lg bg-[#FAFAF8] border border-[#E3E6E0] text-center space-y-1">
                    <p className="text-xs font-semibold text-[#141B16]">
                      Create or sign in to your account on the left
                    </p>
                    <p className="text-[11px] text-[#7C847E]">
                      {isFreePlan
                        ? "Free workspace activates instantly upon authentication."
                        : "Payment methods will activate automatically once authenticated."}
                    </p>
                  </div>
                ) : isFreePlan ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="default"
                    fullWidth
                    onClick={() => router.push("/dashboard")}
                    className="!py-3.5 text-sm font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white shadow-sm"
                  >
                    Go to Your Free Workspace →
                  </Button>
                ) : availableProviders.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-[#141B16]">
                      Choose Payment Method:
                    </div>

                    {availableProviders.map((provider, i) => (
                      <Button
                        key={provider}
                        type="button"
                        variant={i === 0 ? "primary" : "secondary"}
                        size="default"
                        fullWidth
                        loading={loadingProvider === provider}
                        disabled={loadingProvider !== null}
                        onClick={() => handleCheckout(provider)}
                        className={
                          i === 0
                            ? "!py-3.5 text-sm font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white shadow-sm"
                            : "!py-3 text-xs font-semibold"
                        }
                      >
                        {loadingProvider === provider
                          ? "Connecting to Gateway…"
                          : PROVIDER_LABELS[provider] ?? provider}
                      </Button>
                    ))}

                    {checkoutOpened && (
                      <Alert variant="success">
                        Checkout opened in a new tab. Complete your payment there — you can return to this page once it's confirmed.
                      </Alert>
                    )}
                    {error && <Alert variant="danger">{error}</Alert>}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-center text-[#7C847E]">
                    Checkout is temporarily unavailable. Please contact{" "}
                    <a href="mailto:support@sellersalt.com" className="underline text-[#141B16]">
                      support@sellersalt.com
                    </a>.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
