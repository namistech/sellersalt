// The only SellerSalt web app origins the extension will ever trust a
// pairing message or send a token to. Must stay in sync with manifest.json's
// host_permissions / content_scripts matches. This is a security allowlist,
// not an environment switch — do not remove an entry to "target" one
// environment; use SELLERSALT_ORIGIN below for that instead.
export const ALLOWED_ORIGINS = [
  "https://sellersalt.com",
  "https://staging.sellersalt.com",
  "http://localhost:3000",
];

export function isAllowedOrigin(origin) {
  return typeof origin === "string" && ALLOWED_ORIGINS.includes(origin);
}

// The single origin "Connect to SellerSalt" opens a pairing tab to (see
// sidepanel.js). Once paired, every subsequent API call uses whichever
// origin the pairing actually happened against (returned by the server
// and cached in the connection state) — this constant only controls
// where a *fresh, unpaired* install starts pairing from.
//
// Chrome extensions have no build-time env substitution, so this unpacked
// QA build is pinned to staging by editing this one line. Must always be
// one of ALLOWED_ORIGINS above. Change back to "https://sellersalt.com"
// before packaging a production/Chrome Web Store build.
export const SELLERSALT_ORIGIN = "https://staging.sellersalt.com";
