import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getSupportTickets,
  createSupportTicket,
  type TicketCategory,
  type TicketPriority,
} from "@/services/support-tickets";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;
    if (!organizationId) {
      return NextResponse.json({ error: "Please log in to view support tickets." }, { status: 401 });
    }

    const tickets = await getSupportTickets(organizationId);
    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load support tickets." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Please log in to submit a support ticket." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { subject, message, category, priority } = body;

    if (!subject || typeof subject !== "string" || subject.trim().length < 4) {
      return NextResponse.json({ error: "Please provide a clear ticket subject." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json({ error: "Please describe your question or issue in detail." }, { status: 400 });
    }

    const authorName = user?.name || user?.email?.split("@")[0] || "SellerSalt User";
    const ticket = await createSupportTicket({
      organizationId,
      userId: user?.id || "unknown",
      authorName,
      subject,
      message,
      category: (category as TicketCategory) || "GENERAL",
      priority: (priority as TicketPriority) || "NORMAL",
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create support ticket." }, { status: 500 });
  }
}
