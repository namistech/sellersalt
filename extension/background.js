// Service worker — the extension's only privileged, long-running context.
// Owns the paired connection state (chrome.storage.session: memory-only,
// cleared on browser restart, never written to disk-backed storage.local)
// and is the single place that calls the SellerSalt API.

import { isAllowedOrigin } from "./lib/config.js";
import {
  exchangePairingCode,
  fetchExtensionSession,
  revokeExtensionSession,
  requestSeoAudit,
  requestSuggestions,
} from "./lib/api-client.js";
import { buildSeoAuditInput, seoInputKey, isSeoAuditable, normalizeSeoAuditResult, buildAuditErrorState } from "./lib/seo-request.js";
import { suggestionInputKey, normalizeSuggestions } from "./lib/suggestions.js";

const STORAGE_KEY = "sellersaltConnection";

async function getConnection() {
  const data = await chrome.storage.session.get(STORAGE_KEY);
  return data[STORAGE_KEY] || null;
}

async function setConnection(connection) {
  await chrome.storage.session.set({ [STORAGE_KEY]: connection });
}

async function clearConnection() {
  await chrome.storage.session.remove(STORAGE_KEY);
}

// What the side panel is allowed to see — never re-exposes the bearer
// token to callers beyond this file.
function publicConnection(connection, identity) {
  return {
    organizationId: identity?.organizationId ?? connection.organizationId,
    organizationName: identity?.organizationName ?? connection.organizationName,
    connectedAt: connection.connectedAt,
  };
}

