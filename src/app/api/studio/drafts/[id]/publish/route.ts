import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publishEtsyListing } from "@/services/etsy-execution/execution-service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const userId = session.user.id;
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));
    const sellerChannelId = body.sellerChannelId;

    const result = await publishEtsyListing({
      organizationId,
      userId,
      listingDraftId: id,
      sellerChannelId,
    });

    return NextResponse.json({
      success: true,
      result,
      message: "Etsy listing published to active state successfully.",
    });
  } catch (err: any) {
    console.error("[STUDIO_PUBLISH_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to publish Etsy listing." },
      { status: 400 }
    );
  }
}
