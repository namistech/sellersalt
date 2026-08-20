import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ValidationStudio } from "@/components/validation/ValidationStudio";

export const metadata: Metadata = {
  title: "Product Validation Report — SellerSalt",
  description: "Detailed product validation report and commercial decision intelligence.",
};

interface ProductValidationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ marketplace?: string }>;
}

export default async function ProductValidationPage({
  params,
  searchParams,
}: ProductValidationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  const { id } = await params;
  const { marketplace } = await searchParams;
  const decodedQuery = decodeURIComponent(id);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
      <ValidationStudio
        initialQuery={decodedQuery}
        initialMarketplace={marketplace || "etsy"}
      />
    </div>
  );
}
