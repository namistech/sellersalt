import type { Metadata } from "next";

// Internal-only verification surface for the primitive/core component
// layer (docs/design/frontend-execution-plan-v1.md — "Create a small
// internal/demo usage surface ONLY if needed to verify the components").
// Not linked from any navigation, not a real product route. noindex as
// a safety net in case it's ever left in a deployed build; flagged in
// this task's final report as something to remove or route-guard
// before a real deployment.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return children;
}
