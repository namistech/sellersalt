import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rpID, rpName } from "@/lib/webauthn";
import { createChallengeToken } from "@/lib/webauthn-challenge";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.webAuthnCredential.findMany({ where: { userId } });

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpID(),
    userName: session!.user!.email || "user",
    userDisplayName: session!.user!.name || session!.user!.email || "SellerSalt User",
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports ? (c.transports.split(",") as any) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const challengeToken = createChallengeToken({ challenge: options.challenge, userId });

  return NextResponse.json({ options, challengeToken });
}
