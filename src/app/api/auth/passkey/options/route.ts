import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { rpID } from "@/lib/webauthn";
import { createChallengeToken } from "@/lib/webauthn-challenge";

// Public — the whole point of a passkey login is that we don't know who
// the user is yet. No allowCredentials means "discoverable credential"
// mode: the browser/authenticator itself lists which of the user's
// passkeys work for this site, rather than us needing to ask for an
// identifier first.
export async function POST() {
  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "preferred",
  });

  const challengeToken = createChallengeToken({ challenge: options.challenge });

  return NextResponse.json({ options, challengeToken });
}
