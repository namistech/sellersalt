"use client";

import { useState } from "react";
import { Button, Alert } from "@/components/ui";

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
  availableProviders: string[]; // subset of ["STRIPE", "PAYPAL", "SAFEPAY", "PAYFAST"]
}) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openedProvider, setOpenedProvider] = useState<string | null>(null);

  async function handleCheckout(provider: "STRIPE" | "PAYPAL" | "SAFEPAY" | "PAYFAST") {
    setError(null);
    setOpenedProvider(null);
    setLoadingProvider(provider);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageKey, provider }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't initiate checkout session.");
        setLoadingProvider(null);
        return;
      }
      const win = window.open(data.url, "_blank", "noopener,noreferrer");
      if (!win) {
        // Popup blocked — fall back to same-tab navigation so checkout still completes.
        window.location.href = data.url;
        return;
      }
      setOpenedProvider(provider);
    } catch {
      setError("Network error starting checkout.");
    } finally {
      setLoadingProvider(null);
    }
  }

  if (availableProviders.length === 0) {
    return (
      <a
        href={`mailto:support@sellersalt.com?subject=Upgrade to ${packageName}&body=I'd like to upgrade my SellerSalt workspace to the ${packageName} plan.`}
        className="block w-full"
      >
        <Button variant="primary" size="default" fullWidth>
          {isUpgrade ? "Upgrade" : "Switch"} to {packageName}
        </Button>
      </a>
    );
  }

  return (
    <div className="space-y-2">
      {availableProviders.includes("STRIPE") && (
        <Button
          variant="primary"
          size="default"
          fullWidth
          className="bg-[#141B16] text-white hover:bg-[#2A362D] font-semibold"
          loading={loadingProvider === "STRIPE"}
          disabled={loadingProvider !== null}
          onClick={() => handleCheckout("STRIPE")}
        >
          {isUpgrade ? "Upgrade Plan" : "Switch"} with Card
        </Button>
      )}
      {availableProviders.includes("PAYPAL") && (
        <Button
          variant="secondary"
          size="default"
          fullWidth
          loading={loadingProvider === "PAYPAL"}
          disabled={loadingProvider !== null}
          onClick={() => handleCheckout("PAYPAL")}
        >
          Pay with PayPal
        </Button>
      )}
      {availableProviders.includes("SAFEPAY") && (
        <Button
          variant="secondary"
          size="default"
          fullWidth
          loading={loadingProvider === "SAFEPAY"}
          disabled={loadingProvider !== null}
          onClick={() => handleCheckout("SAFEPAY")}
        >
          Pay with Safepay
        </Button>
      )}
      {availableProviders.includes("PAYFAST") && (
        <Button
          variant="secondary"
          size="default"
          fullWidth
          loading={loadingProvider === "PAYFAST"}
          disabled={loadingProvider !== null}
          onClick={() => handleCheckout("PAYFAST")}
        >
          Pay with GoPayFast
        </Button>
      )}
      {openedProvider && (
        <Alert variant="success">
          Checkout opened in a new tab. Complete your payment there — this page will update automatically once it's confirmed.
        </Alert>
      )}
      {error && <Alert variant="danger">{error}</Alert>}
    </div>
  );
}