async function handlePairCodeReceived(message, sender) {
  const origin = sender?.origin || message.origin;
  if (!isAllowedOrigin(origin)) {
    return { ok: false, error: "Untrusted origin." };
  }
  try {
    const result = await exchangePairingCode(origin, message.code);
    const connection = {
      token: result.token,
      organizationId: result.organizationId,
      organizationName: result.organizationName,
      apiBase: origin,
      connectedAt: Date.now(),
    };
    await setConnection(connection);
    return { ok: true, connected: true, connection: publicConnection(connection) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleGetConnectionState() {
  const connection = await getConnection();
  if (!connection) {
    return { ok: true, connected: false };
  }
  // Server remains authoritative: re-validate the token (and refresh the
  // organization name) on every panel open rather than trusting the
  // locally cached copy indefinitely.
  const identity = await fetchExtensionSession(connection.apiBase, connection.token);
  if (!identity) {
    await clearConnection();
    return { ok: true, connected: false };
  }
  return { ok: true, connected: true, connection: publicConnection(connection, identity) };
}

async function handleDisconnect() {
  const connection = await getConnection();
  if (connection) {
    await revokeExtensionSession(connection.apiBase, connection.token);
  }
  await clearConnection();
  return { ok: true };
}

// Phase P2 — Etsy listing-editor DOM bridge. This is intentionally just a
// mailbox: the background worker stores the latest snapshot per tab so a
// later phase (e.g. a side-panel overlay) can read it, and does nothing
// else with it yet — no scoring, no server calls, no Etsy writes.
const ETSY_SNAPSHOTS_KEY = "sellersaltEtsySnapshots";

async function getEtsySnapshots() {
  const data = await chrome.storage.session.get(ETSY_SNAPSHOTS_KEY);
  return data[ETSY_SNAPSHOTS_KEY] || {};
}

async function handleEtsyEditorSnapshot(message, sender) {
  const tabId = sender?.tab?.id;
  if (tabId === undefined) {
    return { ok: false, error: "Missing tab context." };
  }
  const snapshots = await getEtsySnapshots();
  snapshots[tabId] = message.payload;
  await chrome.storage.session.set({ [ETSY_SNAPSHOTS_KEY]: snapshots });

  // Fire-and-forget: both the SEO audit and suggestions run
  // asynchronously so the content script's message ack (and its own
  // debounce) isn't blocked on a network round-trip. The side panel
  // picks up results via the session-storage change they trigger.
  runSeoAuditIfNeeded(tabId, message.payload).catch(() => {});
  runSuggestionsIfNeeded(tabId, message.payload).catch(() => {});

  return { ok: true };
}

async function handleGetEtsyEditorSnapshot(message, sender) {
  const tabId = message.tabId ?? sender?.tab?.id;
  if (tabId === undefined) {
    return { ok: true, snapshot: null };
  }
  const snapshots = await getEtsySnapshots();
  return { ok: true, snapshot: snapshots[tabId] || null };
}

// Phase P3 — SEO audit orchestration. Reuses the existing SEO engine
// (src/services/seo-engine.ts) via POST /api/extension/seo-audit; no
// scoring logic lives in the extension. This is the ONLY place a request
// to that endpoint is triggered from.
const SEO_AUDITS_KEY = "sellersaltSeoAudits";
// In-memory de-dupe cache: a snapshot update that doesn't change any
// SEO-relevant field must never trigger another request. Best-effort
// only — reset if the service worker restarts, which just means one
// extra (still deduped-on-content) request, never a stale result shown.
const lastAuditedKeyByTab = new Map();

async function getSeoAudits() {
  const data = await chrome.storage.session.get(SEO_AUDITS_KEY);
  return data[SEO_AUDITS_KEY] || {};
}

async function setSeoAuditState(tabId, state) {
  const audits = await getSeoAudits();
  audits[tabId] = state;
  await chrome.storage.session.set({ [SEO_AUDITS_KEY]: audits });
}

async function runSeoAuditIfNeeded(tabId, snapshot) {
  if (!isSeoAuditable(snapshot)) {
    // Not an error — just nothing scoreable yet (page not the editor,
    // editor still loading, or no title typed).
    await setSeoAuditState(tabId, { status: "UNAVAILABLE", reason: "NOT_AUDITABLE", updatedAt: Date.now() });
    return;
  }

  const connection = await getConnection();
  if (!connection) {
    await setSeoAuditState(tabId, { status: "UNAVAILABLE", reason: "NOT_CONNECTED", updatedAt: Date.now() });
    return;
  }

  const input = buildSeoAuditInput(snapshot);
  const key = seoInputKey(input);
  if (lastAuditedKeyByTab.get(tabId) === key) {
    return; // identical content already audited — avoid a duplicate request
  }
  lastAuditedKeyByTab.set(tabId, key);

  await setSeoAuditState(tabId, { status: "CALCULATING", updatedAt: Date.now() });

  try {
    const apiResponse = await requestSeoAudit(connection.apiBase, connection.token, input);
    const result = normalizeSeoAuditResult(apiResponse);
    if (!result) {
      await setSeoAuditState(tabId, buildAuditErrorState("SEO audit response was malformed."));
      return;
    }
    await setSeoAuditState(tabId, { status: "READY", result, updatedAt: Date.now() });
  } catch (err) {
    await setSeoAuditState(tabId, buildAuditErrorState(err.message));
  }
}

async function handleGetSeoAuditState(message, sender) {
  const tabId = message.tabId ?? sender?.tab?.id;
  if (tabId === undefined) {
    return { ok: true, seo: null };
  }
  const audits = await getSeoAudits();
  return { ok: true, seo: audits[tabId] || null };
}

// Phase P4 — tag/title suggestions. Reuses POST /api/extension/suggestions
// (itself a composition of the existing SEO + keyword-research engines).
// This module only fetches and stores what to DISPLAY; applying a
// suggestion is a separate, explicitly user-triggered path below
// (handleApplySuggestion) and never happens from here.
const SUGGESTIONS_KEY = "sellersaltSuggestions";
const lastSuggestedKeyByTab = new Map();

async function getSuggestionsStore() {
  const data = await chrome.storage.session.get(SUGGESTIONS_KEY);
  return data[SUGGESTIONS_KEY] || {};
}

async function setSuggestionsState(tabId, state) {
  const store = await getSuggestionsStore();
  store[tabId] = state;
  await chrome.storage.session.set({ [SUGGESTIONS_KEY]: store });
}

async function runSuggestionsIfNeeded(tabId, snapshot) {
  if (!isSeoAuditable(snapshot)) {
    await setSuggestionsState(tabId, { status: "UNAVAILABLE", reason: "NOT_AUDITABLE", updatedAt: Date.now() });
    return;
  }

  const connection = await getConnection();
  if (!connection) {
    await setSuggestionsState(tabId, { status: "UNAVAILABLE", reason: "NOT_CONNECTED", updatedAt: Date.now() });
    return;
  }

  const input = buildSeoAuditInput(snapshot);
  const key = suggestionInputKey(input);
  if (lastSuggestedKeyByTab.get(tabId) === key) {
    return; // identical content already fetched — avoid a duplicate request
  }
  lastSuggestedKeyByTab.set(tabId, key);

  await setSuggestionsState(tabId, { status: "CALCULATING", updatedAt: Date.now() });

  try {
    const apiResponse = await requestSuggestions(connection.apiBase, connection.token, input);
    const result = normalizeSuggestions(apiResponse);
    if (!result) {
      await setSuggestionsState(tabId, { status: "ERROR", error: "Suggestions response was malformed.", updatedAt: Date.now() });
      return;
    }
    await setSuggestionsState(tabId, {
      status: "READY",
      result,
      currentTitle: input.title,
      currentTags: input.tags,
      updatedAt: Date.now(),
    });
  } catch (err) {
    await setSuggestionsState(tabId, { status: "ERROR", error: err.message, updatedAt: Date.now() });
  }
}

async function handleGetSuggestionsState(message, sender) {
  const tabId = message.tabId ?? sender?.tab?.id;
  if (tabId === undefined) {
    return { ok: true, suggestions: null };
  }
  const store = await getSuggestionsStore();
  return { ok: true, suggestions: store[tabId] || null };
}

// The ONLY path that writes anything into the Etsy editor. Only fires in
// direct response to a message the side panel sends when the user clicks
// "Apply" — nothing in this file ever calls it on its own. Relays to the
// specific tab's content script, which performs the actual DOM write.
async function handleApplySuggestion(message) {
  const { tabId, field, value } = message;
  if (tabId === undefined || (field !== "title" && field !== "tags")) {
    return { ok: false, error: "Invalid apply request." };
  }
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: "APPLY_SUGGESTION", field, value });
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message || "Could not reach the Etsy tab." };
  }
}

