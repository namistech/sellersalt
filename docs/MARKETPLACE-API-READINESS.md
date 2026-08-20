# SellerSalt Marketplace API Readiness & Compliance Boundaries

Authoritative technical and governance status for Official Marketplace API integrations and Commercial Review preparation.

---

## 1. Governance Boundary Principle

SellerSalt enforces **Source-Agnostic Intelligence + Source-Specific Compliance**.

An official API is an authorized optional data source. Public web acquisition is permitted only on public catalog domains without stealth evasion or CAPTCHA bypass. Connected merchant store data is strictly separated behind OAuth scopes.

---

## 2. Platform Status Matrix

| Platform | Public Web Research | Official API Integration | Connected Store OAuth | Current Status |
|---|---|---|---|---|
| **Etsy** | ALLOWED (Public catalog) | CONDITIONALLY_ALLOWED (Open API v3) | ALLOWED (`listings_w listings_r shops_r transactions_r`) | **REQUIRES_PLATFORM_CONFIRMATION** |
| **Amazon** | ALLOWED (Public catalog) | RESTRICTED (Pending SP-API registration) | RESTRICTED | **DESIGNED** |
| **eBay** | ALLOWED (Public catalog) | RESTRICTED (Pending Developer Account) | RESTRICTED | **DESIGNED** |
| **Walmart** | ALLOWED (Public catalog) | RESTRICTED (Pending Partner Credentials) | RESTRICTED | **DESIGNED** |
| **Shopify** | PROHIBITED (Decentralized) | ALLOWED (Admin REST / GraphQL) | ALLOWED (`read_products`, `read_orders`) | **IMPLEMENTED** |
| **WooCommerce** | PROHIBITED (Self-hosted) | ALLOWED (REST API v3) | ALLOWED (Consumer Key/Secret) | **IMPLEMENTED** |
| **TikTok Shop** | CONDITIONALLY_ALLOWED | RESTRICTED (Pending Partner Credentials) | RESTRICTED | **DESIGNED** |

---

## 3. Etsy Compliance & Application Readiness Checklist

SellerSalt has completed forensic compliance remediation to ensure adherence to Etsy Developer Terms:

| Requirement | Implementation Details | Status |
|---|---|---|
| **Least-Privilege Scopes** | Requests only `listings_w listings_r shops_r transactions_r`. Removed `shops_w` and `billing_r`. | **IMPLEMENTED** |
| **Mandatory Trademark Disclaimer** | Verbatim required disclaimer displayed in footer, FAQ, and policy cards: *"The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc."* | **IMPLEMENTED** |
| **Zero Private Dashboard Scraping** | Prohibited path patterns hard-gated in `SourcePolicyEnforcer` (`etsy.com/your/shops`, `etsy.com/your/account`). | **IMPLEMENTED** |
| **Data Retention Controls** | Snapshots bounded to `Package.maxTrackingDays` via `RetentionGovernanceService`. Disconnect purges OAuth tokens. | **IMPLEMENTED** |
| **Human-in-the-Loop AI Drafts** | AI listing drafts generated in `draft` state; publishing requires explicit human confirmation. | **IMPLEMENTED** |
| **No Surveillance / Spy Wording** | Platform-wide terminology aligned to market intelligence and opportunity discovery. | **IMPLEMENTED** |
| **Etsy Commercial Access Confirmation** | Formal re-application and approval confirmation from Etsy Developer Review. | **PENDING REVIEW** |
