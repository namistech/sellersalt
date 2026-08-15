import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOpportunityRadarData } from "@/services/opportunities";
import { RadarClient } from "./radar-client";

export const metadata = {
  title: "Opportunity Radar — SellerSalt",
  description: "Real-time decision intelligence detecting high-velocity Etsy niches, lean catalogs, and hidden demand.",
};

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    config?: string;
    type?: string;
    minScore?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const organizationId = (session.user as any)?.organizationId as string | undefined;
  if (!organizationId) redirect("/login");

  const { search, config, type, minScore } = await searchParams;

  const data = await getOpportunityRadarData(organizationId, {
    searchQuery: search,
    searchConfigId: config,
    type: type as any,
    minScore: minScore ? Number(minScore) : undefined,
  });

  return (
    <RadarClient
      initialData={data}
      searchConfigId={config}
      selectedType={type}
      minScore={minScore ? Number(minScore) : undefined}
      initialQuery={search}
    />
  );
}
