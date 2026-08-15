import { prisma } from "@/lib/db";
import { triggerScrapeJob } from "@/lib/queue";
import type {
  AssistantIntentType,
  AssistantMessage,
  AssistantCardItem,
  AssistantAction,
} from "./types";

export function classifyIntent(query: string): AssistantIntentType {
  const q = query.toLowerCase().trim();

  if (
    q.includes("top opportunit") ||
    q.includes("best opportunit") ||
    q.includes("best product") ||
    q.includes("winning product") ||
    q.includes("breakout product") ||
    q.includes("highest sales") ||
    q.includes("high demand") ||
    q.includes("hot product") ||
    q.includes("top listing")
  ) {
    return "TOP_OPPORTUNITIES";
  }

  if (
    q.includes("fastest growing") ||
    q.includes("competitor gain") ||
    q.includes("gaining sales") ||
    q.includes("growth competitor") ||
    q.includes("momentum competitor") ||
    q.includes("who is growing") ||
    q.includes("growing shop") ||
    q.includes("fastest shop") ||
    q.includes("competitors growing") ||
    q.includes("competitor velocity")
  ) {
    return "FASTEST_GROWING_COMPETITORS";
  }

  if (
    q.includes("what should i research") ||
    q.includes("what to research") ||
    q.includes("daily agenda") ||
    q.includes("research agenda") ||
    q.includes("research recommendation") ||
    q.includes("recommend niches") ||
    q.includes("what should i do") ||
    q.includes("daily action") ||
    q.includes("next step")
  ) {
    return "DAILY_RESEARCH_AGENDA";
  }

  if (
    q.includes("low competition") ||
    q.includes("low comp") ||
    q.includes("untapped") ||
    q.includes("easy niche") ||
    q.includes("low difficulty") ||
    q.includes("low review") ||
    q.includes("easy product")
  ) {
    return "LOW_COMPETITION_NICHES";
  }

  if (
    q.includes("saved opportunit") ||
    q.includes("my favorite") ||
    q.includes("bookmarked") ||
    q.includes("saved items") ||
    q.includes("saved prospect") ||
    q.includes("starred") ||
    q.includes("favorites")
  ) {
    return "SAVED_OPPORTUNITIES";
  }

  if (
    q.includes("tracked competitor") ||
    q.includes("tracked shop") ||
    q.includes("shops i am tracking") ||
    q.includes("tracking list") ||
    q.includes("my shops") ||
    q.includes("monitoring")
  ) {
    return "TRACKED_COMPETITORS";
  }

  if (
    q.includes("run daily search") ||
    q.includes("run search") ||
    q.includes("scan now") ||
    q.includes("trigger search") ||
    q.includes("run my search") ||
    q.includes("run my latest search") ||
    q.includes("run latest search") ||
    q.includes("start search") ||
    q.includes("scrape now")
  ) {
    return "TRIGGER_SEARCH";
  }

  if (
    q.includes("what changed") ||
    q.includes("since yesterday") ||
    q.includes("daily change") ||
    q.includes("new listing") ||
    q.includes("what changed today") ||
    q.includes("today's change") ||
    q.includes("what is new") ||
    q.includes("what's new")
  ) {
    return "WHAT_CHANGED_SINCE_YESTERDAY";
  }

  if (q.includes("help") || q.includes("what can you do") || q.includes("commands")) {
    return "HELP";
  }

  return "UNKNOWN";
}

