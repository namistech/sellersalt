import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  // Authoritative completion check — a single server-side read, no extra
  // client/API round trip. A user who already finished onboarding (real
  // User.onboardingCompletedAt, set only by POST /api/onboarding/complete)
  // is never shown the wizard again, avoiding a redirect loop back here.
  const userId = (session.user as any).id as string | undefined;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });
    if (user?.onboardingCompletedAt) {
      redirect("/dashboard");
    }
  }

  return <OnboardingClient userName={session.user.name || "Seller"} />;
}
