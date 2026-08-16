import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { DashboardShell } from "@/app/(dashboard)/dashboard-shell";
import { resolveWorkspaceContextForUser } from "@/services/session";
import { isAdminEmail } from "@/lib/is-admin";
import { fetchCompleteShopIntelligence } from "@/services/shop-intelligence";
import { ShopDetailClient } from "./shop-detail-client";

interface ShopDetailPageProps {
  params: Promise<{ shopExternalId: string }>;
}

export async function generateMetadata({ params }: ShopDetailPageProps) {
  const { shopExternalId } = await params;
  const prospect = await prisma.prospect.findFirst({
    where: { shopExternalId },
    select: { shopName: true, keyword: true, totalSales: true },
  });

  const shopName = prospect?.shopName || `Etsy Shop ${shopExternalId}`;

  return {
    title: `${shopName} Etsy Sales & Competitor Analysis — SellerSalt`,
    description: `Inspect estimated daily sales, listing yield, and competitor intelligence for Etsy store ${shopName}.`,
  };
}

export default async function ShopDetailPage({ params }: ShopDetailPageProps) {
  const { shopExternalId } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  let profile: any = null;

  // 1. Try to fetch live 8-section shop intelligence profile
  if (organizationId) {
    try {
      profile = await fetchCompleteShopIntelligence(organizationId, shopExternalId);
    } catch {
      // Fallback to local database records if cold fetch fails
    }
  }

  // 2. Query local prospect fallback if live profile not available
  let prospects: any[] = [];
  if (!profile) {
    prospects = await prisma.prospect.findMany({
      where: { shopExternalId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  }

  // 3. If neither exists, 404
  if (!profile && prospects.length === 0) {
    notFound();
  }

  const primary = prospects[0] ?? null;
  const keywords = Array.from(new Set(prospects.map((p) => p.keyword).filter(Boolean)));

  // Tracking state for authenticated orgs
  let isTracked = false;
  if (organizationId) {
    const watch = await prisma.shopWatch.findUnique({
      where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
      select: { isActive: true },
    });
    isTracked = Boolean(watch?.isActive);
  }

  const content = (
    <ShopDetailClient
      shopExternalId={shopExternalId}
      profile={profile}
      primary={primary}
      prospects={prospects}
      keywords={keywords}
      isAuthenticated={!!session}
      isTracked={isTracked}
    />
  );

  // When logged-in inside the dashboard, preserve the full Dashboard Shell (Sidebar + Topbar)
  if (session && session.user) {
    const user = session.user as any;
    const context = await resolveWorkspaceContextForUser(user, isAdminEmail(user.email));

    return <DashboardShell context={context}>{content}</DashboardShell>;
  }

  // When unauthenticated, render in the public shell
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16]">
      <PublicHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        {content}
      </main>
      <PublicFooter />
    </div>
  );
}
