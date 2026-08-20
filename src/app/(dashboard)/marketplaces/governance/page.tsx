import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { MarketplaceGovernanceMatrix } from "@/components/governance/MarketplaceGovernanceMatrix";

export const metadata: Metadata = {
  title: "Marketplace Data Governance | SellerSalt",
  description: "Authoritative data governance policies, acquisition boundaries, and compliance matrix.",
};

export default async function MarketplaceGovernancePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return <MarketplaceGovernanceMatrix />;
}
