import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";
import { decrypt } from "@/lib/encryption";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

/** Tests whichever credential slot (LIVE or SANDBOX) the admin is
 * currently viewing — independent of which slot is presently marked
 * active on the row, so a new key can be verified before switching to
 * it (matches the "confirm before switching to LIVE" requirement). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { mode } = (await req.json().catch(() => ({}))) as { mode?: "LIVE" | "SANDBOX" };

  const row = await prisma.paymentProvider.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Provider not found." }, { status: 404 });

  const encrypted = mode === "LIVE" ? row.encryptedLiveCredentials : row.encryptedSandboxCredentials;
  if (!encrypted) {
    return NextResponse.json({ ok: false, message: `No ${mode ?? "SANDBOX"} credentials saved yet.` }, { status: 400 });
  }

  let credentials: Record<string, string>;
  try {
    credentials = JSON.parse(decrypt(encrypted));
  } catch {
    return NextResponse.json({ ok: false, message: "Stored credentials could not be decrypted." }, { status: 500 });
  }

  try {
    if (row.provider === "STRIPE") {
      if (!credentials.secretKey) return NextResponse.json({ ok: false, message: "Secret Key is required." }, { status: 400 });
      const stripe = new Stripe(credentials.secretKey);
      const balance = await stripe.balance.retrieve();
      return NextResponse.json({ ok: true, message: `Connected — account currency ${balance.available[0]?.currency?.toUpperCase() ?? "confirmed"}.` });
    }

    if (row.provider === "PAYPAL") {
      if (!credentials.clientId || !credentials.clientSecret) {
        return NextResponse.json({ ok: false, message: "Client ID and Client Secret are required." }, { status: 400 });
      }
      const baseUrl = mode === "LIVE" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      const tokenRes = await axios.post(
        `${baseUrl}/v1/oauth2/token`,
        "grant_type=client_credentials",
        { auth: { username: credentials.clientId, password: credentials.clientSecret }, headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
      );
      if (!tokenRes.data.access_token) throw new Error("No access token returned.");
      return NextResponse.json({ ok: true, message: `Connected — ${mode === "LIVE" ? "live" : "sandbox"} OAuth token issued successfully.` });
    }

    // Safepay/PayFast don't have a lightweight read-only verification
    // endpoint wired into this codebase yet — this checks the required
    // fields are present, not that they're genuinely valid against the
    // provider's API. Labeled accordingly in the response.
    if (row.provider === "SAFEPAY") {
      const missing = ["apiKey", "secretKey", "merchantId"].filter((k) => !credentials[k]);
      if (missing.length) return NextResponse.json({ ok: false, message: `Missing: ${missing.join(", ")}` }, { status: 400 });
      return NextResponse.json({ ok: true, message: "Required fields present (no live API ping implemented for Safepay yet).", partial: true });
    }

    if (row.provider === "PAYFAST") {
      const missing = ["merchantId", "securedKey"].filter((k) => !credentials[k]);
      if (missing.length) return NextResponse.json({ ok: false, message: `Missing: ${missing.join(", ")}` }, { status: 400 });
      return NextResponse.json({ ok: true, message: "Required fields present (no live API ping implemented for PayFast yet).", partial: true });
    }

    return NextResponse.json({ ok: false, message: "Unknown provider." }, { status: 400 });
  } catch (err: any) {
    const message = err?.response?.data?.error_description || err?.response?.data?.error?.message || err?.message || "Connection test failed.";
    return NextResponse.json({ ok: false, message }, { status: 200 });
  }
}
