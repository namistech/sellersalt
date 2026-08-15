import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exportProspectsToGoogleSheets } from "@/services/connectors/google-sheets";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  if (!session || !organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchConfigId, keyword, spreadsheetTitle, accessToken } = (await req.json()) as {
    searchConfigId?: string;
    keyword?: string;
    spreadsheetTitle?: string;
    accessToken?: string;
  };

  const result = await exportProspectsToGoogleSheets({
    organizationId,
    searchConfigId,
    keyword,
    spreadsheetTitle,
    accessToken,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