export async function processDeterministicIntent(
  query: string,
  organizationId: string
): Promise<AssistantMessage> {
  const intent = classifyIntent(query);
  const now = new Date().toISOString();
  const msgId = `asst-${Date.now()}`;

  switch (intent) {
    case "TOP_OPPORTUNITIES": {
      const topProspects = await prisma.prospect.findMany({
        where: { organizationId },
        orderBy: [{ estDailySales: "desc" }, { createdAt: "desc" }],
        take: 5,
      });

      if (topProspects.length === 0) {
        return {
          id: msgId,
          sender: "assistant",
          intent,
          timestamp: now,
          isDeterministic: true,
          text: "You haven't run any research searches yet. Set up a search stream in the Opportunity Radar or run your first keyword search to uncover high-velocity Etsy listings.",
          actions: [
            { label: "Open Opportunity Radar", href: "/radar", variant: "primary" },
            { label: "Configure Search Streams", href: "/connectors", variant: "secondary" },
          ],
        };
      }

      const cards: AssistantCardItem[] = topProspects.map((p) => ({
        id: p.id,
        title: p.listingTitle,
        subtitle: `Shop: ${p.shopName} · Niche: ${p.keyword}`,
        badge: { label: "Breakout", variant: "accent" },
        imageUrl: p.listingImageUrl ?? undefined,
        href: p.listingUrl,
        metrics: [
          { label: "Price", value: `$${p.price.toFixed(2)}` },
          { label: "Est. Daily Sales", value: p.estDailySales?.toFixed(1) ?? "—" },
          { label: "Total Sales", value: p.totalSales?.toLocaleString() ?? "—" },
        ],
      }));

      return {
        id: msgId,
        sender: "assistant",
        intent,
        timestamp: now,
        isDeterministic: true,
        text: `Here are your top 5 high-velocity Etsy product opportunities based on real transaction velocity and catalog demand:`,
        cards,
        actions: [
          { label: "View All in Opportunity Radar", href: "/radar", variant: "primary" },
          { label: "Explore Prospects Table", href: "/prospects", variant: "secondary" },
        ],
      };
    }

    case "FASTEST_GROWING_COMPETITORS": {
      const shopWatches = await prisma.shopWatch.findMany({
        where: { organizationId, isActive: true },
        include: {
          snapshots: {
            orderBy: { capturedAt: "desc" },
            take: 2,
          },
        },
        take: 10,
      });

      const trackedWithGrowth = shopWatches
        .map((sw) => {
          const s1 = sw.snapshots[0];
          const s2 = sw.snapshots[1];
          const salesDelta = s1 && s2 && s1.totalSales && s2.totalSales ? s1.totalSales - s2.totalSales : 0;
          return {
            sw,
            latest: s1,
            salesDelta: Math.max(0, salesDelta),
          };
        })
        .sort((a, b) => b.salesDelta - a.salesDelta);

      if (trackedWithGrowth.length === 0) {
        return {
          id: msgId,
          sender: "assistant",
          intent,
          timestamp: now,
          isDeterministic: true,
          text: "You aren't tracking any competitor shops yet. Use the 'Spy on Competitor' tool to track Etsy shops and measure sales velocity over time.",
          actions: [
            { label: "Spy on a Competitor", href: "/spy", variant: "primary" },
            { label: "Browse Public Shop Directory", href: "/shops", variant: "secondary" },
          ],
        };
      }

      const cards: AssistantCardItem[] = trackedWithGrowth.slice(0, 4).map(({ sw, latest, salesDelta }) => ({
        id: sw.id,
        title: sw.shopName,
        subtitle: `Tracked Etsy Shop (${sw.shopExternalId})`,
        badge: { label: salesDelta > 0 ? `+${salesDelta} Sales` : "Monitoring", variant: "success" },
        href: `/shops/${sw.shopExternalId}`,
        metrics: [
          { label: "Lifetime Sales", value: latest?.totalSales?.toLocaleString() ?? "—" },
          { label: "Active Listings", value: latest?.activeListings ?? "—" },
          { label: "Recent Velocity", value: salesDelta > 0 ? `+${salesDelta}` : "Steady" },
        ],
      }));

      return {
        id: msgId,
        sender: "assistant",
        intent,
        timestamp: now,
        isDeterministic: true,
        text: `Here is the sales momentum for your tracked Etsy competitors:`,
        cards,
        actions: [
          { label: "View Tracked Shops", href: "/spy/tracked", variant: "primary" },
          { label: "Lookup Another Shop", href: "/spy", variant: "secondary" },
        ],
      };
    }

    case "DAILY_RESEARCH_AGENDA": {
      const distinctKeywords = await prisma.prospect.findMany({
        where: { organizationId },
        select: { keyword: true },
        distinct: ["keyword"],
        take: 10,
      });

      const keywords = distinctKeywords.map((k) => k.keyword).filter(Boolean);

      const agendaSuggestions = [
        "1. Audit 3 breakout opportunities with < 50 reviews and high selling ratios.",
        "2. Spy on the top 2 competitor shops in your primary niche.",
        "3. Review trending listings with est. daily sales > 5/day.",
        "4. Save promising product ideas to your Favorites list.",
      ];

      return {
        id: msgId,
        sender: "assistant",
        intent,
        timestamp: now,
        isDeterministic: true,
        text: `Here is your recommended Etsy Intelligence Agenda for today:\n\n${agendaSuggestions.join("\n")}${
          keywords.length > 0 ? `\n\nActive keywords in your workspace: ${keywords.join(", ")}.` : ""
        }`,
        actions: [
          { label: "Check Opportunity Radar", href: "/radar", variant: "primary" },
          { label: "Inspect Trends", href: "/trends", variant: "secondary" },
        ],
      };
    }

    case "LOW_COMPETITION_NICHES": {
      // Find prospects with lower review counts and high estDailySales
      const lowCompProspects = await prisma.prospect.findMany({
        where: {
          organizationId,
          reviewCount: { lte: 100 },
          avgSellingRatio: { gte: 1.5 },
        },
        orderBy: { estDailySales: "desc" },
        take: 5,
      });

      if (lowCompProspects.length === 0) {
        return {
          id: msgId,
          sender: "assistant",
          intent,
          timestamp: now,
          isDeterministic: true,
          text: "No low-competition listings found in current search results. Try creating a broader search stream or lowering the minimum review threshold in Search Configs.",
          actions: [
            { label: "View Prospects", href: "/prospects", variant: "primary" },
            { label: "Adjust Search Configs", href: "/connectors", variant: "secondary" },
          ],
        };
      }

      const cards: AssistantCardItem[] = lowCompProspects.map((p) => ({
        id: p.id,
        title: p.listingTitle,
        subtitle: `Shop: ${p.shopName} · ${p.reviewCount} Reviews`,
        badge: { label: "Low Competition", variant: "success" },
        imageUrl: p.listingImageUrl ?? undefined,
        href: p.listingUrl,
        metrics: [
          { label: "Price", value: `$${p.price.toFixed(2)}` },
          { label: "Reviews", value: p.reviewCount },
          { label: "Est. Daily Sales", value: p.estDailySales?.toFixed(1) ?? "—" },
        ],
      }));

      return {
        id: msgId,
        sender: "assistant",
        intent,
        timestamp: now,
        isDeterministic: true,
        text: `Found ${lowCompProspects.length} high-potential opportunities with low review barrier (<100 reviews) and proven sales velocity:`,
        cards,
        actions: [{ label: "Open Opportunity Radar", href: "/radar", variant: "primary" }],
      };
    }

    case "SAVED_OPPORTUNITIES": {
      const favorites = await prisma.prospect.findMany({
        where: { organizationId, isFavorite: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (favorites.length === 0) {
        return {
          id: msgId,
          sender: "assistant",
          intent,
          timestamp: now,
          isDeterministic: true,
          text: "You haven't bookmarked any product opportunities yet. Click the star icon on any prospect in the Prospects table or Opportunity Radar to save it here.",
          actions: [{ label: "Browse Prospects", href: "/prospects", variant: "primary" }],
        };
      }

      const cards: AssistantCardItem[] = favorites.map((p) => ({
        id: p.id,
        title: p.listingTitle,
        subtitle: `Shop: ${p.shopName}`,
        badge: { label: "Favorited", variant: "warn" },
        imageUrl: p.listingImageUrl ?? undefined,
        href: p.listingUrl,
        metrics: [
          { label: "Price", value: `$${p.price.toFixed(2)}` },
          { label: "Est. Daily Sales", value: p.estDailySales?.toFixed(1) ?? "—" },
        ],
      }));

      return {
        id: msgId,
        sender: "assistant",
        intent,
        timestamp: now,
        isDeterministic: true,
        text: `Here are your latest saved product opportunities:`,
        cards,
        actions: [{ label: "Open Favorites Center", href: "/favorites", variant: "primary" }],
      };
    }

    case "TRACKED_COMPETITORS": {
      const tracked = await prisma.shopWatch.findMany({
        where: { organizationId, isActive: true },
        include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
        take: 5,
      });

      if (tracked.length === 0) {
        return {
          id: msgId,
          sender: "assistant",
          intent,
          timestamp: now,
          isDeterministic: true,
          text: "No competitor shops currently tracked. Search any Etsy shop name in 'Spy on Competitor' to start tracking snapshots.",
          actions: [{ label: "Spy on Competitor", href: "/spy", variant: "primary" }],
        };
      }

      const cards: AssistantCardItem[] = tracked.map((t) => ({
        id: t.id,
        title: t.shopName,
        subtitle: `Etsy ID: ${t.shopExternalId}`,
        badge: { label: "Tracking Active", variant: "success" },
        href: `/shops/${t.shopExternalId}`,
        metrics: [
          { label: "Total Sales", value: t.snapshots[0]?.totalSales?.toLocaleString() ?? "—" },
          { label: "Listings", value: t.snapshots[0]?.activeListings ?? "—" },
        ],
      }));

      return {
        id: msgId,
        sender: "assistant",
        intent,
        timestamp: now,
        isDeterministic: true,
        text: `You are tracking ${tracked.length} Etsy competitor shop(s):`,
        cards,
        actions: [{ label: "View Tracked Shops", href: "/spy/tracked", variant: "primary" }],
      };
    }

    case "TRIGGER_SEARCH": {
      const searchConfig = await prisma.searchConfig.findFirst({
        where: { organizationId, isActive: true },
      });

      if (!searchConfig) {
        return {
          id: msgId,
          sender: "assistant",
          intent,
          timestamp: now,
          isDeterministic: true,
          text: "No active search streams found in your workspace. Please configure a keyword stream in the Search Streams settings.",
          actions: [{ label: "Configure Search Streams", href: "/connectors", variant: "primary" }],
        };
      }

      // Enqueue job via BullMQ
      try {
        await triggerScrapeJob(organizationId, searchConfig.id, searchConfig.connectorId);
        return {
          id: msgId,
          sender: "assistant",
          intent,
          timestamp: now,
          isDeterministic: true,
          text: `Triggered background research search for "${searchConfig.name}" (keywords: ${searchConfig.keywords.join(", ")}). You can monitor execution on the Scraper Jobs page.`,
          actions: [
            { label: "View Scraper Jobs", href: "/jobs", variant: "primary" },
            { label: "Check Prospects", href: "/prospects", variant: "secondary" },
          ],
        };
      } catch (err: any) {
        return {
          id: msgId,
          sender: "assistant",
          intent,
          timestamp: now,
          isDeterministic: true,
          text: `Failed to trigger search job: ${err?.message ?? "Queue unavailable"}.`,
        };
      }
    }

    case "WHAT_CHANGED_SINCE_YESTERDAY": {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentProspectsCount = await prisma.prospect.count({
        where: { organizationId, createdAt: { gte: yesterday } },
      });
      const recentSnapshotsCount = await prisma.shopSnapshot.count({
        where: { shopWatch: { organizationId }, capturedAt: { gte: yesterday } },
      });

      return {
        id: msgId,
        sender: "assistant",
        intent,
        timestamp: now,
        isDeterministic: true,
        text: `Activity over the last 24 hours:\n• Discovered ${recentProspectsCount} new product prospects.\n• Captured ${recentSnapshotsCount} new competitor shop snapshots.`,
        actions: [
          { label: "View Opportunity Radar", href: "/radar", variant: "primary" },
          { label: "View Tracked Competitors", href: "/spy/tracked", variant: "secondary" },
        ],
      };
    }

    case "HELP":
    default: {
      return {
        id: msgId,
        sender: "assistant",
        intent: "HELP",
        timestamp: now,
        isDeterministic: true,
        text: `I am your SellerSalt Etsy Commerce Assistant. I can instantly analyze your workspace data and execute intelligence commands without external AI dependencies.`,
        actions: [
          { label: "Find top opportunities", actionKey: "Find my top opportunities", variant: "primary" },
          { label: "Fastest growing competitors", actionKey: "Show my fastest-growing competitors", variant: "secondary" },
          { label: "What should I research today?", actionKey: "What should I research today?", variant: "outline" },
          { label: "Low competition niches", actionKey: "Find low-competition products", variant: "outline" },
        ],
      };
    }
  }
}
