import { redirect } from "next/navigation";

// Superseded by the merged signup+checkout flow at /checkout — kept as a
// redirect rather than deleted outright, in case anything external still
// links here (bookmarks, old marketing assets, etc.).
export default async function SignupRedirect({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  redirect(plan ? `/checkout?plan=${encodeURIComponent(plan)}` : "/checkout");
}
