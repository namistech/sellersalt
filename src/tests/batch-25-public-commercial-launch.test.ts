import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSrcFile(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf-8");
}

describe("Batch 25: Public Commercial Layer & Launch Readiness Foundation", () => {
  describe("1. Canonical Product Positioning & SEO Metadata", () => {
    it("exports canonical positioning headline and description in root page metadata", () => {
      const rootPageCode = readSrcFile("src/app/page.tsx");
      assert.ok(
        rootPageCode.includes("Know What to Sell Before You Spend Money"),
        "Root title must feature canonical positioning"
      );
      assert.ok(
        rootPageCode.includes("SellerSalt helps ecommerce merchants discover opportunities"),
        "Root description must describe ecommerce intelligence"
      );
      assert.ok(rootPageCode.includes("openGraph"), "OpenGraph metadata must be present");
      assert.ok(rootPageCode.includes("twitter"), "Twitter card metadata must be present");
    });

    it("exports comprehensive metadata for How It Works and Pricing pages", () => {
      const howItWorksCode = readSrcFile("src/app/how-it-works/page.tsx");
      const pricingCode = readSrcFile("src/app/pricing/page.tsx");

      assert.ok(
        howItWorksCode.includes("How It Works — Ecommerce Intelligence Methodology"),
        "How It Works page title must be defined"
      );
      assert.ok(
        pricingCode.includes("Pricing Plans — Ecommerce Intelligence Platform"),
        "Pricing page title must be defined"
      );
    });
  });

  describe("2. Claim Safety & Forbidden Copy Audit", () => {
    it("ensures homepage source code does not contain prohibited speculative copy", () => {
      const homeCode = readSrcFile("src/app/marketing-homepage.tsx");

      const forbiddenPhrases = [
        "guaranteed to sell",
        "winning product guaranteed",
        "exact monthly sales",
        "spy on competitors",
        "secret marketplace data",
        "100% accurate demand prediction",
      ];

      for (const phrase of forbiddenPhrases) {
        assert.ok(
          !homeCode.toLowerCase().includes(phrase),
          `Homepage must not include prohibited claim: "${phrase}"`
        );
      }
    });

    it("ensures homepage highlights observable evidence and zero-fabrication contract", () => {
      const homeCode = readSrcFile("src/app/marketing-homepage.tsx");

      assert.ok(
        homeCode.includes("Zero-Fabrication Contract"),
        "Homepage must explicitly mention Zero-Fabrication Contract"
      );
      assert.ok(
        homeCode.includes("OBSERVED"),
        "Homepage must explain OBSERVED signal class"
      );
      assert.ok(
        homeCode.includes("UNAVAILABLE"),
        "Homepage must explain UNAVAILABLE signal class"
      );
    });
  });

  describe("3. 5-Step Canonical Workflow Architecture", () => {
    it("defines the 5 core workflow steps with accurate descriptions in How It Works", () => {
      const howItWorksCode = readSrcFile("src/app/how-it-works/page.tsx");

      assert.ok(howItWorksCode.includes("Step 1"), "Step 1 (Discover) must be present");
      assert.ok(howItWorksCode.includes("Step 2"), "Step 2 (Research) must be present");
      assert.ok(howItWorksCode.includes("Step 3"), "Step 3 (Validate) must be present");
      assert.ok(howItWorksCode.includes("Step 4"), "Step 4 (Plan) must be present");
      assert.ok(howItWorksCode.includes("Step 5"), "Step 5 (Launch) must be present");
    });
  });

  describe("4. Marketplace Brand Safety & Attribution Disclaimers", () => {
    it("renders required marketplace trademark disclaimer on marketing pages", () => {
      const homeCode = readSrcFile("src/app/marketing-homepage.tsx");
      const howItWorksCode = readSrcFile("src/app/how-it-works/page.tsx");

      assert.ok(
        homeCode.includes("MarketplaceDisclaimerBox"),
        "Homepage must include MarketplaceDisclaimerBox"
      );
      assert.ok(
        howItWorksCode.includes("MarketplaceDisclaimerBox"),
        "How It Works must include MarketplaceDisclaimerBox"
      );
    });
  });
});
