"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, Alert, Text } from "@/components/ui";

interface CancelSubscriptionButtonProps {
  provider: string;
  currentPeriodEnd?: string | null;
}

export function CancelSubscriptionButton({
  provider,
  currentPeriodEnd,
}: CancelSubscriptionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmCancel() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error ?? "Failed to cancel subscription.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error canceling subscription. Please contact support.");
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        size="compact"
        className="text-xs bg-transparent text-danger hover:bg-danger-subtle border border-danger/30 shadow-none font-medium"
        onClick={() => setOpen(true)}
      >
        Cancel Subscription
      </Button>

      <Dialog
        open={open}
        onClose={() => !loading && setOpen(false)}
        title="Cancel Your Subscription"
        description="Are you sure you want to cancel your SellerSalt subscription?"
        size="sm"
        actions={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="compact"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              size="compact"
              loading={loading}
              onClick={handleConfirmCancel}
            >
              Confirm Cancellation
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-ink-secondary">
          <p>
            Your research quota, tracked shops, and Opportunity Radar access will remain active until the end of your current billing period
            {currentPeriodEnd ? ` (${new Date(currentPeriodEnd).toLocaleDateString()})` : ""}.
          </p>
          <p className="text-xs text-ink-tertiary">
            No further charges will be billed to your {provider} account.
          </p>

          {error && <Alert variant="danger">{error}</Alert>}
        </div>
      </Dialog>
    </>
  );
}

export function ResumeSubscriptionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResume() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/resume", {
        method: "POST",
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Failed to resume subscription.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error resuming subscription.");
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        variant="primary"
        size="compact"
        loading={loading}
        onClick={handleResume}
        className="text-xs bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-semibold shadow-xs"
      >
        Resume Subscription
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
