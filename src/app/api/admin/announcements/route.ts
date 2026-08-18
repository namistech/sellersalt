import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";
import { adminCreateAnnouncement, adminDeleteAnnouncement } from "@/services/announcements";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isAdmin = isAdminEmail(user?.email) || user?.role === "ADMIN" || user?.isAdmin === true;
  return { isAdmin, user };
}

export async function GET() {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { reads: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        priority: a.priority,
        placement: a.placement,
        audience: a.audience,
        ctaText: a.ctaText,
        ctaUrl: a.ctaUrl,
        isActive: a.isActive,
        isClosable: a.isClosable,
        isPermanent: a.isPermanent,
        displayFrequency: a.displayFrequency,
        maxImpressions: a.maxImpressions,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate ? a.endDate.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
        readsCount: a._count.reads,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch announcements." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      title,
      message,
      priority,
      placement,
      audience,
      ctaText,
      ctaUrl,
      isClosable,
      isPermanent,
      displayFrequency,
      maxImpressions,
      startDate,
      endDate,
    } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
    }

    const item = await adminCreateAnnouncement({
      title,
      message,
      priority,
      placement,
      audience,
      linkText: ctaText,
      linkUrl: ctaUrl,
      isClosable,
      isPermanent,
      displayFrequency,
      maxImpressions: maxImpressions ? Number(maxImpressions) : 3,
      startDate: startDate ? new Date(startDate) : new Date(),
      expiresAt: endDate ? new Date(endDate) : null,
    });

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create announcement." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, isActive, title, message, priority, placement, audience, ctaText, ctaUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "Announcement ID is required." }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (title) updateData.title = title;
    if (message) updateData.message = message;
    if (priority) updateData.priority = priority;
    if (placement) updateData.placement = placement;
    if (audience) updateData.audience = audience;
    if (ctaText !== undefined) updateData.ctaText = ctaText;
    if (ctaUrl !== undefined) updateData.ctaUrl = ctaUrl;

    const updated = await prisma.announcement.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, announcement: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update announcement." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Announcement ID is required." }, { status: 400 });
    }

    await adminDeleteAnnouncement(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete announcement." }, { status: 500 });
  }
}
