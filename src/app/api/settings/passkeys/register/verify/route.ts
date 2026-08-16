import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rpID, expectedOrigin } from "@/lib/webauthn";
import { verifyChallengeToken } from "@/lib/webauthn-challenge";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { response, challengeToken, name } = (body ?? {}) as {
    response?: RegistrationResponseJSON;
    challengeToken?: string;
    name?: string;
  };

  if (!response || !challengeToken) {
    return NextResponse.json({ error: "Missing registration response." }, { status: 400 });
  }

  const payload = verifyChallengeToken(challengeToken);
  if (!payload || payload.userId !== userId) {
    return NextResponse.json({ error: "This passkey setup request expired or is invalid. Please try again." }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: payload.challenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
      // Matches the "preferred" (not "required") userVerification policy
      // declared in register/options/route.ts — see the matching
      // requireUserVerification note in src/lib/auth.ts's passkey
      // authorize() for why this must stay consistent with login.
      requireUserVerification: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Passkey verification failed." }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey verification failed." }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  const existing = await prisma.webAuthnCredential.findUnique({ where: { credentialId: credential.id } });
  if (existing) {
    return NextResponse.json({ error: "This passkey is already registered." }, { status: 409 });
  }

  const saved = await prisma.webAuthnCredential.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: BigInt(credential.counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports?.length ? credential.transports.join(",") : null,
      name: name?.trim() || null,
    },
  });

  return NextResponse.json({
    success: true,
    passkey: {
      id: saved.id,
      name: saved.name,
      deviceType: saved.deviceType,
      createdAt: saved.createdAt,
      lastUsedAt: saved.lastUsedAt,
    },
  });
}
