import { prisma } from "@/lib/db";
import { evaluateCanonicalOpportunity } from "@/services/intelligence/canonical-opportunity";
import type { MarketplaceId } from "@/marketplaces/core/types";

export interface GoogleSheetsExportParams {
  organizationId: string;
  searchConfigId?: string;
  keyword?: string;
  spreadsheetTitle?: string;
  accessToken?: string;
}

export interface GoogleSheetsExportResult {
  success: boolean;
  spreadsheetUrl?: string;
  rowsExported: number;
  error?: string;
}

/**
 * Google Sheets Connector Engine.
 * Formats structured prospect intelligence rows for Google Sheets API.
 */
export async function exportProspectsToGoogleSheets(
  params: GoogleSheetsExportParams
): Promise<GoogleSheetsExportResult> {
  const prospects = await prisma.prospect.findMany({
    where: {
      organizationId: params.organizationId,
      searchConfigId: params.searchConfigId,
      keyword: params.keyword ? { contains: params.keyword, mode: "insensitive" } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  if (prospects.length === 0) {
    return {
      success: false,
      rowsExported: 0,
      error: "No prospects found matching the specified search criteria.",
    };
  }

  const headers = [
    "Listing Title",
    "Price (USD)",
    "Est. Daily Sales",
    "Observed Lifetime Sales",
    "Review Count",
    "Shop Name",
    "Shop Age (Mo)",
    "Opportunity Score",
    "Demand Signal",
    "Why It Wins",
    "Etsy Listing URL",
  ];

  const rows = prospects.map((p) => {
    const marketplace = (p.marketplace?.toLowerCase() as MarketplaceId) || "etsy";
    const canonical = evaluateCanonicalOpportunity({
      marketplace,
      price: {
        value: p.price,
        availability: p.price !== null ? "OBSERVED" : "UNAVAILABLE",
        provenance: p.price !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
        source: "etsy_listing_price",
      },
      estDailySales: {
        value: p.estDailySales && p.estDailySales > 0 ? p.estDailySales : null,
        availability: p.estDailySales && p.estDailySales > 0 ? "ESTIMATED" : "UNAVAILABLE",
        provenance: p.estDailySales && p.estDailySales > 0 ? "ESTIMATED" : "UNAVAILABLE",
        source: "etsy_transaction_velocity",
      },
      shopReviewCount: {
        value: p.reviewCount,
        availability: p.reviewCount !== null ? "OBSERVED" : "UNAVAILABLE",
        provenance: p.reviewCount !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
        source: "etsy_shop_review_count",
      },
      listingAgeDays: {
        value: Math.max(1, Math.round((Date.now() - new Date(p.createdAt).getTime()) / (24 * 3600 * 1000))),
        availability: "OBSERVED",
        provenance: "ACTUAL_DATA",
        source: "prospect_created_at",
      },
      numFavorers: {
        value: p.numFavorers,
        availability: p.numFavorers !== null ? "OBSERVED" : "UNAVAILABLE",
        provenance: p.numFavorers !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
        source: "etsy_num_favorers",
      },
    });

    const score = canonical.overallScore !== null ? canonical.overallScore : "—";
    const demandSignal = canonical.signalBreakdown.velocity?.explanation || canonical.signalBreakdown.velocity?.name || "Estimated Demand";
    const whyItWins = canonical.explanation.whyThisScore || canonical.summary || `Opportunity score: ${score}/100`;

    return [
      p.listingTitle,
      p.price !== null ? p.price.toFixed(2) : "Unavailable",
      (p.estDailySales ?? 0).toFixed(1),
      p.totalSales ?? 0,
      p.reviewCount ?? "Unavailable",
      p.shopName,
      p.shopAgeMonths !== null ? Math.round(p.shopAgeMonths) : "Unavailable",
      score,
      demandSignal,
      whyItWins,
      p.listingUrl,
    ];
  });

  // If a live Google access token is provided, perform live Google Sheets v4 API call
  if (params.accessToken) {
    try {
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            title: params.spreadsheetTitle || `SellerSalt Research — ${new Date().toISOString().slice(0, 10)}`,
          },
          sheets: [
            {
              data: [
                {
                  startRow: 0,
                  startColumn: 0,
                  rowData: [
                    { values: headers.map((h) => ({ userEnteredValue: { stringValue: h } })) },
                    ...rows.map((row) => ({
                      values: row.map((val) => ({
                        userEnteredValue:
                          typeof val === "number"
                            ? { numberValue: val }
                            : { stringValue: String(val) },
                      })),
                    })),
                  ],
                },
              ],
            },
          ],
        }),
      });

      if (createRes.ok) {
        const data = await createRes.json();
        return {
          success: true,
          spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
          rowsExported: rows.length,
        };
      }
      const errorBody = await createRes.json().catch(() => null);
      return {
        success: false,
        rowsExported: 0,
        error: errorBody?.error?.message || `Google Sheets API returned ${createRes.status}.`,
      };
    } catch (err: any) {
      return { success: false, rowsExported: 0, error: err?.message || "Google Sheets API request failed." };
    }
  }

  // No access token was provided — this is not a successful export, and
  // claiming otherwise (as this used to do, returning success:true with a
  // link to Google's generic "create a blank spreadsheet" page) told the
  // user their data was exported when nothing was written anywhere.
  return {
    success: false,
    rowsExported: 0,
    error: "Google Sheets isn't connected for this workspace yet.",
  };
}
