import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { parseEtsyListingInput } from "../lib/etsy-listing-parser";
import {
  getActiveAnnouncements,
  dismissAnnouncement,
  markAllAnnouncementsRead,
  adminCreateAnnouncement,
} from "../services/announcements";
import { buildNavigation } from "../services/navigation";
import type { WorkspaceContext } from "../services/types";
import { prisma } from "../lib/db";

describe("Batch 9: SEO Listing Parser & Type Boundary (Item 10)", () => {
  it("parses valid numeric listing ID string", () => {
    const res = parseEtsyListingInput("1729482012");
    assert.equal(res.listingId, 1729482012);
    assert.equal(res.isShopUrl, false);
    assert.equal(res.error, undefined);
  });

  it("parses numeric listing ID number", () => {
    const res = parseEtsyListingInput(1729482012);
    assert.equal(res.listingId, 1729482012);
    assert.equal(res.isShopUrl, false);
    assert.equal(res.error, undefined);
  });

  it("extracts listing ID from full Etsy listing URL", () => {
    const url = "https://www.etsy.com/listing/1729482012/personalized-leather-wallet-custom";
    const res = parseEtsyListingInput(url);
    assert.equal(res.listingId, 1729482012);
    assert.equal(res.isShopUrl, false);
  });

  it("extracts listing ID from short /listing/ URL with query params", () => {
    const url = "/listing/987654321?ref=shop_home_active_1";
    const res = parseEtsyListingInput(url);
    assert.equal(res.listingId, 987654321);
    assert.equal(res.isShopUrl, false);
  });

  it("detects shop URL and returns clear validation error rather than passing shop URL to listing endpoint", () => {
    const shopUrl = "https://www.etsy.com/shop/LayerSculpt3D";
    const res = parseEtsyListingInput(shopUrl);
    assert.equal(res.listingId, null);
    assert.equal(res.isShopUrl, true);
    assert.equal(res.shopName, "LayerSculpt3D");
    assert.ok(res.error?.includes("is an Etsy shop URL"));
  });

  it("detects subdomain shop URL (LayerSculpt3D.etsy.com)", () => {
    const shopUrl = "LayerSculpt3D.etsy.com";
    const res = parseEtsyListingInput(shopUrl);
    assert.equal(res.listingId, null);
    assert.equal(res.isShopUrl, true);
    assert.equal(res.shopName, "LayerSculpt3D");
  });

  it("handles empty or invalid inputs cleanly", () => {
    const res = parseEtsyListingInput("");
    assert.equal(res.listingId, null);
    assert.ok(res.error);
  });
});

describe("Batch 9: System Announcements & Notification Center (Items 14 & 15)", () => {
  // Announcement read/dismiss state is persisted per-user against a real
  // `AnnouncementRead.userId` foreign key, so these tests need real `User`
  // rows rather than arbitrary ID strings.
  let userA: { id: string };
  let userB: { id: string };

  before(async () => {
    const suffix = Date.now();
    userA = await prisma.user.create({
      data: { email: `test-announcements-a-${suffix}@sellersalt.test`, passwordHash: "test-hash" },
    });
    userB = await prisma.user.create({
      data: { email: `test-announcements-b-${suffix}@sellersalt.test`, passwordHash: "test-hash" },
    });
  });

  after(async () => {
    // Cascades to each user's AnnouncementRead rows.
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  });

  it("creates and retrieves active announcements", async () => {
    const created = await adminCreateAnnouncement({
      title: "Test Urgent Announcement",
      message: "Scheduled maintenance in 2 hours.",
      priority: "URGENT",
      placement: "BOTH",
    });

    assert.ok(created.id);
    const { banner, notifications } = await getActiveAnnouncements(userA.id);
    assert.ok(banner);
    assert.equal(banner?.title, "Test Urgent Announcement");
    assert.ok(notifications.some((n) => n.id === created.id));
  });

  it("supports user dismissal of urgent banner", async () => {
    const created = await adminCreateAnnouncement({
      title: "Dismissible Notice",
      message: "This notice can be dismissed.",
      priority: "URGENT",
      placement: "BANNER",
    });

    await dismissAnnouncement(created.id, userA.id);
    const { banner } = await getActiveAnnouncements(userA.id);
    assert.notEqual(banner?.id, created.id);
  });

  it("read state is isolated per user — marking read for one user never affects another", async () => {
    const created = await adminCreateAnnouncement({
      title: "Isolation Check Notice",
      message: "Only the acting user should see this as read.",
      priority: "NORMAL",
      placement: "NOTIFICATIONS",
    });

    await dismissAnnouncement(created.id, userA.id);

    const { notifications: aNotifications } = await getActiveAnnouncements(userA.id);
    const { notifications: bNotifications } = await getActiveAnnouncements(userB.id);

    assert.equal(aNotifications.find((n) => n.id === created.id)?.isDismissed, true);
    assert.equal(bNotifications.find((n) => n.id === created.id)?.isDismissed, false);
  });

  it("mark-all-read clears every active notification for the acting user only", async () => {
    await adminCreateAnnouncement({
      title: "Mark-All Notice 1",
      message: "First of two.",
      priority: "NORMAL",
      placement: "NOTIFICATIONS",
    });
    await adminCreateAnnouncement({
      title: "Mark-All Notice 2",
      message: "Second of two.",
      priority: "NORMAL",
      placement: "NOTIFICATIONS",
    });

    await markAllAnnouncementsRead(userA.id);

    const { notifications: aNotifications } = await getActiveAnnouncements(userA.id);
    const { notifications: bNotifications } = await getActiveAnnouncements(userB.id);

    assert.ok(aNotifications.every((n) => n.isDismissed));
    assert.ok(bNotifications.some((n) => !n.isDismissed));
  });
});

describe("Batch 9: SellerSalt University Navigation Gating (Item 13)", () => {
  const baseContext: WorkspaceContext = {
    user: { id: "u1", name: "Alice", email: "alice@example.com" },
    organization: { id: "org1", name: "Alice's Studio", accountType: "individual" },
    roleLabel: "Owner",
    capabilities: new Set(["discover:view", "operate:view", "manage:billing"]),
  };

  it("hides SellerSalt University by default for standard customer workspace", () => {
    const groups = buildNavigation(baseContext);
    const discoverGroup = groups.find((g) => g.id === "discover");
    const universityItem = discoverGroup?.items.find((i) => i.id === "university");
    assert.equal(universityItem, undefined, "SellerSalt University should be hidden by default for customers");
  });

  it("shows SellerSalt University when view:university capability is present", () => {
    const elevatedContext: WorkspaceContext = {
      ...baseContext,
      capabilities: new Set([...baseContext.capabilities, "view:university"]),
    };
    const groups = buildNavigation(elevatedContext);
    const discoverGroup = groups.find((g) => g.id === "discover");
    const universityItem = discoverGroup?.items.find((i) => i.id === "university");
    assert.ok(universityItem, "SellerSalt University should be visible when view:university capability is granted");
    assert.equal(universityItem?.href, "/university");
  });
});
