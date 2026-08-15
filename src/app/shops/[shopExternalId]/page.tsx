import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Store,
  ExternalLink,
  Flame,
  Star,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  Target,
  Zap,
  BookOpen,
  Bookmark,
  Plus,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { DashboardShell } from "@/app/(dashboard)/dashboard-shell";
import { buildRealWorkspaceContext } from "@/services/session";
import { isAdminEmail } from "@/lib/is-admin";
import { Card, Badge, Button, Heading, Text } from "@/components/ui";
import { computeShopWinningSignals, computeProductWinningSignals } from "@/services/intelligence/winning-signals";
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

  if (!prospect) return { title: "Etsy Shop Intelligence — SellerSalt" };

  return {
    title: `${prospect.shopName} Etsy Sales & Competitor Analysis — SellerSalt`,
    description: `Inspect estimated daily sales, listing yield, and competitor intelligence for Etsy store ${prospect.shopName}.`,
  };
}

export default async function ShopDetailPage({ params }: ShopDetailPageProps) {
  const { shopExternalId } = await params;
  const session = await getServerSession(authOptions);

  const prospects = await prisma.prospect.findMany({
    where: { shopExternalId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (prospects.length === 0) {
    notFound();
  }

  const primary = prospects[0]!;
  const keywords = Array.from(new Set(prospects.map((p) => p.keyword).filter(Boolean)));
  const estDaily = primary.estDailySales ?? 0;
  const totalSales = primary.totalSales ?? 0;
  const activeListings = primary.activeListings ?? 1;
  const sellingRatio = primary.avgSellingRatio ?? (totalSales / activeListings);

  const shopSignals = computeShopWinningSignals({
    totalSales,
    activeListings,
    estDailySales: estDaily,
    shopAgeMonths: primary.shopAgeMonths,
    reviewCount: primary.reviewCount,
  });

  const content = (
    <ShopDetailClient
      shopExternalId={shopExternalId}
      primary={primary}
      prospects={prospects}
      keywords={keywords}
      shopSignals={shopSignals}
      isAuthenticated={!!session}
    />
  );

  // When logged-in inside the dashboard, preserve the full Dashboard Shell (Sidebar + Topbar)
  if (session && session.user) {
    const user = session.user as any;
    const context = buildRealWorkspaceContext({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      isAdmin: isAdminEmail(user.email),
    });

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
