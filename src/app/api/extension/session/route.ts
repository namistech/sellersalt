import { NextResponse } from "next/server";
import {
  extractBearerToken,
  resolveExtensionSessionToken,
  revokeExtensionSessionToken,
} from "@/lib/extension-pairing";

// Server-authoritative identity check for the extension's session token.
// The extension sends only its bearer token — organizationId/organizationName
// here always come from the server-side token record, never from the caller.
export async function GET(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const identity = await resolveExtensionSessionToken(token);
  if (!identity) {
    return NextResponse.json({ error: "Session token is invalid or expired." }, { status: 401 });
  }

  return NextResponse.json({
    organizationId: identity.organizationId,
    organizationName: identity.organizationName,
    userId: identity.userId,
  });
}

// Disconnects the extension (e.g. user clicks "Disconnect" in the side panel).
export async function DELETE(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  await revokeExtensionSessionToken(token);
  return NextResponse.json({ success: true });
}
