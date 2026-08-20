import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getResearchRunDetails } from "@/marketplaces/core/acquisition/workbench";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const run = await getResearchRunDetails(id, organizationId);

    if (!run) {
      return NextResponse.json({ error: "Research run not found" }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error: any) {
    console.error("[GetResearchRunDetailsError]", error);
    return NextResponse.json({ error: error.message || "Failed to get research run details" }, { status: 500 });
  }
}
