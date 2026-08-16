import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCategoryTree } from "@/services/category-hunting";
import { CategoryHuntingClient } from "./category-hunting-client";
import type { EtsyRawTaxonomyNode } from "@/connectors/etsy/taxonomy";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; taxonomyId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  if (!organizationId) {
    redirect("/login");
  }

  const { id, taxonomyId } = await searchParams;
  const targetId = Number(id || taxonomyId) || undefined;

  let roots: EtsyRawTaxonomyNode[] = [];
  try {
    const res = await fetchCategoryTree(organizationId);
    roots = res.roots;
  } catch (err) {
    console.error("Failed to prefetch category tree:", err);
    roots = [];
  }

  return (
    <CategoryHuntingClient
      initialRoots={roots}
      initialTaxonomyId={targetId}
    />
  );
}
