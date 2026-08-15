import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "./db";
import { encrypt } from "./encryption";

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
      authorization: {
        url: "https://www.etsy.com/oauth/connect",
        params: {
          scope: "listings_w listings_r shops_r transactions_r",
          response_type: "code",
          code_challenge_method: "S256",
        },
      },
      token: "https://api.etsy.com/v3/public/oauth/token",
      userinfo: "https://openapi.etsy.com/v3/application/users/me",
      clientId: process.env.ETSY_CLIENT_ID || "etsy-client-id-placeholder",
      clientSecret: process.env.ETSY_CLIENT_SECRET || "",
      profile(profile: any) {
        return {
          id: String(profile.user_id || profile.id || Date.now()),
          name: profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "Etsy Seller",
          email: profile.primary_email || profile.email || `etsy_${profile.user_id || Date.now()}@sellersalt.user`,
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
          name: user.name ?? user.email,
          organizationId: primaryOrg?.id ?? null,
          organizationName: primaryOrg?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
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

        const primaryOrg = dbUser.memberships[0]?.organization;
        (user as any).id = dbUser.id;
        (user as any).organizationId = primaryOrg?.id ?? null;
        (user as any).organizationName = primaryOrg?.name ?? null;

        // If Etsy OAuth login and access token is present, auto-create/update SellerChannel
        if (account.provider === "etsy" && account.access_token && primaryOrg) {
          try {
            const credentials = {
              accessToken: account.access_token,
              refreshToken: account.refresh_token || "",
              expiresAt: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : "",
            };
            const existing = await prisma.sellerChannel.findFirst({
              where: { organizationId: primaryOrg.id, platform: "ETSY_SELLER" },
            });
            if (existing) {
              await prisma.sellerChannel.update({
                where: { id: existing.id },
                data: {
                  encryptedCredentials: encrypt(JSON.stringify(credentials)),
                  status: "ACTIVE",
                },
              });
            } else {
              await prisma.sellerChannel.create({
                data: {
                  organizationId: primaryOrg.id,
                  platform: "ETSY_SELLER",
                  label: user.name ? `${user.name}'s Etsy Shop` : "My Etsy Shop",
                  storeUrl: "https://www.etsy.com",
                  encryptedCredentials: encrypt(JSON.stringify(credentials)),
                  status: "ACTIVE",
                },
              });
            }
          } catch (err) {
            console.error("Failed to auto-link Etsy seller channel in OAuth sign-in:", err);
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as any).id || token.sub;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).organizationName = token.organizationName;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
