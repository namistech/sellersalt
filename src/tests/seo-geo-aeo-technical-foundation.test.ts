import { describe, it } from "node:test";
import assert from "node:assert";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import {
  extractMetaToken,
  parseCustomMetaTags,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
  buildFaqPageSchema,
  buildBreadcrumbListSchema,
} from "@/lib/seo-structured-data";
import { SETTING_DEFINITIONS } from "@/lib/app-settings";

describe("SEO / GEO / AEO Technical Foundation & Site Verification Test Suite", () => {
  describe("Part A: Third-Party Site Verification Token Parsing & Admin Settings", () => {
    it("verifies setting definitions include Google, Bing, Meta, Pinterest, and Custom Meta tags", () => {
      const keys = SETTING_DEFINITIONS.map((s) => s.key);
      assert.ok(keys.includes("seo_google_site_verification"), "Missing seo_google_site_verification");
      assert.ok(keys.includes("seo_bing_site_verification"), "Missing seo_bing_site_verification");
      assert.ok(keys.includes("seo_meta_domain_verification"), "Missing seo_meta_domain_verification");
      assert.ok(keys.includes("seo_pinterest_site_verification"), "Missing seo_pinterest_site_verification");
      assert.ok(keys.includes("seo_custom_meta_tags"), "Missing seo_custom_meta_tags");
    });

    it("extracts tokens from raw strings, full HTML meta tags, and key=value pairs", () => {
      // Raw string
      assert.strictEqual(extractMetaToken("abc123xyz"), "abc123xyz");
      // Full HTML tag
      assert.strictEqual(
        extractMetaToken('<meta name="google-site-verification" content="google_token_456" />'),
        "google_token_456"
      );
      // Key=value pair
      assert.strictEqual(extractMetaToken("msvalidate.01=bing_token_789"), "bing_token_789");
      // Null / empty
      assert.strictEqual(extractMetaToken(""), undefined);
      assert.strictEqual(extractMetaToken(null), undefined);
    });

    it("parses multi-line custom meta tags into key/values", () => {
      const input = `<meta name="facebook-domain-verification" content="meta_xyz" />\n<meta property="custom-prop" content="prop_val" />\ncustom_key=custom_val`;
      const parsed = parseCustomMetaTags(input);
      assert.deepStrictEqual(parsed["facebook-domain-verification"], ["meta_xyz"]);
      assert.deepStrictEqual(parsed["custom-prop"], ["prop_val"]);
      assert.deepStrictEqual(parsed["custom_key"], ["custom_val"]);
    });
  });

  describe("Part B: Schema.org JSON-LD Structured Data", () => {
    const siteUrl = "https://sellersalt.com";

    it("builds valid Organization schema with contactPoint and social links", () => {
      const org = buildOrganizationSchema(siteUrl);
      assert.strictEqual(org["@type"], "Organization");
      assert.strictEqual(org.name, "SellerSalt");
      assert.strictEqual(org.url, siteUrl);
      assert.ok(org.logo.includes("icon.png"));
      assert.strictEqual(org.contactPoint.email, "support@sellersalt.com");
      assert.ok(Array.isArray(org.sameAs) && org.sameAs.length > 0);
    });

    it("builds WebSite schema with SearchAction potentialAction", () => {
      const site = buildWebSiteSchema(siteUrl);
      assert.strictEqual(site["@type"], "WebSite");
      assert.strictEqual(site.url, siteUrl);
      assert.strictEqual(site.potentialAction["@type"], "SearchAction");
      assert.ok(site.potentialAction.target.urlTemplate.includes("search_term_string"));
    });

    it("builds SoftwareApplication schema with real pricing tier offers", () => {
      const app = buildSoftwareApplicationSchema(siteUrl, [
        { name: "Starter", price: 19 },
        { name: "Pro", price: 49 },
      ]);
      assert.strictEqual(app["@type"], "SoftwareApplication");
      assert.strictEqual(app.applicationCategory, "BusinessApplication");
      assert.strictEqual(app.offers.length, 2);
      assert.strictEqual(app.offers[0].name, "Starter");
      assert.strictEqual(app.offers[0].price, "19");
    });

    it("builds FAQPage schema wrapping questions and answers verbatim", () => {
      const faqs = [
        { q: "What is SellerSalt?", a: "Evidence-based intelligence platform." },
        { q: "How does it work?", a: "5-step methodology." },
      ];
      const faqPage = buildFaqPageSchema(faqs);
      assert.strictEqual(faqPage["@type"], "FAQPage");
      assert.strictEqual(faqPage.mainEntity.length, 2);
      assert.strictEqual(faqPage.mainEntity[0].name, "What is SellerSalt?");
      assert.strictEqual(faqPage.mainEntity[0].acceptedAnswer.text, "Evidence-based intelligence platform.");
    });

    it("builds BreadcrumbList schema with sequential positions", () => {
      const crumbs = [
        { name: "Home", url: "/" },
        { name: "Pricing", url: "/pricing" },
      ];
      const breadcrumbs = buildBreadcrumbListSchema(crumbs, siteUrl);
      assert.strictEqual(breadcrumbs["@type"], "BreadcrumbList");
      assert.strictEqual(breadcrumbs.itemListElement.length, 2);
      assert.strictEqual(breadcrumbs.itemListElement[0].position, 1);
      assert.strictEqual(breadcrumbs.itemListElement[0].item, "https://sellersalt.com/");
      assert.strictEqual(breadcrumbs.itemListElement[1].position, 2);
      assert.strictEqual(breadcrumbs.itemListElement[1].item, "https://sellersalt.com/pricing");
    });
  });

  describe("Part C: Sitemap, Robots, and Crawler Access", () => {
    it("generates dynamic sitemap containing all public marketing and legal routes", () => {
      const items = sitemap();
      const urls = items.map((i) => i.url);
      const expectedPaths = [
        "/pricing",
        "/how-it-works",
        "/shops",
        "/trust",
        "/marketplaces",
        "/contact",
        "/terms",
        "/privacy",
        "/trademarks",
      ];

      // Root path is present
      assert.ok(urls.some((u) => !u.endsWith("/pricing") && !u.endsWith("/terms")), "Sitemap must have root entry");

      for (const p of expectedPaths) {
        assert.ok(
          urls.some((u) => u.endsWith(p)),
          `Sitemap should contain ${p}`
        );
      }

      // Ensure no private routes are in sitemap
      assert.ok(!urls.some((u) => u.includes("/admin")), "Sitemap must not contain /admin");
      assert.ok(!urls.some((u) => u.includes("/dashboard")), "Sitemap must not contain /dashboard");
      assert.ok(!urls.some((u) => u.includes("/api")), "Sitemap must not contain /api");
    });

    it("configures robots.txt to allow search crawlers and explicit AI/AEO crawlers on public routes", () => {
      const config = robots();
      const rules = config.rules as Array<{ userAgent: string; allow: string[]; disallow: string[] }>;
      const userAgents = rules.map((r) => r.userAgent);

      assert.ok(userAgents.includes("*"));
      assert.ok(userAgents.includes("Googlebot"));
      assert.ok(userAgents.includes("Bingbot"));
      assert.ok(userAgents.includes("GPTBot"), "Must allow GPTBot for AEO");
      assert.ok(userAgents.includes("ClaudeBot"), "Must allow ClaudeBot for AEO");
      assert.ok(userAgents.includes("PerplexityBot"), "Must allow PerplexityBot for AEO");
      assert.ok(userAgents.includes("Google-Extended"), "Must allow Google-Extended for GEO");

      const defaultRule = rules.find((r) => r.userAgent === "*");
      assert.ok(defaultRule?.allow.includes("/pricing"));
      assert.ok(defaultRule?.disallow.includes("/admin/"));
      assert.ok(defaultRule?.disallow.includes("/api/"));
    });

    it("serves llms.txt route with clean markdown content and 200 status", async () => {
      const res = await getLlmsTxt();
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get("Content-Type")?.includes("text/plain"));
      const text = await res.text();
      assert.ok(text.includes("# SellerSalt"));
      assert.ok(text.includes("Zero-Fabrication Contract"));
      assert.ok(text.includes("/pricing"));
    });
  });
});
