import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { title, marketplace } = body;

    return NextResponse.json({
      success: true,
      redirectUrl: `/validate?query=${encodeURIComponent(title || id)}&marketplace=${marketplace || "all"}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process validation handoff" },
      { status: 500 }
    );
  }
}
