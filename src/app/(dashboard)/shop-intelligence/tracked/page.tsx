"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ShopIntelligencePage from "../page";

export default function TrackedShopsPage() {
  const router = useRouter();

  useEffect(() => {
    // Seamlessly transition /shop-intelligence/tracked URLs to unified /shop-intelligence hub
    router.replace("/shop-intelligence");
  }, [router]);

  return <ShopIntelligencePage />;
}
