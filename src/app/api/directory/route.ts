import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchPublicDirectory, updateDirectoryProfile, getDirectoryProfile } from "@/services/tenancy";
import { OrganizationType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || undefined;
    const type = (searchParams.get("type") as OrganizationType) || undefined;
    const service = searchParams.get("service") || undefined;
    const slug = searchParams.get("slug");

    if (slug) {
      const profile = await getDirectoryProfile(slug);
      if (!profile) {
        return NextResponse.json({ error: "Directory profile not found." }, { status: 404 });
      }
      return NextResponse.json({ profile });
    }

    const results = await searchPublicDirectory({ query, type, service });
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search directory." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const orgId = (session?.user as any)?.organizationId;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updated = await updateDirectoryProfile(orgId, userId, {
      isPublicDirectory: body.isPublicDirectory,
      directorySlug: body.directorySlug,
      directoryBio: body.directoryBio,
      directoryServices: body.directoryServices,
    });

    return NextResponse.json({ success: true, organization: updated });
  } catch (error: any) {
    const status = error.statusCode || (error.code === "TENANT_ACCESS_DENIED" ? 403 : 400);
    return NextResponse.json({ error: error.message || "Failed to update directory profile." }, { status });
  }
}
