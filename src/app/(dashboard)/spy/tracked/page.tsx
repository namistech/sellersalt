"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SpyOnCompetitorPage from "../page";

export default function TrackedCompetitorsPage() {
  const router = useRouter();

  useEffect(() => {
    // Seamlessly transition legacy /spy/tracked URLs to unified /spy surveillance hub
    router.replace("/spy");
  }, [router]);

  return <SpyOnCompetitorPage />;
}
