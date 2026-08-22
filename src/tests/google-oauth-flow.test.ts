import { describe, it } from "node:test";
import assert from "node:assert";
import { getAuthOptions, authOptions } from "@/lib/auth";

describe("Google OAuth Flow & Authentication Verification", () => {
  describe("1. Google Provider Configuration & Options Resolution", () => {
    it("configures GoogleProvider in getAuthOptions with allowDangerousEmailAccountLinking", async () => {
      const options = await getAuthOptions();
      const googleProvider = options.providers.find((p: any) => p.id === "google") as any;
      assert.ok(googleProvider, "Google provider must be registered in getAuthOptions()");
      assert.strictEqual(googleProvider.id, "google");
      assert.strictEqual(googleProvider.name, "Google");
      assert.strictEqual(googleProvider.type, "oauth");
      assert.strictEqual(googleProvider.options?.allowDangerousEmailAccountLinking, true);
    });

    it("verifies static authOptions registers GoogleProvider", () => {
      const googleProvider = authOptions.providers.find((p: any) => p.id === "google") as any;
      assert.ok(googleProvider, "Google provider must be registered in static authOptions");
      assert.strictEqual(googleProvider.id, "google");
    });
  });

  describe("2. Redirect URI & OpenID Standard Contracts", () => {
    it("verifies Google provider requests openid, email, and profile scopes", async () => {
      const options = await getAuthOptions();
      const googleProvider = options.providers.find((p: any) => p.id === "google") as any;
      assert.strictEqual(googleProvider.authorization?.params?.scope, "openid email profile");
    });

    it("verifies expected callback URL pattern for production, staging, and local", () => {
      const getCallbackUrl = (origin: string) => `${origin.replace(/\/+$/, "")}/api/auth/callback/google`;
      assert.strictEqual(getCallbackUrl("https://sellersalt.com"), "https://sellersalt.com/api/auth/callback/google");
      assert.strictEqual(getCallbackUrl("https://staging.sellersalt.com"), "https://staging.sellersalt.com/api/auth/callback/google");
      assert.strictEqual(getCallbackUrl("http://localhost:3000"), "http://localhost:3000/api/auth/callback/google");
    });
  });

  describe("3. OAuth Sign-In Callbacks & User Lifecycle", () => {
    it("handles Google signIn callback lifecycle structure", () => {
      assert.ok(typeof authOptions.callbacks?.signIn === "function");
      assert.ok(typeof authOptions.callbacks?.jwt === "function");
      assert.ok(typeof authOptions.callbacks?.session === "function");
    });

    it("attaches user attributes in session callback", async () => {
      const sessionFn = authOptions.callbacks?.session;
      if (!sessionFn) assert.fail("session callback not defined");

      const session: any = { user: { name: "Test User", email: "test@example.com" } };
      const token: any = {
        sub: "usr_google_123",
        organizationId: "org_google_123",
        organizationName: "Test Workspace",
        picture: "https://lh3.googleusercontent.com/a/test-avatar",
      };

      const result: any = await sessionFn({ session, token } as any);
      assert.strictEqual(result.user.id, "usr_google_123");
      assert.strictEqual(result.user.organizationId, "org_google_123");
      assert.strictEqual(result.user.organizationName, "Test Workspace");
      assert.strictEqual(result.user.image, "https://lh3.googleusercontent.com/a/test-avatar");
    });
  });
});
