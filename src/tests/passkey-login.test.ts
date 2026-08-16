import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Regression coverage for: "passkey registration succeeds, login always
// fails as 'not recognized'." Root cause: registration/login options both
// declare userVerification: "preferred" (an authenticator is never told UV
// is mandatory), but @simplewebauthn/server's verifyRegistrationResponse/
// verifyAuthenticationResponse default requireUserVerification to true.
// Any ceremony where the authenticator doesn't set the UV flag (common —
// differs by browser/authenticator/context, not guaranteed to match what
// happened at registration) made verification throw, which auth.ts's
// broad catch silently turned into "passkey not recognized."
//
// A full live WebAuthn ceremony can't be simulated here without a virtual
// authenticator (real COSE key generation + CBOR attestation signing) —
// that requires live-browser QA. This test instead guards the actual
// regression: that the declared "preferred" policy and the enforced
// verification option stay consistent, so this specific drift can't
// silently reappear.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("Passkey Login Fix: UV policy consistency between generation and verification", async (t) => {
  await t.test("login options declare userVerification: preferred", () => {
    const src = read("src/app/api/auth/passkey/options/route.ts");
    assert.match(src, /userVerification:\s*["']preferred["']/);
  });

  await t.test("registration options declare userVerification: preferred", () => {
    const src = read("src/app/api/settings/passkeys/register/options/route.ts");
    assert.match(src, /userVerification:\s*["']preferred["']/);
  });

  await t.test("login verification explicitly matches with requireUserVerification: false", () => {
    const src = read("src/lib/auth.ts");
    // Scope to the passkey provider's authorize() so this doesn't
    // accidentally match an unrelated part of the file.
    const passkeyProviderStart = src.indexOf('id: "passkey"');
    assert.ok(passkeyProviderStart !== -1, "passkey CredentialsProvider not found");
    const providerSlice = src.slice(passkeyProviderStart, passkeyProviderStart + 3000);
    assert.match(
      providerSlice,
      /verifyAuthenticationResponse\(\{[\s\S]*?requireUserVerification:\s*false/,
      "verifyAuthenticationResponse must pass requireUserVerification: false to match the 'preferred' policy declared at options-generation time"
    );
  });

  await t.test("registration verification explicitly matches with requireUserVerification: false", () => {
    const src = read("src/app/api/settings/passkeys/register/verify/route.ts");
    assert.match(
      src,
      /verifyRegistrationResponse\(\{[\s\S]*?requireUserVerification:\s*false/,
      "verifyRegistrationResponse must pass requireUserVerification: false to match the 'preferred' policy declared at options-generation time"
    );
  });

  await t.test("login authorize() logs verification errors instead of swallowing them silently", () => {
    const src = read("src/lib/auth.ts");
    const passkeyProviderStart = src.indexOf('id: "passkey"');
    const providerSlice = src.slice(passkeyProviderStart, passkeyProviderStart + 3000);
    assert.match(
      providerSlice,
      /catch\s*\(err\)\s*\{\s*console\.error/,
      "a verification failure must be logged server-side, not silently discarded — otherwise this class of bug is undiagnosable"
    );
  });
});
