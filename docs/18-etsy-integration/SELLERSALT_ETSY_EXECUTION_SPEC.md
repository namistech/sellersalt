# SellerSalt — Etsy API Execution & Write-Back Specification

- **Document Version:** 2.0.0
- **Status:** Canonical Specification (Implementation: COMPLETE 2026-08-16)
- **System Classification:** External Platform Integration & Direct Execution

> **Implementation Status [2026-08-16]:**
> - **Etsy Execution Engine (Phase J)**: `COMPLETE`.
> - **Pre-Flight Validation & Payload Mapper**: `src/services/etsy-execution/mapper.ts` (Title $\le 140$, 13 tags $\le 20$, price, quantity, state: draft).
> - **Execution Service**: `src/services/etsy-execution/execution-service.ts` (`createEtsyDraftListing`, `updateEtsyListing`, `publishEtsyListing`, `getDraftExecutionLogs`).
> - **Human Approval & Publish Gates**: Strict rejection of unapproved drafts, two-step confirmation for live publishing.
> - **Idempotency & Audit Logs**: `EtsyExecutionLog` recording sanitized payloads, HTTP status codes, actor IDs, and retry status.
> - **Studio UI Integration**: `/studio` interactive execution card, Etsy shop manager deep link, and execution audit history drawer.

---

## 1. End-to-End Execution Lifecycle

The **Etsy Execution Engine** enables direct API write-back from SellerSalt into Etsy Shop Manager. It follows a strict 12-stage lifecycle designed for data integrity, error resiliency, and human oversight:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                       THE 12-STAGE ETSY EXECUTION LIFECYCLE                       │
│                                                                                   │
│  1. CONNECT SHOP ──► 2. OAUTH PKCE ──► 3. VERIFY OWNERSHIP ──► 4. SYNC DATA       │
│        │                                                              │           │
│        ▼                                                              ▼           │
│  5. RUN AUDIT ─────► 6. PLANNER WORKBENCH ──► 7. AI DRAFT GEN ────► 8. VALIDATE    │
│        │                                                              │           │
│        ▼                                                              ▼           │
│  9. HUMAN APPROVE ─► 10. CREATE DRAFT ─► 11. UPLOAD IMAGES ──────► 12. PUBLISH    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

1. **CONNECT SHOP**: User initiates PKCE OAuth flow from `/settings/channels`.
2. **OAUTH PKCE**: Grants `listings_r`, `listings_w`, `shops_r`, `shops_w`, `transactions_r`, `billing_r` scopes.
3. **VERIFY OWNERSHIP**: Calls `GET /v3/application/users/{userId}/shops` to confirm authorized ownership of the target shop ID.
4. **SYNC DATA**: Fetches existing active listings, receipts, and taxonomy metadata.
5. **RUN AUDIT**: SEO diagnostic engine scans catalog for optimization opportunities.
6. **PLANNER WORKBENCH**: Seller creates or selects a `PlannerItem`.
7. **AI DRAFT GEN**: SaltBot drafts original Title (≤140 ch), 13 Tags (≤20 ch), Description, and Materials.
8. **VALIDATE**: Deterministic payload pre-flight checks against Etsy API validation rules.
9. **HUMAN APPROVE**: Explicit user review in the UI (**Mandatory Gate — No Silent Publishing**).
10. **CREATE DRAFT**: `POST /v3/application/shops/{shop_id}/listings` with `state: "draft"`.
11. **UPLOAD IMAGES**: Sequential image uploads via `POST /v3/application/shops/{shop_id}/listings/{listing_id}/images`.
12. **PUBLISH (Optional)**: If explicitly confirmed, update listing state to `active` via `PATCH /v3/application/.../listings/{listing_id}`.

---

## 2. Mandatory Human Approval Gate & Anti-Silent-Publish Policy

### Absolute Policy:
**SellerSalt will NEVER automatically or silently publish AI-generated content to a live Etsy store without explicit human review and confirmation.**

- All listings pushed from SellerSalt default to `state: "draft"`.
- Drafts appear in the seller's Etsy Shop Manager under "Drafts" for final visual verification before going live.
- If a future power-user feature enables direct "Publish Live", it must require a two-step explicit confirmation dialog per listing or batch.

---

## 3. Etsy API Write Endpoints & Payloads

### 3.1 Create Listing Draft
- **Method / Endpoint**: `POST /v3/application/shops/{shop_id}/listings`
- **Headers**: `Authorization: Bearer {accessToken}`, `x-api-key: {apiKey}`, `Content-Type: application/json`
- **Request Payload**:
```json
{
  "quantity": 999,
  "title": "Minimalist Leather Passport Holder, Personalized Travel Wallet for Men, Custom Monogram Gift for Travelers",
  "description": "Crafted from premium full-grain leather...",
  "price": 28.00,
  "who_made": "i_did",
  "when_made": "2020_2026",
  "taxonomy_id": 1234,
  "tags": [
    "passport holder",
    "leather passport case",
    "travel wallet",
    "personalized gift",
    "custom monogram",
    "travel accessories",
    "leather gifts for him",
    "groomsmen travel gift",
    "slim passport cover",
    "handmade leather",
    "vacation essentials",
    "minimalist wallet",
    "passport sleeve"
  ],
  "materials": ["Full Grain Leather", "Waxed Thread"],
  "is_supply": false,
  "is_customizable": true,
  "state": "draft"
}
```

### 3.2 Upload Listing Image
- **Method / Endpoint**: `POST /v3/application/shops/{shop_id}/listings/{listing_id}/images`
- **Payload**: `multipart/form-data` with `image` file and `rank` (1 to 10).

### 3.3 Update Existing Listing (SEO Optimization)
- **Method / Endpoint**: `PATCH /v3/application/shops/{shop_id}/listings/{listing_id}`
- **Payload**: Partial update containing revised `title`, `tags`, or `description`.

---

## 4. Idempotency & Audit Logging

Every write operation executed against Etsy Open API v3 is recorded in the `EtsyExecutionLog` database table:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ETSY EXECUTION AUDIT RECORD                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Execution ID:       exec_987654321                                        │
│ • Organization:       org_abc123                                            │
│ • Target Shop ID:     shop_55443322                                         │
│ • Action Type:        CREATE_DRAFT_LISTING                                  │
│ • Idempotency Key:    draft_push_cuid_1723812345                            │
│ • Status Code:        201 Created                                           │
│ • Etsy Listing ID:    1847291039                                            │
│ • Actor:              user@example.com (User Triggered)                     │
│ • Timestamp:          2026-08-16T10:15:30Z                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Idempotency Strategy:
1. Every write request generates a unique `idempotencyKey` based on `listingDraftId` and timestamp.
2. In the event of a network timeout or retry, the execution service checks whether an execution record already succeeded for that key to prevent duplicate listing creation.
