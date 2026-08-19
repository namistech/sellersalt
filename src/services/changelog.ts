// SellerSalt Release Changelog Data

export type ChangeType = "NEW" | "IMPROVED" | "FIXED" | "PERFORMANCE" | "SECURITY";

export interface ChangelogItem {
  type: ChangeType;
  text: string;
}

export interface ReleaseEntry {
  version: string;
  date: string;
  headline: string;
  summary: string;
  changes: ChangelogItem[];
}

export const RELEASES: ReleaseEntry[] = [
  {
    version: "v1.7.0",
    date: "August 16, 2026",
    headline: "Market Research Engine & Research Dossiers",
    summary: "Complete redesign of the market research engine with automated periodic snapshot capture, robust image pipeline with SVG fallbacks, universal scoring engine, and public roadmap.",
    changes: [
      {
        type: "NEW",
        text: "Automated longitudinal market research tracking for Etsy shops and high-velocity listings.",
      },
      {
        type: "NEW",
        text: "Interactive Community Roadmap with feature voting and automated similarity deduplication.",
      },
      {
        type: "NEW",
        text: "Integrated Customer Support Ticket Hub with real-time status and priority management.",
      },
      {
        type: "IMPROVED",
        text: "Shop Research Dossier redesigned with cover pattern banner, universal competition rubric, and dual-series volume/revenue projection.",
      },
      {
        type: "IMPROVED",
        text: "High-contrast global UI tokens and enhanced typography hierarchy across all dashboard surfaces.",
      },
      {
        type: "FIXED",
        text: "Fixed Market Research Engine 500 error on shop links by adding resilient shop name resolution and graceful quota fallbacks.",
      },
      {
        type: "FIXED",
        text: "Fixed broken image states with intelligent <SafeImage> fallbacks and URL formatting.",
      },
    ],
  },
  {
    version: "v1.6.0",
    date: "August 14, 2026",
    headline: "Listing SEO Studio & 13-Tag Originality Engine",
    summary: "Launched deterministic SEO audit rubric, compliant 13-tag optimizer, and N-gram originality protection.",
    changes: [
      {
        type: "NEW",
        text: "Listing SEO Studio with 7-dimension diagnostic scoring (Title, Tags, Synergy, Attributes).",
      },
      {
        type: "NEW",
        text: "Draft Builder with Etsy write-back capability and strict human review gating.",
      },
      {
        type: "SECURITY",
        text: "Strict multi-tenant organization boundary verification across all write operations.",
      },
      {
        type: "IMPROVED",
        text: "Opportunity Radar with interactive metric card visualizers and sparklines.",
      },
    ],
  },
  {
    version: "v1.5.0",
    date: "August 10, 2026",
    headline: "Etsy Buyer Taxonomy & Category Hunting Engine",
    summary: "Introduced official Etsy buyer taxonomy tree navigation, category saturation benchmarks, and winning listing discovery.",
    changes: [
      {
        type: "NEW",
        text: "Full buyer taxonomy navigation with leaf node market entry feasibility scores.",
      },
      {
        type: "NEW",
        text: "12-month seasonality patterns modeled across individual shop and category segments.",
      },
      {
        type: "PERFORMANCE",
        text: "Multi-tier caching layer for taxonomy nodes and shop metrics (24h TTL).",
      },
    ],
  },
];
