Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: Current-state factual; future hardening [DECISION
REQUIRED]. MCP (external AI agent access) security requirements are now
[LOCKED] as a first-class concern — see "MCP / external agent access"
below and [architecture/mcp.md](../architecture/mcp.md) for full depth.
The Affiliate Program's fraud-risk surface is also now named as a
first-class concern — see "Affiliate Program security / fraud" below
and [architecture/affiliate.md](../architecture/affiliate.md) for full
depth.

# Security Model

## Authentication

NextAuth v4, JWT session strategy, credentials provider only
(`src/lib/auth.ts`) — email + bcrypt password hash (`bcryptjs`, cost
factor 12 per `src/app/api/signup/route.ts`). No social login/SSO. A
user's session carries `organizationId`/`organizationName` derived at
login from `memberships[0]` — see the single-primary-org caveat in
[architecture/organizations.md](../architecture/organizations.md).

Password reset: `PasswordResetToken` stores a **hash** of the reset
token, never the raw value (same principle as a password hash — a raw DB
read can't be used to reset an account). Team invites
(`Invite`) follow the same `tokenHash` pattern.

## Encryption at rest

`src/lib/encryption.ts` — AES-256-GCM, 32-byte key from
`ENCRYPTION_KEY` (base64-encoded env var), random 12-byte IV per
encryption call, auth tag stored alongside ciphertext (IV + authTag +
ciphertext, base64-encoded, single column value). Used for:
- `Connector.encryptedCredentials` (marketplace research connector
  credentials)
- `SellerChannel.encryptedCredentials` (customer's own store credentials)
- `PaymentProvider.encryptedLiveCredentials` /
  `encryptedSandboxCredentials`
- `EmailSettings.encryptedPassword`
- Any `AppSetting` row with `isSecret: true`

Every credential-bearing table in the schema follows this same pattern —
no plaintext secret storage found in this pass.

## Authorization / access control

Two independent, deliberately simple mechanisms — see
[architecture/rbac.md](../architecture/rbac.md) for the full picture and
its gaps:
1. `Membership.role` (`OWNER`/`ADMIN`/`MEMBER`) — org-scoped.
2. `isAdminEmail()` (`ADMIN_EMAILS` env var allowlist) — platform-level,
   gates `/admin` and all seller-channel routes via `requireAdminOrg()`.

Every data-access query found in this pass filters by `organizationId`
(the standard multi-tenancy pattern) — [VERIFY] this holds with 100%
consistency across all API routes; not exhaustively audited in this
pass, but the pattern is consistent everywhere sampled.

## Webhook verification

Both payment webhook handlers actually verify signatures (not just
trust the payload), per root `CLAUDE.md`:
- Stripe: local HMAC via `stripe.webhooks.constructEvent`.
- PayPal: live verification API call (PayPal has no local HMAC option).

Both are also protected against replay/duplicate-processing via
`PaymentWebhookEvent` idempotency log
(`isDuplicateWebhookEvent()`/`recordWebhookEvent()` in
`src/lib/subscription.ts`).

## OAuth flow security

See [architecture/integrations.md](../architecture/integrations.md) for
full detail. Key points:
- `store-connect-token.ts` — HMAC-SHA256 signed, time-limited (15 min
  default TTL) tokens authenticate OAuth callbacks that don't carry a
  normal session (notably WooCommerce's server-to-server callback).
  Signature comparison uses `crypto.timingSafeEqual` (constant-time,
  avoids timing side-channel).
- Shopify callback verifies Shopify's own HMAC over the callback query
  params.
- All redirect URLs built from `NEXTAUTH_URL`, never `req.url` — a
  correctness fix for Coolify's proxy setup, but also relevant to
  security (prevents a manipulated `Host`-derived redirect).

## Known operational risks (from root `CLAUDE.md` Lessons Learned)

Not code-level gaps, but real incidents worth knowing when touching
infrastructure:
1. Production database's public port has been left open longer than
   intended after a migration before — always verify closure via
   Coolify's UI.
2. Branch/database mismatch caused a real production incident (schema
   migrated against production DB, code only pushed to `staging`
   branch) — always state target branch explicitly for any migration-
   involving change.

## What's explicitly not built (security-relevant)

Per root `CLAUDE.md`: disposable-email blocking, device fingerprinting,
social login, audit log (any admin action history — see
[architecture/rbac.md](../architecture/rbac.md)), real Privacy
Policy/Terms pages (still `mailto:` placeholders — a real legal gap for
a product handling payment data). [DECISION REQUIRED] on priority order
for these.

## MCP / external agent access

**[LOCKED — Decision 4, 2026-08-15]** SellerSalt must support external
AI agents through MCP as a first-class capability. Full architecture,
including the complete Gateway authorization pipeline, tool
classification, and every item below, lives in
[architecture/mcp.md](../architecture/mcp.md#security-model) — this
section is the summary, kept here so this document remains the single
place to check "what are SellerSalt's security requirements" without
needing to already know MCP has its own document.

- **Authentication**: not a browser session — a new token/credential
  scheme, stored hashed (never reversibly encrypted), same principle as
  `PasswordResetToken.tokenHash`/`Invite.tokenHash`. [DECISION REQUIRED]
  on API-key vs. OAuth 2.0; [ASSUMPTION] API-key for v1.
- **Authorization**: a credential can never see or do more than the
  `User` who created it could in the web app — plan entitlement, org
  permission, Client/Cohort/Shop scope, and tool grants are all checked
  per call, not cached.
- **Agency/Institute isolation** — the single highest-risk item: an
  Agency Employee's or Institute Staff member's MCP credential must
  inherit exactly their existing Client/Cohort-scoped `Permission`, never
  the full org roster by default. This is the same risk this document
  already names below ("Recommendation for future account-model work"),
  now doubly motivated by MCP as a second real consumer of that same
  scoping requirement.
- **Tool-level permissions**: a credential's tool grant list defaults to
  the narrowest useful set, never "everything this plan/role allows."
- **Credential lifecycle**: issued in-product by the org itself (never
  by SellerSalt on a customer's behalf), revocable immediately and
  unilaterally, raw value shown once at creation only.
- **Rate limiting**: MCP-specific ceilings, independent of and
  additional to the existing shared platform-wide Etsy research quota
  ([marketplace/etsy.md](../marketplace/etsy.md)) that Etsy-backed tool
  calls still consume downstream.
- **Usage tracking & audit logging**: extends the existing
  `checkLimit()`/`Package` pattern and the same not-yet-built
  Activity/Audit primitive named below and in
  [architecture/rbac.md](../architecture/rbac.md) — not new,
  MCP-specific mechanisms.
- **Suspicious activity handling**: [FUTURE], [DECISION REQUIRED] — no
  security-event logging/alerting exists anywhere in the product today
  (see "What's explicitly not built" above); MCP is named here as a
  future consumer of that capability once built, not a reason to build a
  separate one.
- **Data isolation / least privilege**: MCP does not introduce a new
  isolation model — it is a second, equally strict consumer of the same
  `organizationId` + (once built) `Permission` scoping discipline this
  entire document already requires.

## Affiliate Program security / fraud

**[LOCKED — Decision 5, 2026-08-15]** SellerSalt must have a first-class
Affiliate Program, with a real, auditable commission ledger — which
means real money (commission payouts) becomes reachable through a new
attack surface. Full architecture, including the complete product loop
and ledger design, lives in
[architecture/affiliate.md](../architecture/affiliate.md#security--fraud) —
this section is the summary.

- **No detection algorithms are designed or implemented** in this pass —
  every item below is named as a risk category, not solved.
- **Self-referrals, duplicate accounts, fake signups** — an affiliate
  generating fraudulent conversions to earn commission from themselves.
  First line of defense plausibly lives in the application-approval gate
  and attribution-matching logic, not solved here.
- **Fraudulent payments / chargebacks** — a conversion funded by a
  stolen card; the resulting reversal recovers commission via the
  ledger's reversal mechanism (see
  [Affiliate ledger](../architecture/affiliate.md#affiliate-ledger-event-sourced-not-a-balance-field)),
  but pattern detection *before* payout is unsolved.
- **Cookie manipulation, referral-code abuse** — tampering with or
  gaming the attribution mechanism itself (see
  [architecture/affiliate.md §Attribution architecture](../architecture/affiliate.md#attribution-architecture)).
- **Suspicious conversion patterns** — [FUTURE], a genuine
  data-science problem, not scoped.
- **Manual commission manipulation** — mitigated structurally by the
  ledger's append-only, actor-attributed design (every manual adjustment
  is itself a logged entry, never a silent balance edit) — least-
  privilege for who can create manual adjustments or approve payouts in
  the Admin Affiliate Console follows the same platform-admin RBAC
  direction as every other admin surface (see
  [architecture/rbac.md](../architecture/rbac.md)).
- **Data isolation**: an affiliate can only ever see their own
  performance/ledger data — the Admin Affiliate Console's program-wide
  visibility is a platform-admin permission, never implied by Affiliate
  status itself.

## Recommendation for future account-model work

> **[LOCKED — Decision 1, 2026-08-14]** Agency and Institute are locked
> as distinct domain models sharing `User`/`Organization`/`Membership`/
> `Role`/`Permission`/`Seat`/`Shop`/`ShopConnection`/Activity-Audit
> primitives — see [architecture/organizations.md](../architecture/organizations.md).

The Agency/Institute permission model that gets built from this locked
shape must preserve the existing `organizationId`-scoping discipline —
an agency employee's access to *their* clients' data, specifically, is a
new access-control dimension this system has never needed before
(today, every `organizationId` filter is sufficient because there's no
concept of "some data within my org I can't see"). The new `Permission`
primitive (see [architecture/rbac.md](../architecture/rbac.md)) is what
must carry this — a design that only scopes by `organizationId` and
adds Client/Cohort filtering as an afterthought in application code
(rather than as a first-class permission check) is the specific failure
mode to avoid. This is the single highest-risk area for a data-isolation
bug once the Agency/Institute domain models are implemented — and, per
"MCP / external agent access" above, applies identically to MCP
credentials, not just web-app sessions.
