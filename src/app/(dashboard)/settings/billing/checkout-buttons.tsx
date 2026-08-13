"use client";

import { useState } from "react";

export function CheckoutButtons({
  packageKey,
  packageName,
  currentPackageName,
  isUpgrade,
  availableProviders,
}: {
  packageKey: string;
  packageName: string;
  currentPackageName: string;
  isUpgrade: boolean;
  availableProviders: string[]; // subset of ["STRIPE", "PAYPAL"] that are active
}) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(provider: "STRIPE" | "PAYPAL") {
    setError(null);
    setLoadingProvider(provider);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageKey, provider }),
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

  if (availableProviders.length === 0) {
    return (
      <a
        href={`mailto:hello@netdrix.com?subject=Upgrade to ${packageName}&body=I'd like to upgrade my SellerSalt workspace to the ${packageName} plan.`}
        className="btn-primary block w-full text-center"
      >
        {isUpgrade ? "Upgrade" : "Switch"} to {packageName}
      </a>
    );
  }

  return (
    <div className="space-y-2">
      {availableProviders.includes("STRIPE") && (
        <button onClick={() => handleCheckout("STRIPE")} disabled={loadingProvider !== null} className="btn-primary w-full">
          {loadingProvider === "STRIPE" ? "Redirecting…" : `Pay with card — ${packageName}`}
        </button>
      )}
      {availableProviders.includes("PAYPAL") && (
        <button onClick={() => handleCheckout("PAYPAL")} disabled={loadingProvider !== null} className="btn-secondary w-full">
          {loadingProvider === "PAYPAL" ? "Redirecting…" : "Pay with PayPal"}
        </button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
