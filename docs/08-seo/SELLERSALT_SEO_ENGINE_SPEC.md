# SellerSalt — SEO Engine Specification
**Etsy Search Algorithm Diagnostics, Scoring & Optimization**

- **Document Version:** 2.1.0
- **Status:** Canonical Specification (Implementation Status: COMPLETE — 2026-08-16)
- **System Classification:** Algorithmic Audit & Listing Optimization
- **Implementation Modules:** `src/types/seo.ts`, `src/services/seo-engine.ts`, `src/app/api/seo/audit/route.ts`, `src/services/seo-engine-client.ts`, `src/app/(dashboard)/seo/page.tsx`

---

## 1. Executive Purpose & SEO Rubric Philosophy

The **SellerSalt SEO Engine** provides deterministic, transparent, and actionable audits for Etsy listings and shops. It is engineered specifically around the known ranking factors of Etsy's search engine (Etsy Search / Query Matching / Listing Quality Score):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      THE 5 PILLARS OF ETSY SEARCH SEO                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. TITLE KEYWORD PLACEMENT & LENGTH                                         │
│    • High-intent keywords in the first 40 characters                        │
│    • Optimal character utilization (120–140 characters, max 140)            │
│    • Natural phrasing without spammy keyword stuffing                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. 13-TAG COMPLETENESS & STRUCTURE                                          │
│    • Utilization of all 13 available tags (0 tags left blank)               │
│    • Strict character limit compliance (≤ 20 characters per tag)            │
│    • Multi-word long-tail tags (2–3 words) over generic single words        │
│    • Zero duplicate words across tags                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. TITLE & TAG KEYWORD ALIGNMENT (Exact Phrase Matching)                    │
│    • Synergy between primary title phrases and corresponding tag phrases    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. TAXONOMY & ATTRIBUTE COMPLETENESS                                        │
│    • Specific deepest-node taxonomy mapping                                 │
│    • Complete listing attributes (color, occasion, recipient, style)        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. DESCRIPTION STRUCTURE & READABILITY                                      │
│    • Primary keyword integration in the first 160 characters                │
│    • Clear structure (Product Details, Sizing, What's Included, Instructions)│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Listing SEO Scoring Algorithm (0–100 Rubric)

Every listing receives a deterministic **Listing SEO Score (0–100)** where every point gained or lost is fully explainable:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   LISTING SEO SCORE BREAKDOWN (100 PTS MAX)                 │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. TITLE AUDIT (30 Points Max)       │ 2. TAG AUDIT (35 Points Max)         │
│    • Length 120-140 chars: +10 pts   │    • All 13 tags utilized: +15 pts   │
│    • Length 80-119 chars: +5 pts     │    • 10-12 tags used: +8 pts         │
│    • Length <80 or >140: 0 pts       │    • All tags ≤ 20 chars: +10 pts    │
│    • High-intent start (first 40ch): │    • Multi-word tags (≥8 tags):+5 pts│
│      +10 pts                         │    • No duplicate tags: +5 pts       │
│    • Natural comma/pipe delimiter:   │                                      │
│      +10 pts                         │                                      │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 3. TITLE-TAG SYNERGY (15 Points Max) │ 4. ATTRIBUTES & TAXONOMY (10 Pts Max)│
│    • ≥3 exact phrase matches in both │    • Deep taxonomy selected: +5 pts  │
│      title & tags: +15 pts           │    • Key attributes filled: +5 pts   │
│    • 1-2 phrase matches: +8 pts      │                                      │
├──────────────────────────────────────┴──────────────────────────────────────┤
│ 5. DESCRIPTION READABILITY & KEYWORDS (10 Points Max)                       │
│    • Keyword phrase in first 160 characters: +5 pts                         │
│    • Word count ≥ 200 words with structured headings: +5 pts                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. SEO Diagnostic Issue Matrix

The engine evaluates listings against an automated issue catalog, categorized by severity:

| Issue Code | Severity | Trigger Condition | Point Deduction | Actionable Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **`TITLE_TOO_SHORT`** | `HIGH` | Title length `< 70` characters. | -10 pts | "Expand title to 120–140 characters by adding 2–3 long-tail modifier keywords." |
| **`TITLE_TOO_LONG`** | `CRITICAL` | Title length `> 140` characters. | -15 pts (Etsy Reject) | "Shorten title to under 140 characters to prevent Etsy API validation failure." |
| **`UNUSED_TAGS`** | `HIGH` | Tag count `< 13`. | -15 pts | "Add missing tags. Etsy allows 13 tags — you are only using {N}." |
| **`TAG_OVER_LENGTH`** | `CRITICAL` | Any tag length `> 20` characters. | -10 pts (Etsy Reject) | "Shorten tag '{tag}' to 20 characters or fewer." |
| **`SINGLE_WORD_TAGS`** | `MEDIUM` | More than 4 tags contain only 1 word. | -5 pts | "Replace single-word tags with 2–3 word long-tail phrases to attract buyers." |
| **`DUPLICATE_TAGS`** | `MEDIUM` | Identical tag repeated multiple times. | -5 pts | "Remove duplicate tag '{tag}' and replace with an alternative search phrase." |
| **`WEAK_TITLE_TAG_ALIGN`** | `MEDIUM` | Fewer than 2 tags appear in title. | -7 pts | "Align your top 3 title phrases with your tags to maximize exact-match rank." |
| **`NO_DEEP_TAXONOMY`** | `LOW` | Top-level category used instead of sub-node. | -5 pts | "Select the most specific sub-category node available for your product." |

---

## 4. AI-Powered Listing Optimization & Before/After Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OPTIMIZATION & WRITE-BACK WORKFLOW                       │
│                                                                             │
│  1. AUDIT: Scan existing listing (Current Score: 52/100)                    │
│     • Deficiencies: Only 8 tags used, Title is 64 chars, No title-tag match │
│                                                                             │
│  2. AI OPTIMIZE: SaltBot generates proposed improvements                   │
│     • Title: Expands to 134 chars leading with highest-intent search term   │
│     • Tags: Generates complete set of 13 tags (all ≤ 20 chars)              │
│     • Description: Adds keyword-rich introductory hook                      │
│                                                                             │
│  3. BEFORE / AFTER COMPARISON UI:                                           │
│     ┌────────────────────────────────┬────────────────────────────────┐    │
│     │ ORIGINAL LISTING (Score: 52)   │ OPTIMIZED LISTING (Score: 96)  │    │
│     │ • Title: "Leather Journal"     │ • Title: "Custom Leather..."   │    │
│     │ • Tags: 8 used (2 single-word) │ • Tags: 13 used (All long-tail)│    │
│     └────────────────────────────────┴────────────────────────────────┘    │
│                                                                             │
│  4. HUMAN APPROVAL GATE:                                                    │
│     [ ✓ Accept Changes ]  [ ✏️ Edit Manually ]  [ ✕ Reject ]                │
│                                                                             │
│  5. ETSY WRITE-BACK:                                                        │
│     • Option A: Direct API Update (`PATCH /v3/application/.../listings/id`) │
│     • Option B: Browser Extension Overlay directly inside Etsy Shop Manager │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Technical Data Structure: `ListingSeoAuditResult`

```typescript
export interface SeoIssue {
  code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  message: string;
  recommendation: string;
  pointsDeducted: number;
}

export interface ListingSeoAuditResult {
  overallScore: number; // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  metrics: {
    titleLength: number;
    titleScore: number;
    tagCount: number;
    tagScore: number;
    titleTagSynergyCount: number;
    synergyScore: number;
    descriptionScore: number;
    attributeScore: number;
  };
  tagsAnalyzed: Array<{
    tag: string;
    charCount: number;
    isCompliant: boolean;
    wordCount: number;
    isInTitle: boolean;
  }>;
  issues: SeoIssue[];
  optimizedSuggestions?: {
    proposedTitle: string;
    proposedTags: string[];
    proposedDescriptionIntro: string;
    projectedScore: number;
  };
}
```
