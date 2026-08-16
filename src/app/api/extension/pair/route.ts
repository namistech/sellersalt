import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPairingCode } from "@/lib/extension-pairing";

// Mints a short-lived, single-use pairing code for the browser extension.
// Authenticated by the caller's normal web session cookie — the server
// resolves organizationId/userId itself, the extension never supplies them.
export async function POST() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;

  if (!session || !organizationId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  const { code, expiresInSeconds } = await createPairingCode({
    organizationId,
    organizationName: organization?.name ?? "SellerSalt",
    userId,
  });

  return NextResponse.json({ code, expiresInSeconds });
}
