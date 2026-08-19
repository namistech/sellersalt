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

// Batch 18 & 19 — Real-time Listing Opportunity Analysis
export async function analyzeListing(origin, token, payload) {
  const res = await fetch(`${origin}/api/extension/analyze-listing`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Listing analysis failed (${res.status}).`);
  }
  return data;
}

// Batch 18 & 19 — Real-time Shop Intelligence Analysis
export async function analyzeShop(origin, token, payload) {
  const res = await fetch(`${origin}/api/extension/analyze-shop`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Shop analysis failed (${res.status}).`);
  }
  return data;
}

// Batch 18 & 19 — Search Page Scanner
export async function scanSearch(origin, token, payload) {
  const res = await fetch(`${origin}/api/extension/scan-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Search scan failed (${res.status}).`);
  }
  return data;
}

// Batch 18 & 19 — 1-Click Save to Opportunity Memory / Planner
export async function saveOpportunity(origin, token, payload) {
  const res = await fetch(`${origin}/api/extension/save-opportunity`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Save opportunity failed (${res.status}).`);
  }
  return data;
}

// Batch 18 & 19 — Plan & Entitlement Status Check
export async function fetchPlanStatus(origin, token) {
  const res = await fetch(`${origin}/api/extension/plan-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}
