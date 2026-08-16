import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { toggleFeatureUpvote } from "@/services/feature-requests";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;
    if (!organizationId) {
      return NextResponse.json({ error: "Please sign in to vote." }, { status: 401 });
    }

    const { id } = await params;
    const result = await toggleFeatureUpvote(id, organizationId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to vote." }, { status: 500 });
  }
}
