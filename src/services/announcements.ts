// System Announcements & Notification Center Service
//
// Announcement *content* and read/dismissed state are durably persisted in Postgres:
// - `Announcement` model stores broadcast messages with placement & audience targeting
// - `AnnouncementRead` records per-user read/dismiss state across restarts & replicas.

import { prisma } from "@/lib/db";

export type AnnouncementPriority = "URGENT" | "NORMAL" | "INFO";
export type AnnouncementPlacement =
  | "BANNER"
  | "NOTIFICATIONS"
  | "BOTH"
  | "TOP_BANNER"
  | "DASHBOARD_BANNER"
  | "CHECKOUT_BANNER"
  | "PRICING_BANNER"
  | "MODAL"
  | "NOTIFICATIONS_PANEL";

export type AnnouncementAudience = "ALL" | "LOGGED_IN" | "LOGGED_OUT" | "FREE_ONLY" | "PAID_ONLY";

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  placement: string;
  audience?: string;
  linkUrl?: string | null;
  linkText?: string | null;
  isActive: boolean;
  isDismissed?: boolean;
  isClosable?: boolean;
  isPermanent?: boolean;
  displayFrequency?: string;
  maxImpressions?: number | null;
  startDate?: string;
  expiresAt?: string | null;
  createdAt: string;
}

const DEFAULT_WELCOME_ANNOUNCEMENT: AnnouncementItem = {
  id: "ann-welcome",
  title: "Welcome to SellerSalt Intelligence v1.8",
  message: "Explore our upgraded market research engine and new keyword discovery tools.",
  priority: "NORMAL",
  placement: "NOTIFICATIONS",
  audience: "ALL",
  linkUrl: "/whats-new",
  linkText: "View Changelog",
  isActive: true,
  createdAt: "2026-08-16T12:00:00.000Z",
};

export async function getActiveAnnouncements(
  userId?: string,
  options?: { placement?: string; audience?: string }
): Promise<{
  banner: AnnouncementItem | null;
  notifications: AnnouncementItem[];
  all: AnnouncementItem[];
}> {
  const now = new Date();

  // Load active announcements from database
  let dbAnnouncements: any[] = [];
  try {
    dbAnnouncements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    // If DB is initializing or empty
    dbAnnouncements = [];
  }

  const items: AnnouncementItem[] = dbAnnouncements.length > 0
    ? dbAnnouncements.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        priority: (a.priority as AnnouncementPriority) || "NORMAL",
        placement: a.placement,
        audience: a.audience,
        linkUrl: a.ctaUrl,
        linkText: a.ctaText,
        isActive: a.isActive,
        isClosable: a.isClosable,
        isPermanent: a.isPermanent,
        displayFrequency: a.displayFrequency,
        maxImpressions: a.maxImpressions,
        startDate: a.startDate.toISOString(),
        expiresAt: a.endDate ? a.endDate.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
      }))
    : [DEFAULT_WELCOME_ANNOUNCEMENT];

  const reads = userId
    ? await prisma.announcementRead.findMany({
        where: { userId, announcementId: { in: items.map((a) => a.id) } },
        select: { announcementId: true },
      }).catch(() => [])
    : [];
  const readIds = new Set(reads.map((r: { announcementId: string }) => r.announcementId));

  // Determine top banner
  const banner =
    items.find(
      (a) =>
        (a.placement === "TOP_BANNER" || a.placement === "BANNER" || a.placement === "BOTH") &&
        (a.isPermanent || !readIds.has(a.id))
    ) || null;

  // Determine notifications list
  const notifications = items
    .filter(
      (a) =>
        a.placement === "NOTIFICATIONS" ||
        a.placement === "NOTIFICATIONS_PANEL" ||
        a.placement === "BOTH" ||
        a.placement === "DASHBOARD_BANNER"
    )
    .map((a) => ({
      ...a,
      isDismissed: readIds.has(a.id),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { banner, notifications, all: items };
}

export async function markAnnouncementRead(announcementId: string, userId: string): Promise<void> {
  await prisma.announcementRead.upsert({
    where: { userId_announcementId: { userId, announcementId } },
    create: { userId, announcementId },
    update: {},
  }).catch(() => {});
}

export const dismissAnnouncement = markAnnouncementRead;

export async function markAllAnnouncementsRead(userId: string): Promise<void> {
  const active = await prisma.announcement.findMany({
    where: { isActive: true },
    select: { id: true },
  }).catch(() => []);

  if (active.length === 0) return;

  await prisma.announcementRead.createMany({
    data: active.map((a) => ({ userId, announcementId: a.id })),
    skipDuplicates: true,
  }).catch(() => {});
}

export async function adminCreateAnnouncement(params: {
  title: string;
  message: string;
  priority?: AnnouncementPriority;
  placement?: string;
  audience?: string;
  linkUrl?: string;
  linkText?: string;
  isClosable?: boolean;
  isPermanent?: boolean;
  displayFrequency?: string;
  maxImpressions?: number;
  startDate?: Date;
  expiresAt?: string | Date | null;
}): Promise<AnnouncementItem> {
  const created = await prisma.announcement.create({
    data: {
      title: params.title.trim(),
      message: params.message.trim(),
      priority: params.priority || "NORMAL",
      placement: params.placement || "TOP_BANNER",
      audience: params.audience || "ALL",
      ctaUrl: params.linkUrl || null,
      ctaText: params.linkText || null,
      isClosable: params.isClosable !== false,
      isPermanent: Boolean(params.isPermanent),
      displayFrequency: params.displayFrequency || "ONCE",
      maxImpressions: params.maxImpressions ?? 3,
      startDate: params.startDate || new Date(),
      endDate: params.expiresAt ? new Date(params.expiresAt) : null,
      isActive: true,
    },
  });

  return {
    id: created.id,
    title: created.title,
    message: created.message,
    priority: created.priority as AnnouncementPriority,
    placement: created.placement,
    audience: created.audience,
    linkUrl: created.ctaUrl,
    linkText: created.ctaText,
    isActive: created.isActive,
    isClosable: created.isClosable,
    isPermanent: created.isPermanent,
    displayFrequency: created.displayFrequency,
    maxImpressions: created.maxImpressions,
    startDate: created.startDate.toISOString(),
    expiresAt: created.endDate ? created.endDate.toISOString() : null,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function adminDeleteAnnouncement(id: string): Promise<boolean> {
  try {
    await prisma.announcement.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
