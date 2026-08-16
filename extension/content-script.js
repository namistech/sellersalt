// Runs only on the SellerSalt web app origins declared in manifest.json's
// content_scripts.matches (never on Etsy pages). Its sole job is relaying
// the pairing code broadcast by /settings/extension into the extension's
// privileged background context over the MV3 messaging boundary — it never
// reads page content, never injects UI, and never runs on Etsy.

const PAIR_MESSAGE_TYPE = "SELLERSALT_EXTENSION_PAIR_CODE";
const PAIR_MESSAGE_SOURCE = "sellersalt-web";

window.addEventListener("message", (event) => {
  // Only accept messages the page sent to itself (never postMessage from
  // an embedded iframe or another origin).
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;

  const data = event.data;
  if (!data || data.source !== PAIR_MESSAGE_SOURCE || data.type !== PAIR_MESSAGE_TYPE) return;
  if (typeof data.code !== "string" || !data.code) return;

  chrome.runtime.sendMessage({
    type: "SELLERSALT_PAIR_CODE_RECEIVED",
    code: data.code,
    origin: window.location.origin,
  });
});
