import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AnalyticsClient } from "./analytics-client";

export const metadata = {
  title: "Revenue & Profit Intelligence | SellerSalt",
  description: "Institutional-grade financial analytics, Etsy fee reconciliation, and listing yield intelligence.",
};

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  return <AnalyticsClient />;
}
