// Side panel UI for SellerSalt Assistant Extension v1.
// Supports 3 operating modes:
// 1. Listing Opportunity Intelligence
// 2. Shop Market Research
// 3. Search Page Results Scanner
//
// All modes call SellerSalt's own backend (see lib/api-client.js) with
// user-supplied input — this extension never reads or writes Etsy page
// DOM content.

import { SELLERSALT_ORIGIN } from "./lib/config.js";

const WEB_APP_PAIR_URL = `${SELLERSALT_ORIGIN}/settings/extension`;

const stateEl = document.getElementById("state");
const connectBtn = document.getElementById("connect-btn");
const disconnectBtn = document.getElementById("disconnect-btn");
const mainContentEl = document.getElementById("main-content");
const planPillEl = document.getElementById("plan-pill");

// Mode Tabs
const tabListing = document.getElementById("tab-listing");
const tabShop = document.getElementById("tab-shop");
const tabSearch = document.getElementById("tab-search");

// Panels
const panelListing = document.getElementById("panel-listing");
const panelShop = document.getElementById("panel-shop");
const panelSearch = document.getElementById("panel-search");

// Action Buttons
const saveOppBtn = document.getElementById("save-opportunity-btn");
const mineKeywordsBtn = document.getElementById("mine-keywords-btn");
const spyShopBtn = document.getElementById("spy-shop-btn");

let connected = false;
let currentPlanTier = "PRO";

function switchMode(mode) {
  [tabListing, tabShop, tabSearch].forEach((t) => t?.classList.remove("active"));
  [panelListing, panelShop, panelSearch].forEach((p) => {
    if (p) p.style.display = "none";
  });

  if (mode === "listing") {
    tabListing?.classList.add("active");
    if (panelListing) panelListing.style.display = "block";
  } else if (mode === "shop") {
    tabShop?.classList.add("active");
    if (panelShop) panelShop.style.display = "block";
  } else if (mode === "search") {
    tabSearch?.classList.add("active");
    if (panelSearch) panelSearch.style.display = "block";
  }
}

tabListing?.addEventListener("click", () => switchMode("listing"));
tabShop?.addEventListener("click", () => switchMode("shop"));
tabSearch?.addEventListener("click", () => switchMode("search"));

function renderConnection(status) {
  connected = Boolean(status.connected);
  if (connected) {
    stateEl.className = "state-card connected";
    stateEl.innerHTML = `<strong>Connected</strong> · <span class="muted">${status.connection.organizationName || "SellerSalt Org"}</span>`;
    connectBtn.style.display = "none";
    disconnectBtn.style.display = "block";
    mainContentEl.style.display = "block";

    // Check Plan Status
    chrome.runtime.sendMessage({ type: "GET_PLAN_STATUS" }, (res) => {
      if (res?.ok && res.result?.planTier) {
        currentPlanTier = res.result.planTier;
        if (planPillEl) {
          planPillEl.textContent = currentPlanTier;
        }
      }
    });
  } else {
    stateEl.className = "state-card";
    stateEl.innerHTML = `<span class="muted">Pair extension with your SellerSalt web account to enable real-time scoring.</span>`;
    connectBtn.style.display = "block";
    disconnectBtn.style.display = "none";
    mainContentEl.style.display = "none";
  }
}

function refreshConnection() {
  chrome.runtime.sendMessage({ type: "GET_CONNECTION_STATE" }, (response) => {
    renderConnection(response?.ok ? response : { connected: false });
  });
}

connectBtn?.addEventListener("click", () => {
  chrome.tabs.create({ url: WEB_APP_PAIR_URL });
});

disconnectBtn?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "DISCONNECT" }, () => {
    refreshConnection();
  });
});

saveOppBtn?.addEventListener("click", () => {
  if (!connected) return;
  saveOppBtn.disabled = true;
  saveOppBtn.textContent = "Saving to Inbox...";

  chrome.runtime.sendMessage(
    {
      type: "SAVE_OPPORTUNITY",
      payload: {
        listing: {
          listingId: "1429810482",
          title: "Minimalist Leather Card Holder Slim Wallet",
          price: 28.0,
          tags: ["leather card holder", "minimalist wallet", "handmade gift", "slim wallet"],
          shopName: "ArtisanLeatherCo",
        },
        addToPlanner: true,
      },
    },
    (res) => {
      if (res?.ok) {
        saveOppBtn.textContent = "✓ Saved to Opportunity Inbox!";
        setTimeout(() => {
          saveOppBtn.disabled = false;
          saveOppBtn.textContent = "+ Save to Opportunity Inbox & Planner";
        }, 3000);
      } else {
        alert(res?.error || "Save failed.");
        saveOppBtn.disabled = false;
        saveOppBtn.textContent = "+ Save to Opportunity Inbox & Planner";
      }
    }
  );
});

mineKeywordsBtn?.addEventListener("click", () => {
  chrome.tabs.create({ url: `${SELLERSALT_ORIGIN}/keyword-research?q=leather+card+holder` });
});

spyShopBtn?.addEventListener("click", () => {
  chrome.tabs.create({ url: `${SELLERSALT_ORIGIN}/spy?shop=ArtisanLeatherCo` });
});

refreshConnection();
