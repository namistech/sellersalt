# Etsy Integration Readiness & Policy Compliance Audit

**Authoritative Specification: Etsy OpenAPI v3 Integration, OAuth PKCE, Least-Privilege Scopes, Token Storage & Policy Compliance**  
**Version:** 1.0 (Batch 30)  
**Status:** Architecture Complete & Ready for Credentials / Review  

---

## 1. Executive Summary

SellerSalt treats Etsy as its first-class marketplace integration for seller-authorized operations. This document details the technical and policy compliance architecture of the Etsy integration, confirming strict adherence to Etsy API Terms of Use, zero-fabrication requirements, and total architectural separation between public market research and seller-connected private data.

---

## 2. Technical Architecture & Security Baseline

| Dimension | Implementation | Compliance Status |
|---|---|---|
| **API Version** | Etsy OpenAPI v3 | `CODE_VERIFIED` |
| **OAuth Protocol** | OAuth 2.0 with PKCE (Proof Key for Code Exchange) (`code_challenge_method: S256`) | `CODE_VERIFIED` |
| **Redirect URI** | Strictly derived from `NEXTAUTH_URL` server-side (never request headers) | `CODE_VERIFIED` |
| **Requested Scopes** | Least-privilege: `listings_w listings_r shops_r transactions_r` | `CODE_VERIFIED` |
| **Removed Scopes** | `shops_w` (removed), `billing_r` (removed — not a valid Etsy v3 scope) | `CODE_VERIFIED` |
| **Token Storage** | AES-256-GCM encrypted at rest in `SellerChannel.encryptedCredentials` | `CODE_VERIFIED` |
| **Token Refresh** | Automatic token rotation with refresh token expiry handling | `CODE_VERIFIED` |
| **Disconnect Cleanup** | Immediate deletion of OAuth tokens and channel-scoped records | `CODE_VERIFIED` |
| **Rate Limiting** | Strict client-side queue rate limiting (10 req/sec max) via `executeWithRetry` | `CODE_VERIFIED` |
| **Human Gate** | All AI listing studio drafts created in `draft` state requiring human approval | `CODE_VERIFIED` |

---

## 3. Public Market Research vs. Seller-Connected Data Separation

SellerSalt enforces a strict physical and logical boundary between public market intelligence and private seller operations:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA ARCHITECTURE SEPARATION                    │
├──────────────────────────────────┬─────────────────────────────────────┤
│      PUBLIC MARKET RESEARCH      │       SELLER CONNECTED SHOP         │
├──────────────────────────────────┼─────────────────────────────────────┤
│ Source: Public Web & Open Signals│ Source: Official Etsy OpenAPI v3    │
│ Auth: Platform Connector (No OAuth) OAuth: Individual Merchant PKCE   │
│ Persistence: ResearchRun / Prospect│ Persistence: SellerChannel / Orders │
│ Scope: Marketplace Wide Search   │ Scope: Authenticated Store Only     │
│ Zero-Fabrication: Strict Nulls   │ Write: Gated Human Draft Publish    │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 4. Policy & Trademark Disclaimers

The following required disclaimer is rendered across all footer and FAQ surfaces:
> *"The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc."*

---

## 5. Integration Readiness Classification

| Category | Status | Next Required Action |
|---|---|---|
| **Code Implementation** | `IMPLEMENTED` | Complete and verified by automated test suites |
| **OAuth & Token Security**| `IMPLEMENTED` | Tested with PKCE state validation and encryption |
| **Production Credentials**| `READY_FOR_CREDENTIALS` | Enter production `ETSY_CLIENT_ID` and `ETSY_CLIENT_SECRET` |
| **Commercial Review** | `READY_FOR_PLATFORM_REVIEW` | Submit Etsy Developer Commercial API application if required |
