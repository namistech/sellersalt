"use client";

import { useMemo, useState } from "react";
import { Drawer, Tabs, Text, Caption, Badge } from "@/components/ui";
import { Freshness } from "@/components/data";
import { AlertCard } from "@/components/intelligence";
import type { NotificationCategory, NotificationItem } from "@/services/types";

// design-system-v1.md §20 — Notification and Alert are the two types
// that live in this Center; Insight/Recommendation do not duplicate
// here, they stay contextual (see docs/architecture/ai.md,
// docs/design/information-architecture-v1.md "Notifications IA"). Per
// this task's explicit instruction, there is no separate top-level
// "Alerts" nav item — this Drawer is the only entry point.
//
// category "intelligence"/"shop" items with a `severity` render through
// intelligence/AlertCard (Task 3) exactly as they would inline on a
// Connected Shop page — one shared component, not a second
// notification-specific alert visual.

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  system: "System",
  intelligence: "Intelligence",
  shop: "Shop",
  optimization: "Optimization",
  billing: "Billing",
  security: "Security",
};

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-line-subtle bg-surface px-4 py-3">
      {!item.read && <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
      <div className={item.read ? "ml-[18px] min-w-0 flex-1" : "min-w-0 flex-1"}>
        <div className="flex items-center gap-2">
          <Text as="span" size="body-sm" weight={item.read ? "regular" : "medium"}>
            {item.title}
          </Text>
          <Badge variant="neutral">{CATEGORY_LABEL[item.category]}</Badge>
          {item.important && <Badge variant="gold">Important</Badge>}
        </div>
        {item.description && (
          <Text size="body-sm" color="secondary" className="mt-0.5">
            {item.description}
          </Text>
        )}
        <Freshness state="recent" timestamp={item.timestamp} className="mt-1" />
      </div>
    </div>
  );
}

export interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
}

export function NotificationCenter({ open, onClose, notifications }: NotificationCenterProps) {
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    if (tab === "unread") return notifications.filter((n) => !n.read);
    if (tab === "important") return notifications.filter((n) => n.important);
    return notifications;
  }, [tab, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Drawer open={open} onClose={onClose} side="right" title="Notifications" description={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}>
      <Tabs value={tab} onChange={setTab}>
        <Tabs.List aria-label="Filter notifications">
          <Tabs.Trigger value="all">All</Tabs.Trigger>
          <Tabs.Trigger value="unread">Unread</Tabs.Trigger>
          <Tabs.Trigger value="important">Important</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Panel value={tab}>
          {filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Text size="body-sm" color="tertiary">
                Nothing here.
              </Text>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((item) =>
                item.severity ? (
                  <AlertCard
                    key={item.id}
                    title={item.title}
                    description={item.description}
                    severity={item.severity}
                    freshness={{ state: "recent", timestamp: item.timestamp }}
                  />
                ) : (
                  <NotificationRow key={item.id} item={item} />
                )
              )}
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
    </Drawer>
  );
}
