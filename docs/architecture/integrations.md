Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Factual — verified against src/app/api/seller-channels, src/lib

# Integrations

## Config storage pattern — `AppSetting`

All third-party app credentials (OAuth client IDs/secrets, affiliate/
order-form URLs) live in `AppSetting` (`src/lib/app-settings.ts`), never
hardcoded, per root `CLAUDE.md` rule #6. Adding a new configurable value
is a one-line addition to `SETTING_DEFINITIONS` — no migration. Values
marked `isSecret: true` are encrypted at rest (`src/lib/encryption.ts`)
and only decrypted on read via `getSetting()`/`getSettings()`. Current
definitions: `shopify_client_id`/`shopify_client_secret`,
`shopify_affiliate_url`, `netdrix_shopify_order_url`,
`netdrix_woocommerce_order_url`, `etsy_seller_client_id`/
`etsy_seller_client_secret`, `auth_page_logo_url`/`auth_page_image_url`.
Any `*_url` value is normalized to always carry a scheme on save (a
bare-domain paste can't silently produce a broken relative link).

## Seller-channel OAuth flows (admin-only, gated by `requireAdminOrg()`/
`isAdminEmail()`)

All three follow the same shape: a `connect` route builds a redirect to
the platform's authorize URL, a `callback` route completes the exchange
and writes an encrypted `SellerChannel` row, then kicks off an initial
sync via `startSellerChannelSync()` (`src/lib/queue.ts`).

### The `store-connect-token` — why it exists

`src/lib/store-connect-token.ts` is a signed (HMAC-SHA256,
`NEXTAUTH_SECRET`), time-limited (`exp`, default 15 min TTL) token
carrying `{ organizationId, storeUrl, label, codeVerifier?, exp }`. Two
of the three flows need it because their callback isn't a normal
browser redirect carrying a session:

- **WooCommerce**: the callback is called **server-to-server by
  WooCommerce itself** after the store owner approves on their own
  site, with no user session attached. The signed token — echoed back
  as `user_id`, WooCommerce's generic term for an opaque caller-supplied
  value — is the *only* thing authenticating the callback and tying it
  to the right org/store. `crypto.timingSafeEqual` guards signature
  comparison.
- **Etsy-seller (PKCE)**: the token additionally carries `codeVerifier`
  through the redirect so the callback can complete the PKCE token
  exchange.
- **Shopify**: standard OAuth redirect through the user's own browser,
  verified via Shopify's own HMAC scheme on the callback query params
  (every param except `hmac`, per Shopify's documented verification
  method) — [VERIFY] whether Shopify's flow also uses the connect-token
  or relies solely on Shopify's HMAC + session.

### Redirect URL construction — a real gotcha, encoded in comments

Every `connect`/`callback` route builds its own redirect URL from
`NEXTAUTH_URL`, **never** from `req.url`. Comment repeated verbatim
across `woocommerce/connect`, `shopify/connect`, `shopify/callback`,
`etsy/callback`: behind Coolify's proxy, `req.url` reflects the
container's internal address, not the public domain — redirecting off
that sends the browser to a dead address. Any new OAuth-based
integration must follow this same pattern.

### Scopes requested today

- Shopify: `read_orders` (least privilege, matching synced orders capability)
- Etsy-seller: `listings_w listings_r shops_r transactions_r`
- WooCommerce: `read` (least privilege, matching synced orders capability)

### Manual-key fallback

WooCommerce also supports a manual-key entry path (paste consumer
key/secret directly) for stores where the OAuth redirect gets blocked
by security plugins or Cloudflare — per root `CLAUDE.md`. [VERIFY]
exact route; not located by filename in this pass (`woocommerce/route.ts`
if it exists, or handled inline in the channels settings UI).

## Payment provider integrations

See [architecture/billing.md](billing.md) — Stripe (dynamic Checkout
Sessions, local HMAC webhook verification) and PayPal (direct REST,
live API-call webhook verification) are the two live integrations.
`src/lib/payment-providers/get-active-credentials.ts` resolves which
credential set (live vs sandbox) to use per `PaymentProvider.mode`.

## Email integration

`EmailSettings` — single SMTP config (Titan Mail in production per root
`CLAUDE.md`), `src/lib/send-email.ts` sends all transactional email
(password reset, invites, scheduled-search alerts). No template-
management system yet — see gap noted in
[product/product-map.md](../product/product-map.md).

## What's not integrated yet

- eBay (marketplace research) — see
  [architecture/marketplace.md](marketplace.md)
- Safepay, PayFast (payment) — credential storage only
- Any AI provider — see [architecture/ai.md](ai.md)
- Social login / SSO — discussed, not built (root `CLAUDE.md`)
