// System Announcements & Notification Center Service
//
// Announcement *content* is a small in-code list (no admin authoring UI
// persists new ones across a restart yet — adminCreateAnnouncement mutates
// this in-memory array, same as before). Read/dismissed *state* is real:
// persisted per-user in the `AnnouncementRead` table so it survives
// restarts/redeploys and is correctly isolated per user, instead of the
// previous in-memory Map that reset on every deploy.

import { prisma } from "@/lib/db";

export type AnnouncementPriority = "URGENT" | "NORMAL";
export type AnnouncementPlacement = "BANNER" | "NOTIFICATIONS" | "BOTH";

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  placement: AnnouncementPlacement;
  linkUrl?: string | null;
  linkText?: string | null;
  isActive: boolean;
  isDismissed?: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

let ANNOUNCEMENTS_STORE: AnnouncementItem[] = [
  {
    id: "ann-welcome",
    title: "Welcome to SellerSalt Intelligence v1.8",
    message: "Explore our upgraded competitor surveillance engine and new keyword discovery tools.",
    priority: "NORMAL",
    placement: "NOTIFICATIONS",
    linkUrl: "/whats-new",
    linkText: "View Changelog",
    isActive: true,
    createdAt: "2026-08-16T12:00:00.000Z",
  },
];

export async function getActiveAnnouncements(userId?: string): Promise<{
  banner: AnnouncementItem | null;
  notifications: AnnouncementItem[];
}> {
  const now = Date.now();

  const active = ANNOUNCEMENTS_STORE.filter((a) => {
    if (!a.isActive) return false;
    if (a.expiresAt && new Date(a.expiresAt).getTime() < now) return false;
    return true;
  });

  const reads = userId
    ? await prisma.announcementRead.findMany({
        where: { userId, announcementId: { in: active.map((a) => a.id) } },
        select: { announcementId: true },
      })
    : [];
  const readIds = new Set(reads.map((r: { announcementId: string }) => r.announcementId));

  const banner =
    active.find(
      (a) => (a.placement === "BANNER" || a.placement === "BOTH") && a.priority === "URGENT" && !readIds.has(a.id)
    ) || null;

  const notifications = active
    .filter((a) => a.placement === "NOTIFICATIONS" || a.placement === "BOTH")
    .map((a) => ({
      ...a,
      isDismissed: readIds.has(a.id),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { banner, notifications };
}

export async function markAnnouncementRead(announcementId: string, userId: string): Promise<void> {
  await prisma.announcementRead.upsert({
    where: { userId_announcementId: { userId, announcementId } },
    create: { userId, announcementId },
    update: {},
  });
}

// Backward-compatible alias — "dismiss" and "mark read" are the same
// underlying action for this announcement-backed notification center.
export const dismissAnnouncement = markAnnouncementRead;

export async function markAllAnnouncementsRead(userId: string): Promise<void> {
  const now = Date.now();
  const activeIds = ANNOUNCEMENTS_STORE.filter((a) => {
    if (!a.isActive) return false;
    if (a.expiresAt && new Date(a.expiresAt).getTime() < now) return false;
    return true;
  }).map((a) => a.id);

  if (activeIds.length === 0) return;

  await prisma.$transaction(
    activeIds.map((announcementId) =>
      prisma.announcementRead.upsert({
        where: { userId_announcementId: { userId, announcementId } },
        create: { userId, announcementId },
        update: {},
      })
    )
  );
}

export async function adminCreateAnnouncement(params: {
  title: string;
  message: string;
  priority: AnnouncementPriority;
  placement: AnnouncementPlacement;
  linkUrl?: string;
  linkText?: string;
  expiresAt?: string;
}): Promise<AnnouncementItem> {
  const newItem: AnnouncementItem = {
    id: `ann-${Date.now()}`,
    title: params.title.trim(),
    message: params.message.trim(),
    priority: params.priority,
    placement: params.placement,
    linkUrl: params.linkUrl || null,
    linkText: params.linkText || null,
    isActive: true,
    expiresAt: params.expiresAt || null,
    createdAt: new Date().toISOString(),
  };

  ANNOUNCEMENTS_STORE.unshift(newItem);
  return newItem;
}
