/**
 * Canonical Schema.org JSON-LD Structured Data Builders
 * Strictly grounded in observable platform capabilities and zero synthetic metrics.
 */

export const DEFAULT_SITE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";

export interface FaqItem {
  q: string;
  a: string;
}

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

/**
 * Extracts clean token from raw token, key=value, or <meta ... content="..." /> string
 */
export function extractMetaToken(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  const s = input.trim();
  if (!s) return undefined;

  // If full HTML tag: <meta name="..." content="..." />
  const contentMatch = s.match(/content=["']([^"']+)["']/i);
  if (contentMatch) return contentMatch[1].trim();

  // If key=value pair
  const kvMatch = s.match(/^[a-zA-Z0-9_.:-]+=(.+)$/);
  if (kvMatch) return kvMatch[1].trim();

  return s;
}

/**
 * Parses multi-line custom meta tag inputs into structured name/content records
 */
export function parseCustomMetaTags(input: string | null | undefined): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!input) return result;

  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Format: <meta name="..." content="..." /> or <meta property="..." content="..." />
    const nameMatch = line.match(/(?:name|property)=["']([^"']+)["']/i);
    const contentMatch = line.match(/content=["']([^"']+)["']/i);

    if (nameMatch && contentMatch) {
      const key = nameMatch[1].trim();
      const val = contentMatch[1].trim();
      if (!result[key]) result[key] = [];
      result[key].push(val);
      continue;
    }

    // Format: name=content
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      if (key && val) {
        if (!result[key]) result[key] = [];
        result[key].push(val);
      }
    }
  }

  return result;
}

/**
 * Organization Schema (Present on every page)
 */
export function buildOrganizationSchema(baseUrl: string = DEFAULT_SITE_URL) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return {
    "@type": "Organization",
    "@id": `${cleanBase}/#organization`,
    name: "SellerSalt",
    url: cleanBase,
    logo: `${cleanBase}/icon.png`,
    description:
      "SellerSalt is the evidence-based ecommerce intelligence and product validation platform for merchants, brands, and agencies.",
    sameAs: [
      "https://twitter.com/sellersalt",
      "https://github.com/namistech/sellersalt",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@sellersalt.com",
      contactType: "customer support",
      availableLanguage: ["English"],
    },
  };
}

/**
 * WebSite Schema with SearchAction
 */
export function buildWebSiteSchema(baseUrl: string = DEFAULT_SITE_URL) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return {
    "@type": "WebSite",
    "@id": `${cleanBase}/#website`,
    url: cleanBase,
    name: "SellerSalt",
    description: "Ecommerce Intelligence Platform — Know what to sell and prove it.",
    publisher: { "@id": `${cleanBase}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${cleanBase}/signup?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * SoftwareApplication Schema with real pricing tier offers
 */
export function buildSoftwareApplicationSchema(
  baseUrl: string = DEFAULT_SITE_URL,
  customOffers?: Array<{ name: string; price: number | string; priceCurrency?: string }>
) {
  const cleanBase = baseUrl.replace(/\/+$/, "");

  const offers = customOffers?.length
    ? customOffers.map((o) => ({
        "@type": "Offer",
        name: o.name,
        price: String(o.price),
        priceCurrency: o.priceCurrency || "USD",
        priceValidUntil: "2027-12-31",
      }))
    : [
        {
          "@type": "Offer",
          name: "Free Explorer",
          price: "0",
          priceCurrency: "USD",
          description: "Free market research & product hunting starter tier",
        },
        {
          "@type": "Offer",
          name: "Starter",
          price: "19",
          priceCurrency: "USD",
          description: "Growing seller research and shop tracking tier",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "49",
          priceCurrency: "USD",
          description: "Full multi-marketplace intelligence and Opportunity Radar",
        },
        {
          "@type": "Offer",
          name: "Agency",
          price: "199",
          priceCurrency: "USD",
          description: "Multi-client workspaces, highest quota limits, and team seats",
        },
      ];

  return {
    "@type": "SoftwareApplication",
    "@id": `${cleanBase}/#application`,
    name: "SellerSalt Intelligence Platform",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web-based",
    url: cleanBase,
    description:
      "Evidence-based ecommerce intelligence and product validation platform for independent merchants, brands, and agencies.",
    offers,
  };
}

/**
 * FAQPage Schema
 */
export function buildFaqPageSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

/**
 * BreadcrumbList Schema for nested navigation
 */
export function buildBreadcrumbListSchema(
  crumbs: BreadcrumbItem[],
  baseUrl: string = DEFAULT_SITE_URL
) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, idx) => {
      const itemUrl = crumb.url
        ? crumb.url.startsWith("http")
          ? crumb.url
          : `${cleanBase}${crumb.url.startsWith("/") ? "" : "/"}${crumb.url}`
        : undefined;

      return {
        "@type": "ListItem",
        position: idx + 1,
        name: crumb.name,
        ...(itemUrl ? { item: itemUrl } : {}),
      };
    }),
  };
}
