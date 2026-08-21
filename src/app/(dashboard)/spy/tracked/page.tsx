"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacySpyTrackedRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/shop-intelligence");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-ink-tertiary">
      Redirecting to Shop Intelligence…
    </div>
  );
}
