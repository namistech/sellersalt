import { Suspense } from "react";
import { PlannerClient } from "./planner-client";

export const metadata = {
  title: "Workspace Planner | SellerSalt",
  description: "The strategic bridge from market research to Etsy execution.",
};

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-ink-tertiary">Loading Planner Workspace...</div>}>
      <PlannerClient />
    </Suspense>
  );
}
