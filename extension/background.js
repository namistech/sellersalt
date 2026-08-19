// Service worker — the extension's only privileged, long-running context.
// Owns the paired connection state (chrome.storage.session: memory-only,
// cleared on browser restart, never written to disk-backed storage.local)
// and is the single place that calls the SellerSalt API.

import { isAllowedOrigin } from "./lib/config.js";
import {
  exchangePairingCode,
  fetchExtensionSession,
  revokeExtensionSession,
} from "./lib/api-client.js";

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

async function handleAnalyzeListing(message) {
  const connection = await getConnection();
  if (!connection) return { ok: false, error: "Not connected to SellerSalt." };
  try {
    const { analyzeListing } = await import("./lib/api-client.js");
    const result = await analyzeListing(connection.apiBase, connection.token, message.payload);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleAnalyzeShop(message) {
  const connection = await getConnection();
  if (!connection) return { ok: false, error: "Not connected to SellerSalt." };
  try {
    const { analyzeShop } = await import("./lib/api-client.js");
    const result = await analyzeShop(connection.apiBase, connection.token, message.payload);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleScanSearch(message) {
  const connection = await getConnection();
  if (!connection) return { ok: false, error: "Not connected to SellerSalt." };
  try {
    const { scanSearch } = await import("./lib/api-client.js");
    const result = await scanSearch(connection.apiBase, connection.token, message.payload);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleSaveOpportunity(message) {
  const connection = await getConnection();
  if (!connection) return { ok: false, error: "Not connected to SellerSalt." };
  try {
    const { saveOpportunity } = await import("./lib/api-client.js");
    const result = await saveOpportunity(connection.apiBase, connection.token, message.payload);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleGetPlanStatus() {
  const connection = await getConnection();
  if (!connection) return { ok: false, error: "Not connected." };
  try {
    const { fetchPlanStatus } = await import("./lib/api-client.js");
    const result = await fetchPlanStatus(connection.apiBase, connection.token);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

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
      case "ANALYZE_LISTING":
        sendResponse(await handleAnalyzeListing(message));
        break;
      case "ANALYZE_SHOP":
        sendResponse(await handleAnalyzeShop(message));
        break;
      case "SCAN_SEARCH":
        sendResponse(await handleScanSearch(message));
        break;
      case "SAVE_OPPORTUNITY":
        sendResponse(await handleSaveOpportunity(message));
        break;
      case "GET_PLAN_STATUS":
        sendResponse(await handleGetPlanStatus());
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
