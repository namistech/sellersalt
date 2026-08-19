import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_ETSY_SCOPES } from "@/services/connectors/etsy-oauth-helper";

describe("SellerSalt Etsy Commercial API Compliance Remediation Suite", () => {
  const rootDir = process.cwd();

  it("1. Verifies OAuth Scope Set: least-privilege bundle without shops_w or billing_r", () => {
    assert.ok(DEFAULT_ETSY_SCOPES.includes("listings_w"), "Must include listings_w for draft export");
    assert.ok(DEFAULT_ETSY_SCOPES.includes("listings_r"), "Must include listings_r for SEO audit");
    assert.ok(DEFAULT_ETSY_SCOPES.includes("shops_r"), "Must include shops_r for store identification");
    assert.ok(DEFAULT_ETSY_SCOPES.includes("transactions_r"), "Must include transactions_r for order receipts");

    assert.ok(!DEFAULT_ETSY_SCOPES.includes("shops_w"), "Must NOT request shops_w (unused)");
    assert.ok(!DEFAULT_ETSY_SCOPES.includes("billing_r"), "Must NOT request billing_r (unused)");
  });

  it("2. Verifies OAuth User Resolution: no non-existent /users/me endpoint", () => {
    const authCode = fs.readFileSync(path.join(rootDir, "src/lib/auth.ts"), "utf-8");
    assert.ok(!authCode.includes("/users/me"), "Must NOT reference non-existent /users/me endpoint");
    assert.ok(authCode.includes("accessToken.split(\".\")[0]"), "Must dynamically resolve user_id from token prefix");
  });

  it("3. Verifies Browser Extension Manifest: no *.etsy.com host permissions or content scripts", () => {
    const manifestRaw = fs.readFileSync(path.join(rootDir, "extension/manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);

    const hasEtsyHost = (manifest.host_permissions || []).some((h: string) => h.includes("etsy.com"));
    assert.strictEqual(hasEtsyHost, false, "Extension manifest must not request *.etsy.com host permissions");

    const hasEtsyScript = (manifest.content_scripts || []).some((cs: any) =>
      (cs.matches || []).some((m: string) => m.includes("etsy.com"))
    );
    assert.strictEqual(hasEtsyScript, false, "Extension manifest must not inject content scripts into etsy.com");
  });

  it("4. Verifies Browser Extension Selectors: the DOM _setNativeValue write path was fully removed, not disabled in place", () => {
    // extension/etsy/selectors.js (the module that held _setNativeValue,
    // setTitleValue, setTagsValue) was deleted outright rather than
    // patched — assert no file anywhere in the extension bundle still
    // contains that DOM write injection method.
    const extensionDir = path.join(rootDir, "extension");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".js") && fs.readFileSync(full, "utf-8").includes("_setNativeValue")) {
          offenders.push(full);
        }
      }
    };
    walk(extensionDir);
    assert.deepStrictEqual(offenders, [], "No extension file may contain the _setNativeValue DOM write injection method");
  });

  it("5. Verifies Channel Disconnect Lifecycle: unlinks drafts and stops queue", () => {
    const routeCode = fs.readFileSync(path.join(rootDir, "src/app/api/seller-channels/[id]/route.ts"), "utf-8");
    assert.ok(routeCode.includes("stopSellerChannelSync"), "Must stop queue sync on disconnect");
    assert.ok(routeCode.includes("sellerChannelId: null"), "Must decouple independent drafts on disconnect");
  });

  it("6. Verifies Package Identity: package.json name is sellersalt", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
    assert.strictEqual(pkg.name, "sellersalt", "Package name must be sellersalt");
  });

  it("7. Verifies Public Metadata: layout and schema.org do not advertise surveillance", () => {
    const layoutCode = fs.readFileSync(path.join(rootDir, "src/app/layout.tsx"), "utf-8");
    assert.ok(!layoutCode.toLowerCase().includes("surveillance"), "Layout metadata and schema.org must not use surveillance wording");
  });

  it("8. Verifies AI Data Isolation: prompt construction does not inject competitor raw text", () => {
    const genCode = fs.readFileSync(path.join(rootDir, "src/services/listing-generation.ts"), "utf-8");
    assert.ok(genCode.includes("input.conceptTitle"), "AI prompt must use user-supplied conceptTitle");
    assert.ok(!genCode.includes("${input.sourceTitle}"), "AI prompt must not embed third-party sourceTitle in prompt");
    assert.ok(!genCode.includes("${input.sourceDescription}"), "AI prompt must not embed third-party sourceDescription in prompt");
  });

  it("9. Verifies Etsy OAuth token endpoint is present on the live provider (getAuthOptions)", () => {
    const authCode = fs.readFileSync(path.join(rootDir, "src/lib/auth.ts"), "utf-8");
    // getAuthOptions() builds the provider array actually used by
    // src/app/api/auth/[...nextauth]/route.ts — it must retain a token
    // endpoint or Etsy OAuth sign-in breaks entirely.
    const getAuthOptionsBlock = authCode.slice(
      authCode.indexOf("export async function getAuthOptions"),
      authCode.indexOf("export const authOptions")
    );
    assert.ok(
      getAuthOptionsBlock.includes('token: "https://api.etsy.com/v3/public/oauth/token"'),
      "getAuthOptions()'s Etsy provider must declare a token endpoint"
    );
  });

  it("10. Verifies Etsy DOM content script and its support modules are fully removed, not just disabled", () => {
    assert.strictEqual(fs.existsSync(path.join(rootDir, "extension/etsy-content-script.js")), false, "etsy-content-script.js must not exist");
    assert.strictEqual(fs.existsSync(path.join(rootDir, "extension/etsy")), false, "extension/etsy/ (DOM selectors) must not exist");
    assert.strictEqual(fs.existsSync(path.join(rootDir, "extension/lib/seo-request.js")), false, "orphaned seo-request.js must not exist");
    assert.strictEqual(fs.existsSync(path.join(rootDir, "extension/lib/suggestions.js")), false, "orphaned suggestions.js must not exist");

    const backgroundCode = fs.readFileSync(path.join(rootDir, "extension/background.js"), "utf-8");
    assert.ok(!backgroundCode.includes("APPLY_SUGGESTION"), "background.js must not relay APPLY_SUGGESTION to any tab");
    assert.ok(!backgroundCode.includes("ETSY_EDITOR_SNAPSHOT"), "background.js must not handle ETSY_EDITOR_SNAPSHOT");

    const apiClientCode = fs.readFileSync(path.join(rootDir, "extension/lib/api-client.js"), "utf-8");
    assert.ok(!apiClientCode.includes("requestSeoAudit"), "api-client.js must not expose requestSeoAudit (Etsy DOM-only consumer)");
    assert.ok(!apiClientCode.includes("requestSuggestions"), "api-client.js must not expose requestSuggestions (Etsy DOM-only consumer)");
  });

  it("11. Verifies Etsy-derived snapshot retention is bounded, not stored indefinitely", () => {
    const retentionCode = fs.readFileSync(path.join(rootDir, "src/lib/data-retention.ts"), "utf-8");
    assert.ok(retentionCode.includes("getSnapshotRetentionCutoff"), "Must export a retention cutoff helper");

    const workerCode = fs.readFileSync(path.join(rootDir, "src/workers/index.ts"), "utf-8");
    assert.ok(workerCode.includes("getSnapshotRetentionCutoff"), "ShopSnapshot capture must prune via the shared retention helper");

    const listingsRouteCode = fs.readFileSync(path.join(rootDir, "src/app/api/tracking/listings/route.ts"), "utf-8");
    assert.ok(listingsRouteCode.includes("getSnapshotRetentionCutoff"), "ListingSnapshot capture must prune via the shared retention helper");
  });

  it("12. Verifies no prohibited surveillance/spy/stalk terminology on core public-facing surfaces", () => {
    const surfaces = [
      "src/app/layout.tsx",
      "src/app/page.tsx",
      "src/app/marketing-homepage.tsx",
      "src/components/public/PublicFooter.tsx",
      "src/app/(dashboard)/spy/page.tsx",
      "src/app/(dashboard)/dashboard/dashboard-client.tsx",
      "src/app/(auth)/login/page.tsx",
      "src/app/checkout/checkout-client.tsx",
    ];
    const forbidden = /\bspy\b|\bstalk\b|surveillance|scraper|scraping/i;
    for (const rel of surfaces) {
      const code = fs.readFileSync(path.join(rootDir, rel), "utf-8");
      // Route paths like "/spy" are identifiers, not prose — strip them
      // before scanning so the assertion targets user-visible copy only.
      const prose = code.replace(/["'`]\/spy[a-z/?=&-]*["'`]/gi, '""').replace(/id="spy"|id: "spy"/gi, "");
      assert.ok(!forbidden.test(prose), `${rel} must not contain surveillance/spy/stalk/scraper wording in visible copy`);
    }
  });

  it("13. Verifies transactions_r is backed by a real receipts sync call (not requested speculatively)", () => {
    const etsySellerCode = fs.readFileSync(path.join(rootDir, "src/seller-channels/etsy-seller/index.ts"), "utf-8");
    assert.ok(etsySellerCode.includes("/receipts"), "transactions_r scope must back a real Etsy receipts API call");
  });

  it("14. Verifies disconnect lifecycle decouples independent data before purging channel + tokens", () => {
    const routeCode = fs.readFileSync(path.join(rootDir, "src/app/api/seller-channels/[id]/route.ts"), "utf-8");
    const decoupleIdx = routeCode.indexOf("sellerChannelId: null");
    const deleteChannelIdx = routeCode.indexOf("prisma.sellerChannel.deleteMany");
    assert.ok(decoupleIdx > -1 && deleteChannelIdx > -1 && decoupleIdx < deleteChannelIdx, "Independent drafts must be decoupled before the channel (and its encrypted tokens) are deleted");
  });
});
