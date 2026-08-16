import { NextResponse } from "next/server";
import { consumePairingCode, createExtensionSessionToken } from "@/lib/extension-pairing";

// Called by the extension's background service worker (never a content
// script directly). No session cookie is expected or used here — the
// pairing code itself, minted only from an authenticated web session in
// POST /api/extension/pair, is the sole credential. Consuming it is
// single-use (see consumePairingCode's GETDEL) and short-lived (5 min TTL).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!code) {
    return NextResponse.json({ error: "Pairing code is required." }, { status: 400 });
  }

  const identity = await consumePairingCode(code);
  if (!identity) {
    return NextResponse.json(
      { error: "Pairing code is invalid, expired, or already used." },
      { status: 400 }
    );
  }

  const { token, expiresInSeconds } = await createExtensionSessionToken(identity);

  return NextResponse.json({
    token,
    organizationId: identity.organizationId,
    organizationName: identity.organizationName,
    expiresInSeconds,
  });
}
