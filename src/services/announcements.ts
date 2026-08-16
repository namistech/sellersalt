// System Announcements & Notification Center Service

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

// User dismissal store: userId -> Set of announcementIds
const DISMISSED_STORE: Map<string, Set<string>> = new Map();

export async function getActiveAnnouncements(userId?: string): Promise<{
  banner: AnnouncementItem | null;
  notifications: AnnouncementItem[];
}> {
  const userDismissed = userId ? DISMISSED_STORE.get(userId) || new Set() : new Set();
  const now = Date.now();

  const active = ANNOUNCEMENTS_STORE.filter((a) => {
    if (!a.isActive) return false;
    if (a.expiresAt && new Date(a.expiresAt).getTime() < now) return false;
    return true;
  });

  const banner =
    active.find(
      (a) =>
        (a.placement === "BANNER" || a.placement === "BOTH") &&
        a.priority === "URGENT" &&
        !userDismissed.has(a.id)
    ) || null;

  const notifications = active
    .filter((a) => a.placement === "NOTIFICATIONS" || a.placement === "BOTH")
    .map((a) => ({
      ...a,
      isDismissed: userDismissed.has(a.id),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { banner, notifications };
}

export async function dismissAnnouncement(announcementId: string, userId: string): Promise<void> {
  if (!DISMISSED_STORE.has(userId)) {
    DISMISSED_STORE.set(userId, new Set());
  }
  DISMISSED_STORE.get(userId)!.add(announcementId);
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
