import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OnboardingClient } from "./onboarding-client";

export const metadata = {
  title: "First-Value Onboarding | SellerSalt",
  description: "Set up your niche focus, connect your shop, and launch your first seller intelligence workflow.",
};

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return <OnboardingClient userName={session.user.name || "Seller"} />;
}
