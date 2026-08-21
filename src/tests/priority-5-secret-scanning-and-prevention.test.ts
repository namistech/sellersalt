/**
 * Priority 5 Security Remediation Tests: Secret Scanning & Recurrence Prevention
 * 
 * Verifies that:
 * 1. CI workflow contains a dedicated secret-scan job with Gitleaks.
 * 2. Local secret scanner script detects and blocks database dumps (.sql, backups/, db_backup_*.json).
 * 3. Local secret scanner detects unencrypted secrets and private keys.
 * 4. Allowed files (.env.example) pass cleanly.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  FORBIDDEN_FILE_PATTERNS,
  ALLOWED_FILES,
  FORBIDDEN_CONTENT_PATTERNS,
} from "../../scripts/security/check-secrets.js";

const ROOT = process.cwd();
function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Priority 5: Secret Scanning & Recurrence Prevention", () => {
  it("1. Verifies Gitleaks secret-scan job is registered in CI workflow", () => {
    const ciContent = readSrc(".github/workflows/ci.yml");
    assert.ok(ciContent.includes("secret-scan:"), "ci.yml must contain secret-scan job");
    assert.ok(ciContent.includes("gitleaks/gitleaks-action"), "ci.yml must use gitleaks-action");
    assert.ok(ciContent.includes("fetch-depth: 0"), "ci.yml must checkout with fetch-depth: 0 for full commit scan");
  });

  it("2. Verifies forbidden file patterns match dump and credential filenames", () => {
    const testCases = [
      { name: "backups/db_backup_2026-08-17.json", shouldMatch: true },
      { name: "db_backup_2026-08-17.json", shouldMatch: true },
      { name: "backup_dump.sql", shouldMatch: true },
      { name: ".env", shouldMatch: true },
      { name: ".env.production", shouldMatch: true },
      { name: "id_rsa", shouldMatch: true },
      { name: "private.key", shouldMatch: true },
      { name: "server.pem", shouldMatch: true },
      { name: "src/app/page.tsx", shouldMatch: false },
      { name: "package.json", shouldMatch: false },
    ];

    for (const tc of testCases) {
      const matches = FORBIDDEN_FILE_PATTERNS.some((pat: RegExp) => pat.test(tc.name));
      assert.strictEqual(
        matches,
        tc.shouldMatch,
        `Pattern matching failed for ${tc.name}: expected ${tc.shouldMatch}, got ${matches}`
      );
    }
  });

  it("3. Verifies forbidden content patterns catch live secrets and private keys", () => {
    const stripeSecretPattern = FORBIDDEN_CONTENT_PATTERNS.find(
      (p: any) => p.name === "Live Stripe Secret Key"
    );
    assert.ok(stripeSecretPattern);
    assert.ok(
      stripeSecretPattern.regex.test("sk_live_51M0abcdefghijklmnopqrstuvwxyz12345")
    );
    assert.ok(
      !stripeSecretPattern.regex.test("sk_test_51M0abcdefghijklmnopqrstuvwxyz12345")
    );

    const rsaKeyPattern = FORBIDDEN_CONTENT_PATTERNS.find(
      (p: any) => p.name === "Private RSA Key Header"
    );
    assert.ok(rsaKeyPattern);
    assert.ok(rsaKeyPattern.regex.test("-----BEGIN RSA PRIVATE KEY-----"));
  });

  it("4. Verifies ALLOWED_FILES permits .env.example", () => {
    assert.ok(ALLOWED_FILES.includes(".env.example"));
  });
});
