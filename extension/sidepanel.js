// Side panel UI.
// Connection section proves: Not connected → Pair → Connected as {organization}.
// SEO section (Phase P3) proves: unsupported editor state → calculating →
// current score → error / unavailable — for whichever Etsy tab is active.
// Suggestions section (Phase P4) proves: Suggestion (auto-displayed,
// read-only) → Preview (the rendered before/after, still unapplied) →
// Apply (one explicit click per field). Nothing here writes to Etsy on
// its own — every apply-btn click is a distinct user action.
// Talks only to the background service worker via chrome.runtime messaging;
// it never calls the SellerSalt API or holds the session token directly.

import { buildTagsAfterApply, buildTitlePreview } from "./lib/suggestions.js";
import { SELLERSALT_ORIGIN } from "./lib/config.js";

const WEB_APP_PAIR_URL = `${SELLERSALT_ORIGIN}/settings/extension`;

const stateEl = document.getElementById("state");
const connectBtn = document.getElementById("connect-btn");
const disconnectBtn = document.getElementById("disconnect-btn");
const seoPanelEl = document.getElementById("seo-panel");
const seoStateEl = document.getElementById("seo-state");
const suggestionsPanelEl = document.getElementById("suggestions-panel");
const titleSuggestionEl = document.getElementById("title-suggestion");
const tagSuggestionsEl = document.getElementById("tag-suggestions");

let connected = false;
let activeTabId = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function renderConnection(status) {
  connected = Boolean(status.connected);
  if (connected) {
    stateEl.className = "state connected";
    stateEl.innerHTML = `<strong>Connected</strong><br /><span class="muted">Organization: ${escapeHtml(
      status.connection.organizationName
    )}</span>`;
    connectBtn.style.display = "none";
    disconnectBtn.style.display = "block";
  } else {
    stateEl.className = "state";
    stateEl.innerHTML = `<span class="muted">Not connected</span>`;
    connectBtn.style.display = "block";
    disconnectBtn.style.display = "none";
  }
  seoPanelEl.style.display = connected ? "block" : "none";
  suggestionsPanelEl.style.display = connected ? "block" : "none";
}

function refreshConnection() {
  chrome.runtime.sendMessage({ type: "GET_CONNECTION_STATE" }, (response) => {
    renderConnection(response?.ok ? response : { connected: false });
  });
}

function renderSeoUnsupported(editorState) {
  const messages = {
    NOT_ETSY: "Open an Etsy Shop Manager listing to see its SEO score here.",
    NOT_EDITOR: "This Etsy page isn't the listing editor.",
    LOADING: "Waiting for the listing editor to finish loading…",
  };
  seoStateEl.innerHTML = `<span class="muted">${escapeHtml(
    messages[editorState] || "Open a listing in the editor to see its SEO score."
  )}</span>`;
}

function renderSeverityLabel(severity) {
  return escapeHtml(severity || "");
}

