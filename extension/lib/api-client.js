// Minimal SellerSalt API abstraction for the extension. Every function
// takes an explicit `origin` (the paired web app's origin) rather than a
// hardcoded URL, since production/staging/local are all valid pairing
// targets — see config.js's ALLOWED_ORIGINS for the trusted set.
//
// This is the ONLY module in the extension that talks to the network.
// Nothing here ever sends or trusts an organizationId from the caller —
// identity always comes back from the server's response to a token it
// resolved itself.

export async function exchangePairingCode(origin, code) {
  const res = await fetch(`${origin}/api/extension/pair/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Pairing exchange failed (${res.status}).`);
  }
  return data; // { token, organizationId, organizationName, expiresInSeconds }
}

export async function fetchExtensionSession(origin, token) {
  const res = await fetch(`${origin}/api/extension/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json(); // { organizationId, organizationName, userId }
}

export async function revokeExtensionSession(origin, token) {
  try {
    await fetch(`${origin}/api/extension/session`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Best-effort server-side revoke — the caller always clears local
    // extension state regardless of whether this network call succeeds.
  }
}

// Phase P3 — runs the existing SellerSalt SEO engine (src/services/seo-
// engine.ts) against the title/tags/description extracted by the Etsy DOM
// bridge. No scoring logic lives here or anywhere else in the extension —
// this is a pure pass-through to the server's real audit.
export async function requestSeoAudit(origin, token, input) {
  const res = await fetch(`${origin}/api/extension/seo-audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `SEO audit failed (${res.status}).`);
  }
  return data; // { audit: CompleteListingSeoAudit }
}

// Phase P4 — composes src/services/seo-engine.ts + src/services/keyword-
// research.ts (both existing) into title/tag suggestions. No suggestion
// or keyword logic lives in the extension itself.
export async function requestSuggestions(origin, token, input) {
  const res = await fetch(`${origin}/api/extension/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Suggestions request failed (${res.status}).`);
  }
  return data;
}
