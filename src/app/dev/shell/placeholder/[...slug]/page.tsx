"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";
import { Button, Card, Heading, Text } from "@/components/ui";

// The "controlled placeholder strategy" this task specified: a single
// shared destination for every nav item that has no real page behind
// it yet (Agency Clients/Employees, Institute Cohorts/Staff, Reports,
// Help, the AI assistant entry) — honest about what isn't built rather
// than fabricating a dozen fake product pages. Deliberately NOT wrapped
// in AppShell: it's reached from three different mock WorkspaceContexts
// (and the real one, via AccountMenu → Help), and guessing which one to
// re-render here would be more fabrication, not less.

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ShellPlaceholderPage() {
  const router = useRouter();
  const params = useParams<{ slug: string | string[] }>();
  const slugParts = Array.isArray(params.slug) ? params.slug : [params.slug];
  const label = titleCase(slugParts[slugParts.length - 1] ?? "");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <Card padding="lg" className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Construction aria-hidden className="h-6 w-6" />
        </div>
        <Heading as="h1" size="h3">
          {label} isn't built yet
        </Heading>
        <Text size="body-sm" color="secondary" className="mt-2">
          This destination exists in the navigation to validate the Information Architecture, but the real page
          hasn't been implemented. See docs/design/frontend-execution-plan-v1.md for build sequencing.
        </Text>
        <Button variant="secondary" className="mt-6" leadingIcon={<ArrowLeft aria-hidden className="h-4 w-4" />} onClick={() => router.back()}>
          Go back
        </Button>
      </Card>
    </div>
  );
}
