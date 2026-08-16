# SellerSalt — Customer Navigation & Information Architecture

- **Document Version:** 2.0.0
- **Status:** Canonical Navigation Specification
- **Design System Alignment:** Light Theme, Clean Editorial SaaS Structure

---

## 1. Information Architecture Philosophy

The SellerSalt navigation structure is designed directly around the **E-Commerce Scaling Product Loop**:
`DISCOVER -> RESEARCH -> PLAN -> CREATE -> OPTIMIZE -> EXECUTE -> MEASURE`

It eliminates disjointed tool dashboards and groups features into intuitive, workflow-driven clusters:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SELLERSALT PRIMARY SIDEBAR NAVIGATION                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  🧭 DISCOVER                                                                │
│  ├── Discovery Hub           (/discovery)      - Central intelligence feed  │
│  ├── Product Hunting         (/radar)          - High-velocity niche radar  │
│  ├── Shop Hunting & Spy      (/spy)            - Reverse-engineer shops     │
│  ├── Category Hunting        (/categories)     - Etsy taxonomy explorer     │
│  └── Keyword Research        (/keyword-research)- On-demand search explorer │
│                                                                             │
│  📋 PLANNER & WORKBENCH                                                     │
│  ├── All Plans & Workbenches (/planner)        - Unified Kanban board       │
│  ├── Keyword Clusters        (/planner/keywords)- 13-tag cluster manager     │
│  ├── Content Calendar        (/planner/calendar)- Social & release calendar │
│  └── Favorites & Shortlists  (/favorites)      - Bookmarked opportunities   │
│                                                                             │
│  ⚡ OPTIMIZE & EXECUTE                                                      │
│  ├── AI Listing Studio       (/studio)         - SaltBot 140ch/13tag creator│
│  ├── SEO Diagnostics         (/seo-audit)      - Listing 0-100 rubric       │
│  ├── Shop Health & Growth    (/shop-health)    - Store audit & action plan  │
│  └── Etsy Execution Manager  (/execution)      - Draft push & sync manager  │
│                                                                             │
│  📊 STORE ANALYTICS & PROFIT                                                │
│  ├── Revenue & Profit        (/analytics)      - True net profit waterfall  │
│  ├── Profit Calculator       (/calculator)     - Unit economics simulator   │
│  └── Competitor Tracking     (/spy/tracked)    - Longitudinal sales delta   │
│                                                                             │
│  ⚙️ WORKSPACE & OPERATIONS                                                  │
│  ├── Search Streams          (/connectors)     - Automated search configs   │
│  ├── Scraper Jobs            (/jobs)           - Background worker logs     │
│  ├── Connected Shops         (/settings/channels)- Etsy OAuth store links   │
│  ├── Billing & Subscription  (/settings/billing)- Plan management          │
│  └── Settings                (/settings)       - Account & security         │
│                                                                             │
│  🤖 COPILOT (Always Accessible)                                             │
│  └── SaltBot AI Assistant    (Floating Drawer & Omnipresent Command Bar)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Topbar & Header Navigation Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TOPBAR LAYOUT DESIGN                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ [ Logo: SellerSalt ] | [ Workspace Switcher ▾ ] | [ Global Search (⌘K)    ] │
│                                                                             │
│ Right Actions:                                                              │
│ [ ⚡ Quick Add to Planner ] | [ 🔔 Notifications ] | [ User Avatar ▾ ]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Global Command Palette (`⌘K` / `Ctrl+K`)
Enables instantaneous navigation and actions across the entire platform:
- Jump to any tracked shop or saved prospect.
- Trigger a new arbitrary keyword search.
- Launch SaltBot with a pre-populated command (e.g. `"Audit listing..."`).
- Switch organizations or access settings.
