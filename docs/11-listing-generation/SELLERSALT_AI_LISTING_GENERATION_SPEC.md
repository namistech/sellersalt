# SellerSalt — AI Listing Generation Specification

- **Document Version:** 2.0.0
- **Status:** Canonical Specification (Implementation: COMPLETE 2026-08-16)
- **System Classification:** Automated Copywriting & Originality Enforcement

> **Implementation Status [2026-08-16]:**
> - **AI Listing Studio (Phase I)**: `COMPLETE`.
> - **Originality Engine**: `src/services/originality-engine.ts` with Jaccard & N-gram similarity (<15% overlap gate).
> - **AI Copywriter**: `src/services/listing-generation.ts` with multi-provider LLM routing, deterministic title (≤140) & 13-tag (≤20) sanitization.
> - **Studio UI**: `/studio` (`src/app/(dashboard)/studio/page.tsx` & `studio-client.tsx`) with split-screen SEO meter, originality checker, and human review gate.

---

## 1. Executive Purpose & Prompt Engineering

The **AI Listing Generator** inside the Listing Studio (`/studio`) creates complete, high-converting, and SEO-optimized Etsy listing payloads from a `PlannerItem` concept.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STRUCTURED LISTING GENERATION PAYLOAD                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. SEO TITLE (Target: 120–140 characters, max 140 chars)                    │
│    • Front-loads high-intent search terms in the first 40 characters        │
│    • Uses clean pipe (|) or comma delimiters for readability                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. 13 FORMATTED ETSY TAGS (Exactly 13 tags, each ≤ 20 characters)          │
│    • Every tag is a multi-word long-tail phrase                             │
│    • Strictly no punctuation or special characters (Etsy reject prevention) │
│    • Zero duplicate words across tag set                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. STRUCTURED LISTING DESCRIPTION                                           │
│    • Hook: Immediate value proposition in first 160 characters (Google SEO) │
│    • Key Features: Bulleted product specifications and dimensions           │
│    • What's Included: Exact package contents / download formats             │
│    • How to Use: Step-by-step instructions for buyers                       │
│    • Shop Policies & FAQ: Care instructions and copyright notices           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. ATTRIBUTES & MATERIALS                                                   │
│    • Suggested materials list and taxonomy node mapping                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Deterministic Originality Protection

All generated text is evaluated against the source research listing using an automated N-gram and Jaccard similarity validator:
- If similarity exceeds 15% (or more than 4 consecutive words match), the draft is rejected and regenerated automatically with higher lexical temperature.
- Every saved `ListingDraft` records an `originalityScore` (0–100%) and the AI model used.
