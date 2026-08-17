import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveWorkspaceContextForUser } from "@/services/session";
import { isAdminEmail } from "@/lib/is-admin";
import { getOwnShopIntelligence } from "@/services/own-shop-intelligence";
import { StoreOperationsClient } from "./store-client";

export const metadata = {
  title: "Store Operations & Health — SellerSalt",
  description: "First-class intelligence loop for your connected Etsy store: Store Health, Tag Compliance, Underperforming Listings, and Optimization Queue.",
};

export default async function StoreOperationsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId || "org_demo_default";
  
  const shopReport = await getOwnShopIntelligence(organizationId);

  return <StoreOperationsClient report={shopReport} organizationId={organizationId} />;
}
