/**
 * Priority 1 Security Remediation Tests: OAuth Scope Reduction
 * 
 * Verifies that:
 * 1. Shopify connect route requests strictly "read_orders" (least privilege).
 * 2. WooCommerce connect route requests strictly "read" (least privilege).
 * 3. Prohibited write scopes (write_products, read_products, read_write) are not requested.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Priority 1: OAuth Scope Reduction to Least Privilege", () => {
  it("1. Shopify connect route requests strictly read_orders", () => {
    const code = readSrc("src/app/api/seller-channels/shopify/connect/route.ts");
    assert.ok(code.includes('const SCOPES = "read_orders";'), "Shopify SCOPES must be 'read_orders'");
    assert.ok(!code.includes("write_products"), "Shopify SCOPES must not include write_products");
    assert.ok(!code.includes("read_products"), "Shopify SCOPES must not include read_products");
  });

  it("2. WooCommerce connect route requests strictly read scope", () => {
    const code = readSrc("src/app/api/seller-channels/woocommerce/connect/route.ts");
    assert.ok(code.includes('.set("scope", "read");'), "WooCommerce scope must be 'read'");
    assert.ok(!code.includes('.set("scope", "read_write");'), "WooCommerce scope must not be 'read_write'");
  });
});
