import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProductResearchCommandCenter } from "@/components/research/ProductResearchCommandCenter";

export const metadata: Metadata = {
  title: "Product Research Command Center — SellerSalt",
  description: "Unified ecommerce market research, keyword clustering, competition density, and commercial decision intelligence.",
};

interface ResearchCenterPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ResearchCenterPage({ searchParams }: ResearchCenterPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  const { q } = await searchParams;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
      <ProductResearchCommandCenter initialQuery={q || "minimalist desk lamp"} />
    </div>
  );
}
