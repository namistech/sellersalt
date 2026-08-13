"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";

interface PackageData {
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

const PROVIDER_LABELS: Record<string, string> = { STRIPE: "Pay with card", PAYPAL: "Pay with PayPal" };

export function CheckoutClient({
  packages,
  preselectedKey,
  availableProviders,
}: {
  packages: PackageData[];
  preselectedKey: string;
  availableProviders: string[];
}) {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [selectedKey, setSelectedKey] = useState(preselectedKey);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    trialPriceUsd: number | null;
    priceUsd: number;
  } | null>(null);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  // Account section — signup is the default for new visitors, with a
  // "log in instead" toggle for people who already have an account.
  const [accountMode, setAccountMode] = useState<"signup" | "login">("signup");
  const [accountForm, setAccountForm] = useState({ name: "", organizationName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  const selected = packages.find((p) => p.key === selectedKey) ?? packages[0];
  const others = packages.filter((p) => p.key !== selected.key);

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
      setAppliedCoupon({ code: couponInput.trim().toUpperCase(), trialPriceUsd: data.trialPriceUsd, priceUsd: data.priceUsd });
    } catch {
      setCouponError("Something went wrong. Try again.");
    } finally {
      setCouponApplying(false);
    }
  }

  const displayTrialPriceUsd = appliedCoupon ? appliedCoupon.trialPriceUsd : selected.trialPriceUsd;
  const displayPriceUsd = appliedCoupon ? appliedCoupon.priceUsd : selected.priceUsd;

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    setAccountSubmitting(true);

    if (accountMode === "signup") {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setAccountError(data.error ?? "Something went wrong.");
        setAccountSubmitting(false);
        return;
      }
    }

    // Same call establishes the session for both signup (right after account
    // creation) and login — no full-page redirect, so the payment section
    // below just becomes available in place once this resolves.
    const signInRes = await signIn("credentials", {
      email: accountForm.email,
      password: accountForm.password,
      redirect: false,
    });
    setAccountSubmitting(false);

    if (signInRes?.error) {
      setAccountError(
        accountMode === "signup"
          ? "Account created, but sign-in failed. Try logging in below."
          : "That email and password don't match an account."
      );
      return;
    }
    await updateSession();
  }

  async function handleCheckout(provider: string) {
    setError(null);
    setLoadingProvider(provider);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageKey: selected.key, provider, couponCode: appliedCoupon?.code }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't start checkout.");
        setLoadingProvider(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Try again.");
      setLoadingProvider(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
          SellerSalt
        </Link>
      </header>

      <div className="mx-auto max-w-xl px-6 py-14">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Start your subscription</h1>
        <p className="mb-8 text-sm text-muted">
          {isAuthenticated
            ? "One step left — pick your plan and payment method to get started."
            : "Create your account and pick a plan — takes under a minute."}
        </p>

        {/* Account section — collapses to a simple confirmation once signed in */}
        {isAuthenticated ? (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
            <span className="text-sm text-ink">
              Signed in as <span className="font-medium">{session?.user?.email}</span>
            </span>
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-line bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">
                {accountMode === "signup" ? "Create your account" : "Log in"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setAccountMode((m) => (m === "signup" ? "login" : "signup"));
                  setAccountError(null);
                }}
                className="text-xs font-medium text-accent hover:underline"
              >
                {accountMode === "signup" ? "Already have an account? Log in" : "Need an account? Sign up"}
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="space-y-3">
              {accountMode === "signup" && (
                <>
                  <input
                    className="input"
                    placeholder="Workspace name"
                    value={accountForm.organizationName}
                    onChange={(e) => setAccountForm({ ...accountForm, organizationName: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Your name"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  />
                </>
              )}
              <input
                type="email"
                required
                className="input"
                placeholder="Email"
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                autoComplete="email"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={accountMode === "signup" ? 8 : undefined}
                  className="input pr-10"
                  placeholder="Password"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                  autoComplete={accountMode === "signup" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {accountError && <p className="text-sm text-danger">{accountError}</p>}
              <button type="submit" disabled={accountSubmitting} className="btn-primary w-full">
                {accountSubmitting ? "Please wait…" : accountMode === "signup" ? "Continue" : "Log in"}
              </button>
            </form>
          </div>
        )}

        <div className="mb-6 rounded-xl border-2 border-accent bg-surface p-6">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">Selected plan</span>
          </div>
          <h2 className="text-xl font-semibold text-ink">{selected.name}</h2>

          <div className="mt-3 flex items-baseline gap-2">
            {appliedCoupon && (
              <span className="text-lg text-muted line-through">${selected.trialPriceUsd ?? selected.priceUsd}</span>
            )}
            <span className="text-3xl font-bold text-ink">${displayTrialPriceUsd ?? displayPriceUsd}</span>
            <span className="text-sm text-muted">
              {selected.trialDays ? `for ${selected.trialDays} days` : "/ month"}
            </span>
          </div>
          {selected.trialDays && (
            <p className="mt-1 text-xs text-muted">
              Then ${displayPriceUsd}/month automatically — cancel anytime during your trial and you won't be charged again.
            </p>
          )}

          <div className="mt-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2 text-xs text-success">
                <span>Coupon "{appliedCoupon.code}" applied</span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponInput("");
                  }}
                  className="font-medium hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponApplying || !couponInput.trim()}
                  className="btn-secondary shrink-0"
                >
                  {couponApplying ? "Applying…" : "Apply"}
                </button>
              </div>
            )}
            {couponError && <p className="mt-1 text-xs text-danger">{couponError}</p>}
          </div>

          <button
            type="button"
            onClick={() => setFeaturesOpen((o) => !o)}
            className="mt-5 flex w-full items-center justify-between text-sm font-medium text-ink"
          >
            What's included
            <ChevronDown className={`h-4 w-4 transition-transform ${featuresOpen ? "rotate-180" : ""}`} />
          </button>
          {featuresOpen && (
            <ul className="mt-3 space-y-2 text-sm text-ink">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {selected.maxConnectors} active connectors</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {selected.maxSearchConfigs} saved searches</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {selected.maxTrackedShops} tracked shops</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {selected.maxProspectsPerMonth.toLocaleString()} prospect lookups / month</li>
            </ul>
          )}

          {!isAuthenticated ? (
            <p className="mt-6 text-center text-xs text-muted">
              Create your account above to continue to payment.
            </p>
          ) : availableProviders.length > 0 ? (
            <div className="mt-6 space-y-2">
              {availableProviders.map((provider, i) => (
                <button
                  key={provider}
                  onClick={() => handleCheckout(provider)}
                  disabled={loadingProvider !== null}
                  className={i === 0 ? "btn-primary w-full !py-3" : "btn-secondary w-full !py-3"}
                >
                  {loadingProvider === provider ? "Redirecting…" : PROVIDER_LABELS[provider] ?? provider}
                </button>
              ))}
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">
              Checkout isn't available right now — contact hello@netdrix.com to get set up.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Other plans</p>
          {others.map((pkg) => (
            <button
              key={pkg.key}
              onClick={() => selectPlan(pkg.key)}
              className="flex w-full items-center justify-between rounded-lg border border-line px-4 py-3 text-left transition-colors hover:border-accent"
            >
              <span className="text-sm font-medium text-ink">{pkg.name}</span>
              <span className="text-sm text-muted">
                ${pkg.trialPriceUsd ?? pkg.priceUsd}
                {pkg.trialDays ? ` for ${pkg.trialDays} days` : "/mo"} · then ${pkg.priceUsd}/mo
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
