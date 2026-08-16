# SellerSalt — Internal API Route Contracts

- **Document Version:** 2.0.0
- **Status:** Canonical Route Specification
- **Scope:** Complete API Surface Definition

---

## 1. Authentication & Security Routes (`/api/auth/*` & `/api/settings/*`)
- `POST /api/auth/forgot-password`: Issues password reset token.
- `POST /api/auth/reset-password`: Verifies token and resets bcrypt hash.
- `GET /api/auth/verify-email`: Verifies token and sets `User.emailVerified`.
- `POST /api/settings/2fa/totp`: Configures TOTP secret and generates client QR code.
- `POST /api/settings/passkeys/register/options`: Initiates WebAuthn registration options.
- `POST /api/settings/passkeys/register/verify`: Validates WebAuthn credential and saves to DB.

## 2. Research & Discovery Routes (`/api/*`)
- `GET /api/prospects`: Fetches paginated prospects with filters.
- `GET /api/prospects/export`: Exports prospects to CSV.
- `GET /api/trends`: Returns historical rising keywords and listings.
- `POST /api/shops/resolve`: Resolves pasted Etsy shop URL to shop External ID.
- `GET /api/shops/[shopExternalId]`: Full shop intelligence profile with extracted keywords.
- `POST /api/shops/[shopExternalId]/track`: Starts `ShopWatch` tracking.
- `DELETE /api/shops/[shopExternalId]/track`: Stops tracking.
- `GET /api/shops/tracked`: Lists all active tracked shops.
- `POST /api/keywords/search`: Live standalone keyword search against Etsy and external volume.

## 3. Planner & AI Studio Routes (`/api/planner/*` & `/api/assistant/*`)
- `GET /api/planner/items`: Lists workspace planner cards.
- `POST /api/planner/items`: Creates planner item from research.
- `PATCH /api/planner/items/[id]`: Updates planner item strategy or status.
- `POST /api/content/generate-listing`: Generates original title, 13 tags, and description.
- `POST /api/assistant/chat`: SaltBot conversational copilot with dynamic tool execution.

## 4. Etsy Execution & Channels (`/api/seller-channels/*`)
- `GET /api/seller-channels`: Lists connected seller channels.
- `GET /api/seller-channels/etsy/connect`: Initiates Etsy PKCE OAuth flow.
- `GET /api/seller-channels/etsy/callback`: Exchanges token, validates shop ownership, and links channel.
- `POST /api/seller-channels/[id]/sync`: Triggers manual receipt/order sync.
- `POST /api/seller-channels/etsy/create-draft`: Pushes approved draft to Etsy Shop Manager.

## 5. Billing & Admin Routes (`/api/billing/*` & `/api/admin/*`)
- `POST /api/billing/checkout`: Creates Stripe dynamic checkout or PayPal subscription session.
- `POST /api/webhooks/stripe`: Verifies Stripe HMAC signature and activates subscription.
- `POST /api/webhooks/paypal`: Verifies PayPal live signature and processes events.
- `GET /api/admin/users`: Admin user listing with email change and verification actions.
- `GET /api/admin/ai-providers`: Admin AI provider registry with test connection & model refresh actions.
