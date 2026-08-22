import test from "node:test";
import assert from "node:assert/strict";
import { SETTING_DEFINITIONS } from "@/lib/app-settings";
import {
  getGoogleAdsCredentials,
  isKeywordPlannerConfigured,
  testGoogleAdsConnection,
  fetchGoogleKeywordPlannerMetrics,
} from "@/services/google-keyword-planner";

test("Google Keyword Planner Integration: Setting Definitions and Storage", () => {
  const keys = SETTING_DEFINITIONS.map((d) => d.key);
  
  assert.ok(keys.includes("google_ads_developer_token"), "google_ads_developer_token must be defined");
  assert.ok(keys.includes("google_ads_client_id"), "google_ads_client_id must be defined");
  assert.ok(keys.includes("google_ads_client_secret"), "google_ads_client_secret must be defined");
  assert.ok(keys.includes("google_ads_refresh_token"), "google_ads_refresh_token must be defined");
  assert.ok(keys.includes("google_ads_login_customer_id"), "google_ads_login_customer_id must be defined");
  assert.ok(keys.includes("google_ads_customer_id"), "google_ads_customer_id must be defined");

  const devTokenDef = SETTING_DEFINITIONS.find((d) => d.key === "google_ads_developer_token");
  assert.equal(devTokenDef?.isSecret, true, "developer token must be encrypted at rest");

  const clientSecretDef = SETTING_DEFINITIONS.find((d) => d.key === "google_ads_client_secret");
  assert.equal(clientSecretDef?.isSecret, true, "client secret must be encrypted at rest");

  const refreshTokenDef = SETTING_DEFINITIONS.find((d) => d.key === "google_ads_refresh_token");
  assert.equal(refreshTokenDef?.isSecret, true, "refresh token must be encrypted at rest");
});

test("Google Keyword Planner Integration: Unconfigured Credentials Degrade Honestly", async () => {
  // When credentials are not provided or placeholder
  const result = await fetchGoogleKeywordPlannerMetrics(["digital planner", "stickers"]);
  
  assert.equal(result.available, false, "Should return available: false when unconfigured");
  assert.equal(result.reason, "REQUIRES_CREDENTIALS", "Reason should be REQUIRES_CREDENTIALS");
  assert.deepEqual(result.metrics, {}, "Metrics map should be empty without synthetic fallback");

  const testConn = await testGoogleAdsConnection();
  assert.equal(testConn.ok, false, "Connection test should report false when unconfigured");
  assert.ok(testConn.message.includes("not fully configured"), "Message should guide admin to configure credentials");
});
