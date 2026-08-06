import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: { isFavorite?: boolean; status?: string } = {};
  if (typeof body.isFavorite === "boolean") data.isFavorite = body.isFavorite;
  if (typeof body.status === "string") data.status = body.status;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const result = await prisma.prospect.updateMany({
    where: { id, organizationId },
    data: data as any,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}