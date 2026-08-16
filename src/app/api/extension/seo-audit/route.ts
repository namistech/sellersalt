import { NextResponse } from "next/server";
import { auditListingSeo } from "@/services/seo-engine";
import { extractBearerToken, resolveExtensionSessionToken } from "@/lib/extension-pairing";

// Phase P3 — the extension's Etsy DOM bridge (Phase P2) calls this with
// the title/tags/description it extracted from the listing editor. This
// route is a thin, stateless pass-through to the existing deterministic
// SEO engine (src/services/seo-engine.ts) — the scoring algorithm is not
// duplicated here or anywhere in the extension.
//
// Authenticated by the extension's bearer session token (Phase P1), not
// a web session cookie. No organizationId is read from the request body;
// the audit itself is a pure function of the submitted text, so there is
// no cross-tenant data to leak — the bearer token only proves the caller
// is a paired, connected extension.
export async function POST(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const identity = await resolveExtensionSessionToken(token);
  if (!identity) {
    return NextResponse.json({ error: "Session token is invalid or expired." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : "";
  const tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown): t is string => typeof t === "string") : [];
  const description = typeof body.description === "string" ? body.description : "";

  if (!title.trim()) {
    return NextResponse.json({ error: "Title is required to run an SEO audit." }, { status: 400 });
  }

  const audit = auditListingSeo({ title, tags, description });

  return NextResponse.json({ audit });
}
