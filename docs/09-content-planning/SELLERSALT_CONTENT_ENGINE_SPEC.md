# SellerSalt — Content & Social Planning Engine Specification

- **Document Version:** 2.0.0
- **Status:** Canonical Specification
- **System Classification:** Multi-Channel Content Planning & Originality Enforcement

---

## 1. Executive Purpose & Multi-Channel Scope

The **Content Engine** expands SellerSalt from on-platform Etsy listing optimization into full-lifecycle marketing and social content planning. E-commerce success on Etsy is increasingly driven by off-platform traffic (Pinterest search pins, Instagram reels, TikTok product demos). The Content Engine enables sellers to turn a single product concept into an omnichannel launch campaign with guaranteed original content.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     OMNICHANNEL CONTENT GENERATION ENGINE                   │
│                                                                             │
│  CENTRAL PLANNER CONCEPT: "Aesthetic ADHD Daily Digital Planner"            │
│        │                                                                    │
│        ├──► 1. ETSY LISTING ARTIFACTS                                       │
│        │    • Primary SEO Title (138 chars)                                 │
│        │    • 13 Formatted Etsy Tags (all ≤ 20 chars)                       │
│        │    • Structured Listing Description (Features, Compatibility, FAQ) │
│        │    • Suggested Materials & Taxonomy Classification                 │
│        │                                                                    │
│        ├──► 2. PINTEREST MARKETING ARTIFACTS                                │
│        │    • 3 Pin Titles (SEO-focused for Pinterest Visual Search)        │
│        │    • Rich Pin Description with high-intent hashtags                │
│        │    • Pin Overlay Text Ideas (e.g. "Get Organized in 5 Minutes")    │
│        │                                                                    │
│        ├──► 3. SOCIAL MEDIA & VIDEO ARTIFACTS                               │
│        │    • Instagram Carousel Slide Text & Aesthetic Caption             │
│        │    • TikTok / Instagram Reel Hook & 3-Part Video Script            │
│        │                                                                    │
│        └──► 4. ORIGINALITY PROTECTION GATEWAY                               │
│             • N-gram overlap audit against competitor research listing      │
│             • Trademark & prohibited Etsy keyword screening                 │
│                                                                             │
│        ▼                                                                    │
│  CONTENT CALENDAR & PLANNER INTEGRATION                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Originality Protection Layer

To protect sellers from copyright infringement claims, duplicate content penalties, and Etsy listing takedowns, all AI content generation must pass through a strict **Deterministic Originality Filter**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ORIGINALITY PROTECTION PIPELINE                         │
│                                                                             │
│  [ Competitor Research Listing ]          [ AI Generation Draft ]           │
│  (Source Inspiration)                     (SaltBot Output)                  │
│             │                                    │                          │
│             ▼                                    ▼                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    NLP SIMILARITY COMPARATOR                          │  │
│  │  1. Jaccard Token Similarity (Must be < 0.35)                         │  │
│  │  2. Longest Common Substring (Max 4 consecutive words match)          │  │
│  │  3. Unique Value Proposition Verification                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│             ┌──────────────────────┴──────────────────────┐                 │
│             ▼                                             ▼                 │
│   [ Originality Score ≥ 85% ]                   [ Overlap Detected > 15% ]  │
│   STATUS: PASSED                                STATUS: REJECTED            │
│   Action: Save to Draft                         Action: Auto-Regenerate     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Strict Originality Rules:
1. **Never Replicate Competitor Titles**: Competitor title structures are analyzed for keyword intent only; output titles must use a unique syntactical combination.
2. **Never Duplicate Descriptions**: Descriptions must follow SellerSalt's proprietary modular structure (Hook -> Core Benefits -> Technical Specs -> Usage Instructions -> Brand Promise).
3. **Trademark Filtering**: Output is screened against common prohibited e-commerce trademarks (e.g. "Velcro", "Onesie", "Cricut", "Disney").

---

## 3. Content Planning Calendar

The Content Planning calendar (`/planner/calendar`) provides a schedule view for product releases and marketing campaigns:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONTENT CALENDAR VIEW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ < August 2026 > ]   [ Month View ]   [ Week View ]   [ + New Campaign ]  │
│                                                                             │
│  MONDAY 17          TUESDAY 18         WEDNESDAY 19       THURSDAY 20       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │
│  │ 🛍️ Etsy Draft │  │ 📌 Pinterest  │  │ 📱 Instagram  │  │ 🚀 Launch     │ │
│  │ ADHD Planner  │  │ 3 Pins Sched  │  │ Carousel Reel │  │ Etsy Publish  │ │
│  │ Status: Ready │  │ ADHD Focus    │  │ Video Script  │  │ Draft -> Live │ │
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints for Content Planning

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **`POST`** | `/api/content/generate-listing` | Generate original Etsy Title, 13 Tags, and Description with originality score. |
| **`POST`** | `/api/content/generate-social` | Generate Pinterest, Instagram, or TikTok content package for a planner item. |
| **`GET`** | `/api/content/calendar` | Retrieve scheduled content releases and publication milestones. |
| **`POST`** | `/api/content/calendar` | Schedule a content campaign item on the calendar. |
