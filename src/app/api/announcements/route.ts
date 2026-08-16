import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getActiveAnnouncements,
  dismissAnnouncement,
  adminCreateAnnouncement,
  type AnnouncementPriority,
  type AnnouncementPlacement,
} from "@/services/announcements";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    const announcements = await getActiveAnnouncements(userId);
    return NextResponse.json({ success: true, ...announcements });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load announcements." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, announcementId, title, message, priority, placement, linkUrl, linkText, expiresAt } = body;

    // 1. User dismissal action
    if (action === "dismiss" && announcementId) {
      await dismissAnnouncement(announcementId, userId);
      return NextResponse.json({ success: true });
    }

    // 2. Admin creation action
    const isAdmin = user?.role === "ADMIN" || user?.isAdmin === true;
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
    }

    const item = await adminCreateAnnouncement({
      title,
      message,
      priority: (priority as AnnouncementPriority) || "NORMAL",
      placement: (placement as AnnouncementPlacement) || "NOTIFICATIONS",
      linkUrl,
      linkText,
      expiresAt,
    });

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process announcement request." }, { status: 500 });
  }
}
