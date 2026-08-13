"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

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
          One step left — pick your plan and payment method to get started.
        </p>

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

          <ul className="mt-5 space-y-2 text-sm text-ink">
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {selected.maxConnectors} active connectors</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {selected.maxSearchConfigs} saved searches</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {selected.maxTrackedShops} tracked shops</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {selected.maxProspectsPerMonth.toLocaleString()} prospect lookups / month</li>
          </ul>

          {availableProviders.length > 0 ? (
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
