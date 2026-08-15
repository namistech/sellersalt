import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "./db";
import { encrypt } from "./encryption";
import { resolveEtsyShopId } from "@/seller-channels/etsy-seller";
import { getSellerChannelConnector } from "@/seller-channels/registry";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "google-client-id-placeholder",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "google-client-secret-placeholder",
      allowDangerousEmailAccountLinking: true,
    }),
    {
      id: "etsy",
      name: "Etsy",
      type: "oauth",
      version: "2.0",
      // Etsy's Open API v3 mandates PKCE on every authorization-code grant,
      // confidential or not. Without checks: ["pkce"], NextAuth never
      // generates/attaches a code_verifier, so the code_challenge_method
      // param below was previously sent with no matching code_challenge —
      // a malformed request Etsy could legitimately reject.
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
      userinfo: "https://openapi.etsy.com/v3/application/users/me",
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
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { memberships: { include: { organization: true } } },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

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
              memberships: {
                create: {
                  organizationId: org.id,
                  role: "OWNER",
                },
              },
            },
            include: { memberships: { include: { organization: true } } },
          });
        }

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
