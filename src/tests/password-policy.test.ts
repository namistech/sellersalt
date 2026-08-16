import test from "node:test";
import assert from "node:assert";
import { checkPasswordStrength } from "../lib/password-policy";

test("Password Policy: Strong Signup Password Validation", async (t) => {
  await t.test("accepts a genuinely strong password", () => {
    const result = checkPasswordStrength("Tr0ub4dor&3!");
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  await t.test("rejects a password under the minimum length", () => {
    const result = checkPasswordStrength("Ab1!");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("8 characters")));
  });

  await t.test("rejects a password missing an uppercase letter", () => {
    const result = checkPasswordStrength("lowercase1!");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("uppercase")));
  });

  await t.test("rejects a password missing a lowercase letter", () => {
    const result = checkPasswordStrength("UPPERCASE1!");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("lowercase")));
  });

  await t.test("rejects a password missing a number", () => {
    const result = checkPasswordStrength("NoNumbers!");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("number")));
  });

  await t.test("rejects a password missing a special character", () => {
    const result = checkPasswordStrength("NoSpecial123");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("special character")));
  });

  await t.test("rejects an obviously common password even if it technically meets other rules", () => {
    const result = checkPasswordStrength("Password1!");
    // Satisfies length/upper/lower/number/special on its own, but
    // "password1!" collides with the common-password blocklist
    // case-insensitively — character-class rules alone aren't enough.
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.toLowerCase().includes("commonly used")));
    assert.strictEqual(result.errors.length, 1, "should fail only the common-password rule, nothing else");
  });

  await t.test("reports every unmet rule at once, not just the first", () => {
    const result = checkPasswordStrength("weak");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length >= 3);
  });

  await t.test("handles an empty/undefined password without throwing", () => {
    const result = checkPasswordStrength("");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});
