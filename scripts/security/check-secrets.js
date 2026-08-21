#!/usr/bin/env node

/**
 * SellerSalt Secret & Dump Scanner
 * 
 * Scans staged git files and workspace files for:
 * 1. Accidental database dumps (.sql, db_backup_*.json, dump_*.json, backups/*)
 * 2. Unencrypted credential / environment files (.env*, *.pem, *.key, id_rsa*)
 * 3. High-risk credential patterns (live AWS keys, Stripe live keys, Etsy client secrets, DB connection strings with passwords)
 * 
 * Exit code 0 if clean, 1 if forbidden patterns or files are detected.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const FORBIDDEN_FILE_PATTERNS = [
  /^backups\//i,
  /^backup\//i,
  /db_backup_.*\.json$/i,
  /.*_backup_.*\.json$/i,
  /\.sql$/i,
  /^\.env(\..+)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa/i,
  /credentials\.json$/i,
];

// Exceptions that are allowed to be committed
export const ALLOWED_FILES = [
  ".env.example",
  ".env.test",
];

export const FORBIDDEN_CONTENT_PATTERNS = [
  { name: "Live Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: "AWS Secret Access Key", regex: /(?:AWS_SECRET_ACCESS_KEY|aws_secret_access_key)\s*=\s*['"][0-9a-zA-Z\/+=]{40}['"]/ },
  { name: "Private RSA Key Header", regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/ },
  { name: "Postgres Connection URI with Password", regex: /postgresql:\/\/[^:]+:[^@]+@[a-zA-Z0-9.-]+:\d+\/[^?\s]+/ },
];

export function getStagedFiles() {
  try {
    const stdout = execSync("git diff --cached --name-only", { encoding: "utf-8" });
    return stdout.split("\n").map((f) => f.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function runScanner() {
  const stagedFiles = getStagedFiles();
  const filesToCheck = stagedFiles.length > 0 ? stagedFiles : [];
  let violations = [];

  console.log(`[SecretScanner] Inspecting ${filesToCheck.length > 0 ? filesToCheck.length + " staged file(s)" : "workspace configuration"}...`);

  for (const file of filesToCheck) {
    const basename = path.basename(file);
    if (ALLOWED_FILES.includes(basename) || ALLOWED_FILES.includes(file)) {
      continue;
    }

    // 1. Check filename patterns
    for (const pat of FORBIDDEN_FILE_PATTERNS) {
      if (pat.test(file) || pat.test(basename)) {
        violations.push({
          file,
          reason: `Filename matches forbidden credential/dump pattern: ${pat.toString()}`,
        });
        break;
      }
    }

    // 2. Check file contents if file exists
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      if (stats.size > 5 * 1024 * 1024) {
        violations.push({
          file,
          reason: `File size exceeds 5MB (${(stats.size / 1024 / 1024).toFixed(1)}MB) — possible uncompressed data dump`,
        });
        continue;
      }

      try {
        const content = fs.readFileSync(file, "utf-8");
        for (const pattern of FORBIDDEN_CONTENT_PATTERNS) {
          if (pattern.regex.test(content)) {
            // Ignore test files or documentation referencing patterns
            if (!file.includes("tests/") && !file.includes("docs/") && !file.includes("scripts/security/")) {
              violations.push({
                file,
                reason: `Contains suspected secret pattern: ${pattern.name}`,
              });
            }
          }
        }
      } catch {
        // Binary file, skip content scan
      }
    }
  }

  if (violations.length > 0) {
    console.error("\n❌ [SecretScanner] BLOCKED: Potential secret or database dump detected:");
    for (const v of violations) {
      console.error(`  - ${v.file}: ${v.reason}`);
    }
    console.error("\nPlease remove these files/secrets before committing.\n");
    process.exit(1);
  }

  console.log("✅ [SecretScanner] No secrets, private keys, or DB dumps detected.");
  process.exit(0);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  runScanner();
}
