import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import axios from "axios";
import { prisma } from "./db";
import { encrypt } from "./encryption";
import { resolveEtsyShopId } from "@/seller-channels/etsy-seller";
import { getSellerChannelConnector } from "@/seller-channels/registry";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { rpID, expectedOrigin } from "./webauthn";
import { verifyChallengeToken } from "./webauthn-challenge";
import { get2FA, verify2FALoginCode } from "./two-factor";
import { getSetting } from "./app-settings";

// There's no NextAuth Account/Session adapter table in this schema (JWT
// session strategy only), so User.authMethods is the only record of which
// sign-in methods an account has ever used — appended to on every
// successful login, read by the admin Users table.
async function recordAuthMethod(userId: string, method: string, currentMethods: string[]) {
  if (currentMethods.includes(method)) return;
  await prisma.user.update({
    where: { id: userId },
    data: { authMethods: { push: method } },
  });
}

const createGoogleProvider = (typeof GoogleProvider === "function" ? GoogleProvider : (GoogleProvider as any)?.default) as typeof GoogleProvider;
const createCredentialsProvider = (typeof CredentialsProvider === "function" ? CredentialsProvider : (CredentialsProvider as any)?.default) as typeof CredentialsProvider;

function cleanEnv(val: string | null | undefined): string {
  if (!val) return "";
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const [googleId, googleSec, etsyId, etsySec] = await Promise.all([
    getSetting("google_client_id").catch(() => null),
    getSetting("google_client_secret").catch(() => null),
    getSetting("etsy_seller_client_id").catch(() => null),
    getSetting("etsy_seller_client_secret").catch(() => null),
  ]);

  const effectiveGoogleId = cleanEnv(googleId || process.env.GOOGLE_CLIENT_ID || "google-client-id-placeholder");
  const effectiveGoogleSecret = cleanEnv(googleSec || process.env.GOOGLE_CLIENT_SECRET || "google-client-secret-placeholder");
  const effectiveEtsyId = cleanEnv(etsyId || process.env.ETSY_CLIENT_ID || process.env.ETSY_KEYSTRING || "");
  const effectiveEtsySecret = cleanEnv(etsySec || process.env.ETSY_CLIENT_SECRET || process.env.ETSY_SHARED_SECRET || "");

  return {
    ...authOptions,
    providers: [
      createGoogleProvider({
        clientId: effectiveGoogleId,
        clientSecret: effectiveGoogleSecret,
        allowDangerousEmailAccountLinking: true,
      }),
      {
        id: "etsy",
        name: "Etsy",
        type: "oauth",
        version: "2.0",
        checks: ["pkce", "state"],
        authorization: {
          url: "https://www.etsy.com/oauth/connect",
          params: {
            scope: "listings_w listings_r shops_r transactions_r",
            response_type: "code",
            prompt: "consent",
          },
        },
        token: "https://api.etsy.com/v3/public/oauth/token",
        userinfo: {
          async request({ tokens, provider }: any) {
            const accessToken = tokens.access_token;
            if (!accessToken) return {};
            const userId = accessToken.split(".")[0];
            const apiKey = provider.clientId;
            try {
              const res = await axios.get(`https://openapi.etsy.com/v3/application/users/${userId}`, {
                headers: { Authorization: `Bearer ${accessToken}`, "x-api-key": apiKey },
                timeout: 10000,
              });
              return res.data;
            } catch {
              return { user_id: userId };
            }
          },
        },
        clientId: effectiveEtsyId,
        clientSecret: effectiveEtsySecret,
        profile(profile: any) {
          return {
            id: String(profile.user_id || profile.id || Date.now()),
            name: profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "Etsy Seller",
            email: profile.primary_email || profile.email || `etsy_${profile.user_id || Date.now()}@sellersalt.user`,
            image: profile.image_url_75x75 || profile.avatar_url || null,
          };
        },
      },
      ...authOptions.providers.filter((p) => p.id !== "google" && p.id !== "etsy"),
    ],
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    createGoogleProvider({
      clientId: cleanEnv(process.env.GOOGLE_CLIENT_ID || "google-client-id-placeholder"),
      clientSecret: cleanEnv(process.env.GOOGLE_CLIENT_SECRET || "google-client-secret-placeholder"),
      allowDangerousEmailAccountLinking: true,
    }),
    {
      id: "etsy",
      name: "Etsy",
      type: "oauth",
      version: "2.0",
      checks: ["pkce", "state"],
      authorization: {
        url: "https://www.etsy.com/oauth/connect",
        params: {
          scope: "listings_w listings_r shops_r transactions_r",
          response_type: "code",
          prompt: "consent",
        },
      },
      token: "https://api.etsy.com/v3/public/oauth/token",
      userinfo: {
        async request({ tokens, provider }: any) {
          const accessToken = tokens.access_token;
          if (!accessToken) return {};
          const userId = accessToken.split(".")[0];
          const apiKey = provider.clientId;
          try {
            const res = await axios.get(`https://openapi.etsy.com/v3/application/users/${userId}`, {
              headers: { Authorization: `Bearer ${accessToken}`, "x-api-key": apiKey },
              timeout: 10000,
            });
            return res.data;
          } catch {
            return { user_id: userId };
          }
        },
      },
      clientId: process.env.ETSY_CLIENT_ID || process.env.ETSY_KEYSTRING || "",
      clientSecret: process.env.ETSY_CLIENT_SECRET || process.env.ETSY_SHARED_SECRET || "",
      profile(profile: any) {
        return {
          id: String(profile.user_id || profile.id || Date.now()),
          name: profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "Etsy Seller",
          email: profile.primary_email || profile.email || `etsy_${profile.user_id || Date.now()}@sellersalt.user`,
          image: profile.image_url_75x75 || profile.avatar_url || null,
        };
      },
    },
    createCredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "2FA code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { memberships: { include: { organization: true } } },
        });
        if (!user) return null;
        if (user.suspendedAt) throw new Error("ACCOUNT_SUSPENDED");

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // NextAuth's CredentialsProvider only surfaces failures via
        // signIn()'s `error` string (thrown Error message on the
        // authorize() side, not a return value) — this is the standard
        // way to signal "need a second factor" vs. "wrong password"
        // through that constraint, letting the login page show a
        // second-step code prompt instead of just failing.
        const twoFactor = await get2FA(user.id);
        if (twoFactor?.enabled) {
          if (!credentials.code) throw new Error("2FA_REQUIRED");
          const result = await verify2FALoginCode(user.id, credentials.code);
          if (!result.ok) throw new Error("2FA_INVALID");
        }

        recordAuthMethod(user.id, "credentials", user.authMethods).catch(() => {});

        const primaryOrg = user.memberships[0]?.organization;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: primaryOrg?.id ?? null,
          organizationName: primaryOrg?.name ?? null,
        } as any;
      },
    }),
    createCredentialsProvider({
      id: "passkey",
      name: "Passkey",
      credentials: {
        response: { label: "response", type: "text" },
        challengeToken: { label: "challengeToken", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.response || !credentials?.challengeToken) return null;

        const payload = verifyChallengeToken(credentials.challengeToken);
        if (!payload) return null; // expired/tampered — no specific userId expected for login

        let response: AuthenticationResponseJSON;
        try {
          response = JSON.parse(credentials.response);
        } catch {
          return null;
        }

        const stored = await prisma.webAuthnCredential.findUnique({
          where: { credentialId: response.id },
          include: { user: { include: { memberships: { include: { organization: true } } } } },
        });
        if (!stored) return null;
        if (stored.user.suspendedAt) throw new Error("ACCOUNT_SUSPENDED");

        let verification;
        try {
          verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: payload.challenge,
            expectedOrigin: expectedOrigin(),
            expectedRPID: rpID(),
            credential: {
              id: stored.credentialId,
              publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
              counter: Number(stored.counter),
              transports: stored.transports ? (stored.transports.split(",") as any) : undefined,
            },
            // Registration options below (register/options/route.ts) and
            // login options (api/auth/passkey/options/route.ts) both
            // declare userVerification: "preferred" — the authenticator
            // is never told UV is mandatory. But @simplewebauthn/server
            // defaults requireUserVerification to true here, so any
            // authenticator that omits the UV flag on a given ceremony
            // (common — differs by browser/authenticator/context, and
            // isn't guaranteed to match what happened at registration
            // time) made this throw and login silently fail as "not
            // recognized," even for a correctly-registered passkey.
            // Bringing this in line with the "preferred" policy actually
            // declared is the fix — origin/challenge/signature checks
            // (the actual phishing-resistant guarantees) are unaffected.
            requireUserVerification: false,
          });
        } catch (err) {
          console.error("[PASSKEY_LOGIN_VERIFY_ERROR]", err);
          return null;
        }

        if (!verification.verified) return null;

        await prisma.webAuthnCredential.update({
          where: { id: stored.id },
          data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
        });

        recordAuthMethod(stored.user.id, "passkey", stored.user.authMethods).catch(() => {});

        const primaryOrg = stored.user.memberships[0]?.organization;
        return {
          id: stored.user.id,
          email: stored.user.email,
          name: stored.user.name,
          organizationId: primaryOrg?.id ?? null,
          organizationName: primaryOrg?.name ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "etsy") {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;

        let dbUser = await prisma.user.findUnique({
          where: { email },
          include: { memberships: { include: { organization: true } } },
        });

        if (!dbUser) {
          const org = await prisma.organization.create({
            data: {
              name: `${user.name || "My"} Workspace`,
              plan: "FREE",
            },
          });

          const randomPassword = crypto.randomBytes(32).toString("hex");
          const passwordHash = await bcrypt.hash(randomPassword, 10);

          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || email.split("@")[0],
              passwordHash,
              // Google/Etsy have already verified this address themselves —
              // the mandatory-verification requirement is for email/password
              // accounts, not OAuth identities.
              emailVerified: new Date(),
              authMethods: [account.provider],
              memberships: {
                create: {
                  organizationId: org.id,
                  role: "OWNER",
                },
              },
            },
            include: { memberships: { include: { organization: true } } },
          });
        } else {
          // Existing account (created via email/password, or via the other
          // OAuth provider) signing in with Google/Etsy for the first time —
          // this identity is provider-verified even if the account itself
          // never completed email/password verification, and this provider
          // wasn't necessarily recorded yet.
          const needsVerification = !dbUser.emailVerified;
          const needsAuthMethod = !dbUser.authMethods.includes(account.provider);
          if (needsVerification || needsAuthMethod) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                ...(needsVerification ? { emailVerified: new Date() } : {}),
                ...(needsAuthMethod ? { authMethods: { push: account.provider } } : {}),
              },
            });
          }
        }

        if (dbUser.suspendedAt) return false; // NextAuth treats a false return as access denied

        // Persist Google / OAuth profile picture if available
        const avatarUrl = user.image || (profile as any)?.picture || null;
        if (avatarUrl && dbUser) {
          try {
            const avatarKey = `user_avatar_${dbUser.id}`;
            const existingAvatar = await prisma.appSetting.findUnique({ where: { key: avatarKey } });
            if (!existingAvatar) {
              await prisma.appSetting.create({
                data: {
                  key: avatarKey,
                  value: avatarUrl,
                  isSecret: false,
                },
              });
            }
          } catch (e) {
            // non-fatal
          }
        }

        // Ensure user has at least one organization membership
        if (dbUser.memberships.length === 0) {
          const org = await prisma.organization.create({
            data: {
              name: `${dbUser.name || "My"} Workspace`,
              plan: "FREE",
            },
          });
          const membership = await prisma.membership.create({
            data: {
              userId: dbUser.id,
              organizationId: org.id,
              role: "OWNER",
            },
            include: { organization: true },
          });
          dbUser.memberships = [membership];
        }

        const primaryOrg = dbUser.memberships[0]?.organization;
        (user as any).id = dbUser.id;
        (user as any).organizationId = primaryOrg?.id ?? null;
        (user as any).organizationName = primaryOrg?.name ?? null;

        // If Etsy OAuth login and access token is present, auto-link the
        // seller channel — resolving the real shop and verifying the
        // token, same as the dedicated /settings/channels connect flow,
        // so the two paths never disagree about what "connected" means.
        if (account.provider === "etsy" && account.access_token && primaryOrg) {
          try {
            const apiKey = process.env.ETSY_CLIENT_ID || process.env.ETSY_KEYSTRING || "";
            const shopId = await resolveEtsyShopId(account.access_token, apiKey);
            const storeUrl = `https://www.etsy.com/shop/${shopId}`;
            const credentials = {
              accessToken: account.access_token,
              refreshToken: account.refresh_token || "",
              expiresAt: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600000,
              shopId,
              apiKey,
            };

            const connector = getSellerChannelConnector("ETSY_SELLER");
            const test = await connector.testConnection(credentials as any, storeUrl);
            if (test.ok) {
              const channel = await prisma.sellerChannel.upsert({
                where: { organizationId_storeUrl: { organizationId: primaryOrg.id, storeUrl } },
                create: {
                  organizationId: primaryOrg.id,
                  platform: "ETSY_SELLER",
                  label: `Etsy shop ${shopId}`,
                  storeUrl,
                  encryptedCredentials: encrypt(JSON.stringify(credentials)),
                  status: "ACTIVE",
                },
                update: {
                  encryptedCredentials: encrypt(JSON.stringify(credentials)),
                  status: "ACTIVE",
                  lastSyncError: null,
                },
              });
              const { startSellerChannelSync } = await import("@/lib/queue");
              await startSellerChannelSync(channel.id).catch(() => {});
            }
          } catch (err) {
            // Non-fatal — the user is still signed in even if shop-linking fails.
            // They can connect explicitly from /settings/channels afterward.
            console.error("Failed to auto-link Etsy seller channel in OAuth sign-in:", err);
          }
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = (user as any).id || token.sub;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
        token.picture = user.image || token.picture;
        // `user` is only populated right after a real sign-in (not on every
        // token refresh), so this is exactly one write per login.
        const uid = (user as any).id;
        if (uid) {
          prisma.user.update({ where: { id: uid }, data: { lastLoginAt: new Date() } }).catch(() => {});
        }
      }
      if (trigger === "update" && session?.user) {
        if (session.user.image) token.picture = session.user.image;
        if (session.user.name) token.name = session.user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).organizationName = token.organizationName;
        if (token.picture) {
          (session.user as any).image = token.picture as string;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
