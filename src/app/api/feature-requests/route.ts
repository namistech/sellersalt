import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getFeatureRequests,
  createFeatureRequest,
  findSimilarFeatures,
  type FeatureCategory,
} from "@/services/feature-requests";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;
    const items = await getFeatureRequests(organizationId);
    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load roadmap." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Please sign in to submit a feature request." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, description, category, checkOnly } = body;

    if (!title || typeof title !== "string" || title.trim().length < 5) {
      return NextResponse.json({ error: "Please enter a descriptive feature title." }, { status: 400 });
    }

    // Similarity check request
    if (checkOnly) {
      const similar = findSimilarFeatures(title.trim());
      return NextResponse.json({ success: true, similar });
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Please provide a brief description of the requested feature." }, { status: 400 });
    }

    const authorName = user?.name || user?.email?.split("@")[0] || "SellerSalt User";
    const result = await createFeatureRequest({
      title: title.trim(),
      description: description.trim(),
      category: (category as FeatureCategory) || "SURVEILLANCE",
      authorName,
      authorOrgId: organizationId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to submit request." }, { status: 500 });
  }
}