function renderSeoResult(result) {
  const rows = [
    ["Title", result.breakdown.titleScore, 30],
    ["Tags", result.breakdown.tagScore, 35],
    ["Synergy", result.breakdown.keywordSynergyScore, 15],
    ["Description", result.breakdown.descriptionScore, 10],
    ["Taxonomy", result.breakdown.taxonomyScore, 10],
  ];

  const breakdownHtml = rows
    .map(([label, value, max]) => `<div>${label}</div><div class="muted">${value}/${max}</div>`)
    .join("");

  const diagnosticsHtml = result.diagnostics.length
    ? result.diagnostics
        .slice(0, 5)
        .map(
          (d) =>
            `<div class="diagnostic ${escapeHtml(d.severity)}"><strong>${renderSeverityLabel(
              d.severity
            )}</strong> — ${escapeHtml(d.title)}<br /><span class="muted">${escapeHtml(d.message)}</span></div>`
        )
        .join("")
    : `<div class="muted">No issues found.</div>`;

  const recommendationsHtml = result.recommendations.length
    ? `<ul style="margin:4px 0;padding-left:16px;">${result.recommendations
        .slice(0, 5)
        .map((r) => `<li>${escapeHtml(r.title)}</li>`)
        .join("")}</ul>`
    : `<span class="muted">No recommendations.</span>`;

  seoStateEl.innerHTML = `
    <div class="score-row">
      <span class="score-value">${result.overallScore}</span>
      <span class="muted">/100${result.grade ? ` · Grade ${escapeHtml(result.grade)}` : ""}</span>
      <span class="badge">SellerSalt Score</span>
    </div>
    <div class="muted" style="font-size:11px;margin-bottom:6px;">
      SellerSalt calculation — not an Etsy-provided ranking, demand, or keyword-volume metric.
    </div>
    <div class="section-title">Breakdown</div>
    <div class="breakdown">${breakdownHtml}</div>
    <div class="section-title">Diagnostics</div>
    ${diagnosticsHtml}
    <div class="section-title">Recommendations</div>
    ${recommendationsHtml}
  `;
}

function renderSeo(seo, snapshot) {
  if (!connected) return;

  if (!snapshot || snapshot.editorState !== "READY") {
    renderSeoUnsupported(snapshot ? snapshot.editorState : "NOT_ETSY");
    return;
  }

  if (!seo || seo.status === "UNAVAILABLE") {
    seoStateEl.innerHTML = `<span class="muted">${
      seo?.reason === "NOT_CONNECTED"
        ? "Reconnect the extension to see live SEO scoring."
        : "Type a title in the editor to get an SEO score."
    }</span>`;
    return;
  }

  if (seo.status === "CALCULATING") {
    seoStateEl.innerHTML = `<span class="muted">Calculating SEO score…</span>`;
    return;
  }

  if (seo.status === "ERROR") {
    seoStateEl.innerHTML = `<span class="muted">Couldn't calculate SEO score: ${escapeHtml(seo.error)}</span>`;
    return;
  }

  if (seo.status === "READY" && seo.result) {
    renderSeoResult(seo.result);
    return;
  }

  seoStateEl.innerHTML = `<span class="muted">—</span>`;
}

function getActiveTabId() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs?.[0]?.id ?? null);
    });
  });
}

function sendMessageAsync(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function renderSuggestionsUnsupported() {
  titleSuggestionEl.innerHTML = `<span class="muted">Open a listing in the editor to see suggestions.</span>`;
  tagSuggestionsEl.innerHTML = `<span class="muted">—</span>`;
}

function renderTitleSuggestion(suggestions, tabId) {
  const recommended = suggestions.result.recommendedTitle;

  if (!recommended) {
    titleSuggestionEl.innerHTML = `<span class="muted">Current title already looks good — no change suggested.</span>`;
    return;
  }

  // Preview: the exact before/after diff, rendered before any write —
  // Apply below is the only thing that turns this into a real change.
  const preview = buildTitlePreview(suggestions.currentTitle, recommended);

  titleSuggestionEl.innerHTML = `
    <span class="diff-before">${escapeHtml(preview.before)}</span>
    <span class="diff-after">${escapeHtml(preview.after)}</span>
    <div class="provenance-tag">SellerSalt suggestion — deterministic, not AI-generated or Etsy-provided.</div>
    <button class="apply-btn" data-apply="title">Apply Title</button>
  `;
  titleSuggestionEl.querySelector('[data-apply="title"]').addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Applying…";
    const res = await sendMessageAsync({ type: "APPLY_SUGGESTION", tabId, field: "title", value: recommended });
    btn.textContent = res?.applied ? "Applied ✓" : "Couldn't apply";
    if (!res?.applied) btn.disabled = false;
  });
}

