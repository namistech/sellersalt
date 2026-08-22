export const dynamic = "force-static";

const SITE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";

export async function GET() {
  const cleanBase = SITE_URL.replace(/\/+$/, "");

  const content = `# SellerSalt
> The Evidence-Based Ecommerce Intelligence & Product Opportunity Platform

SellerSalt helps ecommerce sellers, brands, and agencies discover validated product opportunities, observe real market dynamics, validate commercial feasibility, and build evidence-grounded launch plans before spending capital.

## Core Capabilities
- **Opportunity Discovery & Radar**: Continuous detection of unserved demand, high-velocity niches, and market gaps across commerce channels.
- **Observable Market Research**: Empirical tracking of live product listings, keyword taxonomy, pricing distributions, and seller density.
- **Commercial Validation Engine**: Deterministic unit economics modeling (conservative, base, optimistic scenarios), landed sourcing feasibility, and 10-vector launch readiness scores.
- **13-Tag SEO Taxonomy Audit**: Rule-parameterized listing optimization enforcing marketplace character constraints and tag compliance.
- **Multi-Marketplace Architecture**: Unified canonical data connectors for Etsy, Shopify, WooCommerce, Amazon, eBay, and TikTok Shop.
- **AI Assistant & MCP Connectivity**: Operate SellerSalt through Claude, Gemini, or custom agents via Model Context Protocol (MCP) and third-party integrations (Zapier, Slack).

## Zero-Fabrication Contract
SellerSalt strictly separates observable marketplace facts from derived formulas and user costs:
- Observed metrics: Live, public signals directly measured from marketplaces (price, star rating, review count).
- Derived metrics: Transparent, deterministic formulas (velocity ratios, concentration indexes).
- Unavailable metrics: When data cannot be legitimately or legally observed, it is strictly marked \`UNAVAILABLE\` and never fabricated.

## Core Public Pages & Documentation
- [Homepage](${cleanBase}/): Overview of the evidence-grounded 5-step methodology (Discover, Research, Validate, Plan, Launch).
- [Pricing & Subscription Plans](${cleanBase}/pricing): Transparent plans (Free Explorer $0, Starter $19/mo, Pro $49/mo, Agency $199/mo).
- [How It Works](${cleanBase}/how-it-works): Detailed breakdown of commercial validation models and data integrity standards.
- [Etsy Shop Directory](${cleanBase}/shops): Public benchmark directory of top performing shops and category niches.
- [Trust Center](${cleanBase}/trust): Data governance, retention policies, multi-tenant security, and zero-fabrication standards.
- [Marketplaces Integration Matrix](${cleanBase}/marketplaces): Live connector capability registry across supported platforms.
- [Trademark Disclosures](${cleanBase}/trademarks): Third-party platform brand notices and independent software provider status.
- [Terms of Service](${cleanBase}/terms): Subscription policies, acceptable use, and platform terms.
- [Privacy Policy](${cleanBase}/privacy): User data protection and regional privacy governance.
- [Support & Inquiries](${cleanBase}/contact): Customer support and team assistance.

## Legal Entity & Governance
- Operator: Netdrix Cloud Services (UAE), operating as Netdrix Digital
- UK Affiliate: ErgoForge Global Limited
- Support: support@sellersalt.com
`;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
