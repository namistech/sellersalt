import type { AccountType, Capability, ConnectedShopSummary, WorkspaceContext } from "./types";
import { prisma } from "@/lib/db";

// Real-session → WorkspaceContext mapping. Deliberately a plain
// function, not a hook: (dashboard)/layout.tsx already resolves the
// real session server-side (getServerSession + isAdminEmail — see
// that file) and this just reshapes the same real values into the
// shell's typed context, with no new data fetching and no change to
// the existing auth/subscription redirect logic.

export interface RealSessionInput {
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  isAdmin: boolean;
}

export function buildRealWorkspaceContext(input: RealSessionInput): WorkspaceContext {
  const capabilities = new Set<Capability>(["discover:view"]);
  if (input.isAdmin) {
    capabilities.add("operate:view");
    capabilities.add("admin:preview");
  }

  return {
    user: {
      id: input.userId ?? "",
      name: input.userName ?? input.userEmail ?? "",
      email: input.userEmail ?? "",
      avatarUrl: input.userAvatarUrl ?? null,
    },
    organization: {
      id: input.organizationId ?? "",
      name: input.organizationName ?? "Your workspace",
      accountType: "individual",
    },
    roleLabel: input.isAdmin ? "Admin" : "Member",
    capabilities,
  };
}

/** Single source of truth for "real NextAuth session -> WorkspaceContext",
 * including the avatar DB lookup and server-authoritative plan capabilities. */
export async function resolveWorkspaceContextForUser(
  user: { id?: string | null; name?: string | null; email?: string | null; organizationId?: string | null; organizationName?: string | null },
  isAdmin: boolean
): Promise<WorkspaceContext> {
  const [avatarSetting, org] = await Promise.all([
    user.id ? prisma.appSetting.findUnique({ where: { key: `user_avatar_${user.id}` } }) : null,
    user.organizationId
      ? prisma.organization.findUnique({
          where: { id: user.organizationId },
          include: {
            package: true,
            subscription: true,
            sellerChannels: {
              where: { status: "ACTIVE" },
              select: { id: true, platform: true, label: true },
            },
          },
        })
      : null,
  ]);

  const rawKey = (org?.package?.key || org?.plan || "FREE").toUpperCase();
  const planKey = rawKey === "STARTED" ? "STARTED" : rawKey === "PRO" ? "PRO" : rawKey === "AGENCY" ? "AGENCY" : "FREE";
  const subStatus = org?.subscription?.status || "INACTIVE";
  const isSubActive = isAdmin || subStatus === "ACTIVE" || subStatus === "TRIALING";

  const capabilities = new Set<Capability>(["discover:view"]);

  let accountType: AccountType = "individual";
  if (isAdmin || planKey === "AGENCY") {
    accountType = "agency";
  }

  // Grant capabilities based on server-authoritative plan and active subscription
  if (isSubActive) {
    if (planKey === "AGENCY" || isAdmin) {
      capabilities.add("operate:view");
      capabilities.add("manage:team");
      capabilities.add("manage:billing");
      capabilities.add("manage:clients");
      capabilities.add("manage:employees");
      capabilities.add("manage:reports");
    } else if (planKey === "PRO") {
      capabilities.add("operate:view");
      capabilities.add("manage:billing");
      capabilities.add("manage:reports");
    } else if (planKey === "STARTED") {
      capabilities.add("operate:view");
      capabilities.add("manage:billing");
    }
  }

  if (isAdmin) {
    capabilities.add("operate:view");
    capabilities.add("manage:team");
    capabilities.add("manage:billing");
    capabilities.add("manage:clients");
    capabilities.add("manage:employees");
    capabilities.add("manage:reports");
    capabilities.add("view:university");
    capabilities.add("admin:preview");
  }

  const connectedShops: ConnectedShopSummary[] = (org?.sellerChannels || []).map((ch) => {
    const rawPlatform = ch.platform.toLowerCase();
    const platform: "shopify" | "woocommerce" | "etsy" =
      rawPlatform.includes("etsy") ? "etsy" : rawPlatform.includes("shopify") ? "shopify" : "woocommerce";
    const status: "connected" | "syncing" | "disconnected" | "failed" = "connected";

    return {
      id: ch.id,
      label: ch.label || `${ch.platform} Shop`,
      platform,
      status,
    };
  });

  return {
    user: {
      id: user.id ?? "",
      name: user.name ?? user.email ?? "",
      email: user.email ?? "",
      avatarUrl: avatarSetting?.value ?? null,
    },
    organization: {
      id: org?.id ?? user.organizationId ?? "",
      name: org?.name ?? user.organizationName ?? "Your workspace",
      accountType,
    },
    roleLabel: isAdmin ? "Admin" : planKey === "AGENCY" ? "Agency Owner" : planKey === "PRO" ? "Pro Seller" : "Member",
    capabilities,
    connectedShops: connectedShops.length > 0 ? connectedShops : undefined,
  };
}
