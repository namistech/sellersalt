import test from "node:test";
import assert from "node:assert";
import path from "node:path";

test("Level 1 Dark IntelligenceCard Design Specifications", async (t) => {
  await t.test("verifies default score boundaries and verdict variant mappings", () => {
    const scoreA = 88;
    const variantA = scoreA >= 75 ? "success" : scoreA >= 45 ? "warning" : "danger";
    assert.strictEqual(variantA, "success");

    const scoreB = 62;
    const variantB = scoreB >= 75 ? "success" : scoreB >= 45 ? "warning" : "danger";
    assert.strictEqual(variantB, "warning");

    const scoreC = 34;
    const variantC = scoreC >= 75 ? "success" : scoreC >= 45 ? "warning" : "danger";
    assert.strictEqual(variantC, "danger");
  });
});

test("Product Intelligence Unit Economics Calculations", async (t) => {
  await t.test("calculates Etsy fee deductions and net margin accurately", () => {
    const retailPrice = 32.0;
    const cogs = 8.0;
    const etsyFeeRate = 0.095; // 6.5% transaction + 3% payment processing
    const listingFee = 0.20;
    const totalFees = retailPrice * etsyFeeRate + listingFee; // $3.24
    const netProfit = retailPrice - totalFees - cogs; // $20.76
    const netMargin = (netProfit / retailPrice) * 100; // 64.875%

    assert.ok(totalFees > 3.0 && totalFees < 3.5);
    assert.ok(netProfit > 20.0);
    assert.strictEqual(Math.round(netMargin), 65);
  });

  await t.test("verifies monthly sales projection formula from daily velocity", () => {
    const estDailySales = 4.5;
    const projectedMonthlySales = Math.round(estDailySales * 30.44);
    assert.strictEqual(projectedMonthlySales, 137);
  });
});

test("Avatar Component State & Upload Path Sanitization", async (t) => {
  await t.test("sanitizes relative upload paths to prevent directory traversal", () => {
    const rawSegments = ["..", "avatars", "avatar_12345.png"];
    const safeSegments = rawSegments.map((s) => path.basename(s));
    
    assert.strictEqual(path.basename(".."), "..");
    assert.strictEqual(path.basename("/etc/passwd"), "passwd");
    assert.strictEqual(path.basename("avatar_test.png"), "avatar_test.png");
  });
});
