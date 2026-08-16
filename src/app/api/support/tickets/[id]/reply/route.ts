import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addTicketReply } from "@/services/support-tickets";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Please log in to reply." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { message } = body;

    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return NextResponse.json({ error: "Please enter a message to reply." }, { status: 400 });
    }

    const authorName = user?.name || user?.email?.split("@")[0] || "User";
    const reply = await addTicketReply({
      ticketId: id,
      organizationId,
      authorName,
      isStaff: false,
      message,
    });

    return NextResponse.json({ success: true, reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add reply." }, { status: 500 });
  }
}
