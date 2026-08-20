import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ValidationStudio } from "@/components/validation/ValidationStudio";

export const metadata: Metadata = {
  title: "Product Validation & Commercial Decision — SellerSalt",
  description: "Evidence-driven product validation across Demand, Competition, Economics, and Trajectory.",
};

interface ValidatePageProps {
  searchParams: Promise<{ q?: string; marketplace?: string }>;
}

export default async function ValidatePage({ searchParams }: ValidatePageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  const { q, marketplace } = await searchParams;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
      <ValidationStudio
        initialQuery={q || "minimalist ceramic coffee mug"}
        initialMarketplace={marketplace || "etsy"}
      />
    </div>
  );
}
