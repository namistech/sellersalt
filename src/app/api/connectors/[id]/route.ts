import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Scoped delete: the where clause enforces org ownership, so one org can never
  // delete another org's connector even if it guesses an id.
  const result = await prisma.connector.deleteMany({
    where: { id: params.id, organizationId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Connector not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
