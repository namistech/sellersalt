import { NextResponse } from "next/server";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";
import { auditListingSeo } from "@/services/seo-engine";
import { computeProductOpportunity } from "@/services/product-hunting";
import { classifyIntent, normalizeTerm } from "@/services/keyword-research";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const tool = body.tool as "PRODUCT_PREVIEW" | "KEYWORD_GENERATOR" | "SHOP_PREVIEW" | "SEO_PREVIEW";

    if (!tool) {
      return NextResponse.json({ error: "Missing tool specification." }, { status: 400 });
    }

    // 1. FREE PRODUCT OPPORTUNITY PREVIEW
    if (tool === "PRODUCT_PREVIEW") {
      const query = String(body.query || "").trim() || "Handmade Leather Card Holder";
      const parsed = parseEtsyListingInput(query);
      
      const opportunity = computeProductOpportunity({
        price: 32.0,
        listingAgeDays: 45,
        shopAgeMonths: 14,
        totalSales: 840,
        activeListings: 24,
        reviewCount: 42,
        reviewAverage: 4.9,
        numFavorers: 320,
        estDailySales: 3.8,
        avgSellingRatio: 35.0,
      });

      return NextResponse.json({
        success: true,
        tool: "PRODUCT_PREVIEW",
        data: {
          title: parsed.listingId ? `Etsy Listing #${parsed.listingId}` : query,
          opportunityScore: opportunity.opportunityScore,
          classification: opportunity.classification,
          typeLabel: opportunity.classificationLabel,
          typeEmoji: opportunity.classificationEmoji,
          dailyVelocity: 3.8,
          categoryBenchmark: 1.4,
          priceRange: { min: 28.0, avg: 34.5, max: 48.0 },
          unitMarginEstimate: "68%",
          insights: [
            "Daily sales velocity is 2.7x higher than category baseline.",
            "Top 10 competitors hold under 30% category market share (Low Barrier).",
          ],
          provenance: "SELLERSALT_SCORE",
          isSamplePreview: true,
          lockedFeatures: [
            "Full Unit Economics & Fee Breakdown",
            "13-Tag Competitor Harvest Cluster",
            "Next Best Action Intelligence",
            "Historical Velocity Trajectory",
            "1-Click Save to Opportunity Inbox & Planner",
            "Listing Content Studio & AI Generation",
          ],
          totalKeywordsDiscovered: 38,
        },
      });
    }

    // 2. FREE KEYWORD OPPORTUNITY GENERATOR
    if (tool === "KEYWORD_GENERATOR") {
      const seed = normalizeTerm(String(body.query || "").trim() || "leather wallet");
      
      const sampleModifiers = [
        "minimalist",
        "slim",
        "personalized",
        "custom",
        "handmade",
        "bifold",
        "card holder",
        "gift for him",
        "vintage",
        "front pocket",
        "rfid blocking",
        "monogrammed",
        "travel",
        "executive",
      ];

      const previewKeywords = sampleModifiers.slice(0, 10).map((mod, idx) => {
        const fullKw = `${mod} ${seed}`.trim();
        return {
          keyword: fullKw,
          tagLength: fullKw.length,
          isTagCompliant: fullKw.length <= 20,
          opportunityTier: idx < 3 ? "HIGH" : idx < 7 ? "MODERATE" : "COMPETITIVE",
          buyerIntent: classifyIntent(fullKw),
        };
      });

      return NextResponse.json({
        success: true,
        tool: "KEYWORD_GENERATOR",
        data: {
          seedKeyword: seed,
          visibleCount: previewKeywords.length,
          totalDiscoveredCount: 48,
          keywords: previewKeywords,
          category: "Accessories > Wallets & Money Clips",
          provenance: "SELLERSALT_SCORE",
          lockedFeatures: [
            "Full Long-Tail Cluster (38 additional keywords)",
            "Exact Opportunity Score (0-100) per keyword",
            "Commercial Competition Barrier Breakdown",
            "13-Tag Optimizer & Groupings",
            "Add to Planner Keyword Memory",
          ],
        },
      });
    }

    // 3. FREE SHOP INTELLIGENCE PREVIEW
    if (tool === "SHOP_PREVIEW") {
      const shopInput = String(body.query || "").trim() || "LayerSculpt3D";
      const cleanShopName = shopInput.replace(/^https?:\/\/(?:www\.)?etsy\.com\/shop\//i, "").replace(/\/.*$/, "").trim();

      return NextResponse.json({
        success: true,
        tool: "SHOP_PREVIEW",
        data: {
          shopName: cleanShopName || "ArtisanCraftStudio",
          shopScore: 84,
          classification: "HIGH_VELOCITY_STORE",
          catalogSize: 46,
          estimatedDailySales: 6.2,
          estimatedMonthlyRevenue: "$5,850",
          topListingPreview: [
            { title: "Custom Engraved Minimalist Desk Organizer", price: 38.0, estVelocity: "2.4/day" },
            { title: "Personalized Solid Walnut Watch Stand", price: 44.0, estVelocity: "1.8/day" },
          ],
          provenance: "ESTIMATED",
          isSamplePreview: true,
          lockedFeatures: [
            "Complete 46-Listing Catalog Surveillance",
            "6-Hour Historical Sales Velocity Deltas",
            "Competitor Tag Harvest & Keyword Mining",
            "Review Moat Replication Timeline",
            "Automated Surveillance Alerts",
          ],
        },
      });
    }

    // 4. FREE SEO AUDIT PREVIEW
    if (tool === "SEO_PREVIEW") {
      const query = String(body.query || "").trim();
      const parsed = parseEtsyListingInput(query || "1429810482");

      if (parsed.isShopUrl) {
        return NextResponse.json({
          error: "Pasted input is an Etsy shop URL. Please enter an Etsy listing URL or switch to Shop Intelligence.",
          isShopUrl: true,
          shopName: parsed.shopName,
        }, { status: 400 });
      }

      const sampleTitle = parsed.listingId
        ? `Handmade Ceramic Pour Over Coffee Maker with Glaze`
        : query || "Handmade Leather Minimalist Card Holder Wallet";

      const audit = auditListingSeo({
        title: sampleTitle,
        tags: ["leather card holder", "minimalist wallet", "handmade gift", "slim wallet"],
        description: "Handmade full grain leather wallet for everyday carry.",
      });

      return NextResponse.json({
        success: true,
        tool: "SEO_PREVIEW",
        data: {
          titleLength: audit.breakdown.titleScore >= 20 ? "Optimal (40-140 chars)" : "Needs Attention",
          titleScore: audit.breakdown.titleScore,
          tagCount: 4,
          maxTagSlots: 13,
          tagCompliance: "4 / 13 slots used (9 missing tags)",
          overallScore: audit.overallScore,
          grade: audit.grade,
          provenance: "SELLERSALT_SCORE",
          lockedFeatures: [
            "Complete 13-Tag High-Intent Replacements",
            "First 40-Character Front-Loaded Title Rewriter",
            "Readability & Originality Verification (<15% overlap)",
            "Listing Content Studio with Versioning",
            "Direct Export to Etsy Shop Manager",
          ],
        },
      });
    }

    return NextResponse.json({ error: "Unsupported tool type." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute free tool preview." }, { status: 500 });
  }
}