function renderTagSuggestions(suggestions, tabId) {
  const newTags = suggestions.result.recommendedNewTags;
  const currentTags = suggestions.currentTags || [];

  if (!suggestions.result.keywordDataAvailable) {
    tagSuggestionsEl.innerHTML = `<span class="muted">Tag suggestions unavailable (marketplace keyword data offline).</span>`;
    return;
  }
  if (newTags.length === 0) {
    tagSuggestionsEl.innerHTML = `<span class="muted">No additional tag suggestions right now.</span>`;
    return;
  }

  const chipsHtml = newTags
    .map(
      (t) =>
        `<span class="tag-chip ${t.isCompliant ? "" : "noncompliant"}">${escapeHtml(t.tag)} (${t.charCount}ch)</span>`
    )
    .join("");

  tagSuggestionsEl.innerHTML = `
    <div>${chipsHtml}</div>
    <div class="provenance-tag">Harvested from real competitor listings [ACTUAL ETSY DATA] — adds to your existing tags, never replaces them.</div>
    <button class="apply-btn" data-apply="tags">Apply All Compliant Tags</button>
  `;
  tagSuggestionsEl.querySelector('[data-apply="tags"]').addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const compliant = newTags.filter((t) => t.isCompliant).map((t) => t.tag);
    const merged = buildTagsAfterApply(currentTags, compliant);
    btn.disabled = true;
    btn.textContent = "Applying…";
    const res = await sendMessageAsync({ type: "APPLY_SUGGESTION", tabId, field: "tags", value: merged });
    btn.textContent = res?.applied ? "Applied ✓" : "Couldn't apply";
    if (!res?.applied) btn.disabled = false;
  });
}

function renderSuggestions(suggestions, snapshot, tabId) {
  if (!connected) return;

  if (!snapshot || snapshot.editorState !== "READY") {
    renderSuggestionsUnsupported();
    return;
  }
  if (!suggestions || suggestions.status !== "READY" || !suggestions.result) {
    const msg =
      suggestions?.status === "CALCULATING"
        ? "Loading suggestions…"
        : suggestions?.status === "ERROR"
          ? `Couldn't load suggestions: ${escapeHtml(suggestions.error || "unknown error")}`
          : "Type a title in the editor to get suggestions.";
    titleSuggestionEl.innerHTML = `<span class="muted">${msg}</span>`;
    tagSuggestionsEl.innerHTML = `<span class="muted">—</span>`;
    return;
  }

  renderTitleSuggestion(suggestions, tabId);
  renderTagSuggestions(suggestions, tabId);
}

async function refreshSeo() {
  if (!connected) return;
  const tabId = await getActiveTabId();
  activeTabId = tabId;
  if (tabId === null) {
    renderSeoUnsupported("NOT_ETSY");
    renderSuggestionsUnsupported();
    return;
  }

  const snapshotResponse = await sendMessageAsync({ type: "GET_ETSY_EDITOR_SNAPSHOT", tabId });
  const snapshot = snapshotResponse?.ok ? snapshotResponse.snapshot : null;

  const seoResponse = await sendMessageAsync({ type: "GET_SEO_AUDIT_STATE", tabId });
  const seo = seoResponse?.ok ? seoResponse.seo : null;
  renderSeo(seo, snapshot);

  const suggestionsResponse = await sendMessageAsync({ type: "GET_SUGGESTIONS_STATE", tabId });
  const suggestions = suggestionsResponse?.ok ? suggestionsResponse.suggestions : null;
  renderSuggestions(suggestions, snapshot, tabId);
}

function refreshAll() {
  chrome.runtime.sendMessage({ type: "GET_CONNECTION_STATE" }, (response) => {
    renderConnection(response?.ok ? response : { connected: false });
    refreshSeo();
  });
}

connectBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: WEB_APP_PAIR_URL });
});

disconnectBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "DISCONNECT" }, () => refreshAll());
});

// Live-update as pairing completes, or as the active Etsy tab's editor
// content/SEO audit changes, while the panel is open.
chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "session") refreshAll();
});
chrome.tabs.onActivated.addListener(() => refreshSeo());

refreshAll();
