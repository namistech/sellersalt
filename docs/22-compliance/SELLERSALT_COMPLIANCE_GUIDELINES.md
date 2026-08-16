# SellerSalt — Legal & Regulatory Compliance Guidelines

- **Document Version:** 2.0.0
- **Status:** Canonical Compliance Reference
- **Governing Policies:** Etsy API Terms of Use, GDPR/CCPA, Chrome Web Store Developer Agreement

---

## 1. Etsy API Terms of Use Compliance

1. **No Scraping**: SellerSalt accesses public data strictly via official Open API v3 endpoints with registered API credentials and queue-enforced rate limiting (max 8 req/sec).
2. **No Data Re-Sale**: Raw Etsy marketplace data is never exported as an independent database or sold to third parties.
3. **No Fabricated Data**: Metrics are rigorously labeled (`[ACTUAL]`, `[ESTIMATED]`, `[SELLERSALT SCORE]`, `[EXTERNAL DATA]`).
4. **Token Security**: OAuth access tokens and refresh tokens are encrypted at rest using AES-256-GCM.

---

## 2. Privacy & PII Protection (GDPR / CCPA)

1. **Buyer Anonymization**: Receipt syncs from connected shops never store buyer names, physical shipping addresses, or phone numbers. Only financial order amounts, currency codes, and transaction timestamps are persisted.
2. **Account Deletion & Data Portability**: Users can request complete workspace deletion (`DELETE /api/settings/profile`) which cascades across all owned records.
