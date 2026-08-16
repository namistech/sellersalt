// Etsy-side content script — the DOM bridge for Phase P2. Detects whether
// the current page is the Shop Manager listing editor, waits for it to
// finish async-rendering, extracts the currently editable fields, and
// forwards a normalized, deduplicated, debounced snapshot to the
// background service worker over the standard MV3 messaging boundary.
//
// Also handles Phase P4's Apply step: on an explicit APPLY_SUGGESTION
// message from the side panel (relayed via the background worker), and
// ONLY then, it writes a single field's value back into the editor. It
// never decides to apply anything itself and never touches a Save/
// Publish control — this file only writes what the user explicitly
// clicked "Apply" on.

import { EtsyPageType, classifyEtsyUrl, extractListingIdFromUrl } from "./etsy/page-detector.js";
import { EtsyEditorSelectors } from "./etsy/selectors.js";
import { buildEditorSnapshot, isSamePayload } from "./etsy/payload.js";

const DEBOUNCE_MS = 400;
const URL_POLL_MS = 750;
const EDITOR_MOUNT_POLL_MS = 300;

const EditorState = {
  NOT_ETSY: "NOT_ETSY",
  NOT_EDITOR: "NOT_EDITOR",
  LOADING: "LOADING",
  READY: "READY",
};

let currentUrl = window.location.href;
let editorState = EditorState.NOT_ETSY;
let mountPollTimer = null;
let fieldObserver = null;
let debounceTimer = null;
let lastSentSnapshot = null;

function extractSnapshot(state) {
  const pageType = classifyEtsyUrl(window.location.href);
  const listingId = extractListingIdFromUrl(window.location.href);

  if (state !== EditorState.READY) {
    return buildEditorSnapshot({
      pageType,
      editorState: state,
      listingId,
      listingUrl: window.location.href,
      title: null,
      description: null,
      tags: [],
      categoryName: null,
    });
  }

  return buildEditorSnapshot({
    pageType,
    editorState: state,
    listingId,
    listingUrl: window.location.href,
    title: EtsyEditorSelectors.extractTitle(),
    description: EtsyEditorSelectors.extractDescription(),
    tags: EtsyEditorSelectors.extractTags(),
    categoryName: EtsyEditorSelectors.extractCategoryName(),
  });
}

function sendSnapshot() {
  const snapshot = extractSnapshot(editorState);
  if (isSamePayload(snapshot, lastSentSnapshot)) return;
  lastSentSnapshot = snapshot;
  try {
    chrome.runtime.sendMessage({ type: "ETSY_EDITOR_SNAPSHOT", payload: snapshot });
  } catch {
    // The service worker can be between restarts — a dropped update is
    // acceptable here since the next mutation/poll will retry.
  }
}

function scheduleSend() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(sendSnapshot, DEBOUNCE_MS);
}

function stopWatchingFields() {
  if (fieldObserver) {
    fieldObserver.disconnect();
    fieldObserver = null;
  }
  document.removeEventListener("input", scheduleSend, true);
  document.removeEventListener("change", scheduleSend, true);
}

function startWatchingFields() {
  stopWatchingFields();
  const root = document.body || document.documentElement;
  if (!root) return;
  fieldObserver = new MutationObserver(() => scheduleSend());
  fieldObserver.observe(root, { childList: true, subtree: true, characterData: true });
  // MutationObserver alone misses plain .value changes on <input>/<textarea>
  // that don't touch the DOM tree — input/change listeners cover that gap.
  document.addEventListener("input", scheduleSend, true);
  document.addEventListener("change", scheduleSend, true);
}

function stopWaitingForMount() {
  if (mountPollTimer) {
    clearInterval(mountPollTimer);
    mountPollTimer = null;
  }
}

function waitForEditorMount() {
  stopWaitingForMount();
  mountPollTimer = setInterval(() => {
    if (EtsyEditorSelectors.isEditorMounted()) {
      stopWaitingForMount();
      setEditorState(EditorState.READY);
    }
  }, EDITOR_MOUNT_POLL_MS);
}

function setEditorState(next) {
  if (editorState === next) {
    scheduleSend();
    return;
  }
  editorState = next;

  if (next !== EditorState.READY) {
    stopWatchingFields();
  }
  if (next === EditorState.LOADING) {
    waitForEditorMount();
  } else {
    stopWaitingForMount();
  }
  if (next === EditorState.READY) {
    startWatchingFields();
  }

  scheduleSend();
}

function evaluateCurrentPage() {
  const pageType = classifyEtsyUrl(window.location.href);

  if (pageType === EtsyPageType.NOT_ETSY) {
    setEditorState(EditorState.NOT_ETSY);
    return;
  }
  if (pageType === EtsyPageType.ETSY_OTHER) {
    setEditorState(EditorState.NOT_EDITOR);
    return;
  }
  // ETSY_LISTING_EDITOR
  setEditorState(EtsyEditorSelectors.isEditorMounted() ? EditorState.READY : EditorState.LOADING);
}

function checkForNavigation() {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    evaluateCurrentPage();
  }
}

// Phase P4 — explicit Apply handler. Only ever invoked by a direct user
// click in the side panel (see sidepanel.js's applySuggestion), relayed
// through background.js. No automatic triggering path exists anywhere.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "APPLY_SUGGESTION") return undefined;

  let result;
  if (message.field === "title" && typeof message.value === "string") {
    result = EtsyEditorSelectors.setTitleValue(message.value);
  } else if (message.field === "tags" && Array.isArray(message.value)) {
    result = EtsyEditorSelectors.setTagsValue(message.value);
  } else {
    result = { applied: false, reason: "UNSUPPORTED_FIELD" };
  }

  if (result.applied) {
    // Re-extract immediately so the SEO score/snapshot reflect the
    // change without waiting out the normal debounce window.
    sendSnapshot();
  }

  sendResponse(result);
  return true;
});

// Etsy's Shop Manager is a client-rendered SPA. A content script's
// isolated JS world can't reliably intercept the page's own
// history.pushState calls (separate world, separate function reference
// from the page's own `history` object), so URL-change detection here
// uses interval polling plus `popstate` as a fast-path for back/forward
// navigation — simple, and always correct regardless of how the page
// implements its own routing, at the cost of a small fixed poll interval.
window.addEventListener("popstate", checkForNavigation);
setInterval(checkForNavigation, URL_POLL_MS);

evaluateCurrentPage();
