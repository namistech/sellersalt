import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isStagingVerificationAccount } from "@/lib/staging-verification";
import { prisma } from "@/lib/db";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const session = await getServerSession(authOptions);

  // Only redirect existing, already-paying sessions away — new visitors
  // (no session yet) are exactly who this page needs to serve, since
  // account creation now happens ON checkout, not before it.
  if (session) {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";
    const isStagingVerification = isStagingVerificationAccount(session.user?.email, host);

    const organizationId = (session.user as any)?.organizationId as string | undefined;
    if (organizationId) {
      const existingSub = await prisma.subscription.findUnique({ where: { organizationId } });
      const hasAccess =
        isStagingVerification ||
        Boolean(existingSub && (existingSub.status === "ACTIVE" || existingSub.status === "TRIALING"));
      if (hasAccess) {
        redirect("/dashboard");
      }
    }
  }

  const packages = await prisma.package.findMany({
    where: { key: { in: ["STARTED", "PRO", "AGENCY"] }, isActive: true },
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
    .filter((p: string) => p === "STRIPE" || p === "PAYPAL" || p === "SAFEPAY" || p === "PAYFAST");

  const preselectedKey = plan?.toUpperCase() && order.includes(plan.toUpperCase()) ? plan.toUpperCase() : "STARTED";

  return <CheckoutClient packages={packages} preselectedKey={preselectedKey} availableProviders={availableProviders} />;
}
