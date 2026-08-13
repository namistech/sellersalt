import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const organizationId = (session.user as any)?.organizationId as string | undefined;
  if (!organizationId) redirect("/login");

  // Already paying — no reason to see checkout again, straight to the app.
  const existingSub = await prisma.subscription.findUnique({ where: { organizationId } });
  if (existingSub && (existingSub.status === "ACTIVE" || existingSub.status === "TRIALING")) {
    redirect("/dashboard");
  }

  const packages = await prisma.package.findMany({
    where: { key: { in: ["STARTED", "PRO", "AGENCY"] } },
    select: {
      key: true,
      name: true,
      priceUsd: true,
      trialDays: true,
      trialPriceUsd: true,
      maxConnectors: true,
      maxSearchConfigs: true,
      maxTrackedShops: true,
      maxProspectsPerMonth: true,
    },
  });

  const order = ["STARTED", "PRO", "AGENCY"];
  packages.sort((a: (typeof packages)[number], b: (typeof packages)[number]) => order.indexOf(a.key) - order.indexOf(b.key));

  const providers = await prisma.paymentProvider.findMany({
    where: { isActive: true },
    select: { provider: true },
    orderBy: { priority: "asc" },
  });
  const availableProviders = providers
    .map((p: (typeof providers)[number]) => p.provider)
    .filter((p: string) => p === "STRIPE" || p === "PAYPAL");

  const preselectedKey = plan?.toUpperCase() && order.includes(plan.toUpperCase()) ? plan.toUpperCase() : "STARTED";

  return <CheckoutClient packages={packages} preselectedKey={preselectedKey} availableProviders={availableProviders} />;
}