// Prevents the per-tab snapshot/audit/suggestion maps from growing
// unboundedly across a long browser session.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const snapshots = await getEtsySnapshots();
  if (tabId in snapshots) {
    delete snapshots[tabId];
    await chrome.storage.session.set({ [ETSY_SNAPSHOTS_KEY]: snapshots });
  }
  const audits = await getSeoAudits();
  if (tabId in audits) {
    delete audits[tabId];
    await chrome.storage.session.set({ [SEO_AUDITS_KEY]: audits });
  }
  const suggestions = await getSuggestionsStore();
  if (tabId in suggestions) {
    delete suggestions[tabId];
    await chrome.storage.session.set({ [SUGGESTIONS_KEY]: suggestions });
  }
  lastAuditedKeyByTab.delete(tabId);
  lastSuggestedKeyByTab.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "SELLERSALT_PAIR_CODE_RECEIVED":
        sendResponse(await handlePairCodeReceived(message, sender));
        break;
      case "GET_CONNECTION_STATE":
        sendResponse(await handleGetConnectionState());
        break;
      case "DISCONNECT":
        sendResponse(await handleDisconnect());
        break;
      case "ETSY_EDITOR_SNAPSHOT":
        sendResponse(await handleEtsyEditorSnapshot(message, sender));
        break;
      case "GET_ETSY_EDITOR_SNAPSHOT":
        sendResponse(await handleGetEtsyEditorSnapshot(message, sender));
        break;
      case "GET_SEO_AUDIT_STATE":
        sendResponse(await handleGetSeoAuditState(message, sender));
        break;
      case "GET_SUGGESTIONS_STATE":
        sendResponse(await handleGetSuggestionsState(message, sender));
        break;
      case "APPLY_SUGGESTION":
        sendResponse(await handleApplySuggestion(message));
        break;
      default:
        sendResponse({ ok: false, error: "Unknown message type." });
    }
  })();

  return true; // keep the message channel open for the async sendResponse above
});

// Clicking the toolbar icon opens the side panel for the current tab.
chrome.action.onClicked.addListener((tab) => {
  if (tab?.windowId !== undefined) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
