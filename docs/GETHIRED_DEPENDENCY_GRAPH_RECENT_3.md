# GetHired — Dependency Graph RECENT 3
**Generated:** 2026-06-26
**Purpose:** Map dependencies between open backlog items — what must be done before what; which items are blocked vs ready

---

## Dependency Graph — Open Items

```
PUBLIC LAUNCH
└── P1-PAYMONGO-ENV (5 min verify) ─── IMMEDIATE UNBLOCK
    └── Code: CLOSED (97cd657)
        └── Env var: OPEN — verify on Linode

SECURITY HARDENING
├── P1-RATE-LIMIT
│   └── BLOCKS: Public endpoint DoS protection; auth brute-force protection
│   └── DEPENDS ON: Nothing — ready to implement
│
├── P1-ESM-ACORN (Interim lint rule)
│   └── BLOCKS: P1-ESM-ACORN-FULL (full migration)
│   └── DEPENDS ON: Nothing — ready to implement
│   └── PARALLEL WITH: P1-RATE-LIMIT
│
└── P1-DEPENDABOT-CRITICAL
    └── BLOCKS: Supply chain security
    └── DEPENDS ON: Nothing — ready to triage
    └── PARALLEL WITH: P1-RATE-LIMIT, P1-ESM-ACORN

DEPLOYMENT HARDENING
└── P2-PM2-ECOSYSTEM
    └── BLOCKS: Safe restart after reboot; onboarding new devs
    └── DEPENDS ON: Nothing — ready to implement
    └── PARALLEL WITH: rate limiting sprint

RELIABILITY
├── P2-POOL-EXHAUSTION
│   └── BLOCKS: Large CSV imports (100+ rows) succeeding
│   └── DEPENDS ON: Nothing — ready
│   └── RELATED: P2-CSV-ROW-CAP (short-term mitigation)
│
├── P2-CSV-ROW-CAP
│   └── BLOCKS: Pool exhaustion from oversized imports
│   └── DEPENDS ON: Nothing — ready (FE-only change)
│   └── NOTE: Ship BEFORE or WITH P2-POOL-EXHAUSTION
│
└── P2-CANDIDATE-SINGULAR
    └── DEPENDS ON: Nothing — ready (XS effort)
    └── LOW PRIORITY — no functional bug, only naming asymmetry

SEO POLISH
├── P2-SSR-VERIFY
│   └── DEPENDS ON: Nothing — verification only; can run today
│   └── PARALLEL WITH: all other items
│
├── P2-COMPANY-SITEMAP
│   └── DEPENDS ON: P2-SSR-VERIFY (verify SSR is working first)
│   └── LOW dependency — can do in parallel
│
├── P2-HERO-CTA
│   └── DEPENDS ON: DEC-V5-03 (decision to convert CTAs)
│   └── DEPENDS ON: DEC-V5-03 confirmed → ready (XS effort)
│
├── P2-SVG-CLS
│   └── DEPENDS ON: Nothing — ready
│
└── P2-LOCALSTORAGE-SSR
    └── DEPENDS ON: Nothing — ready
    └── BLOCKS: Correct SSR rendering of public-search page

ACCESSIBILITY
├── P3-SNACKBAR-ASSERTIVE
│   └── DEPENDS ON: Nothing — ready
│   └── NOTE: Required for WCAG AA on error states
│
├── P3-DIALOG-ALL-FAILED-UX
│   └── DEPENDS ON: Nothing — ready
│   └── RELATED: P3-FAILED-EMAIL-INDICATOR (same dialog)
│
└── P3-REUSABLE-TABLE-MOBILE
    └── DEPENDS ON: Nothing — ready

DX / MAINTAINABILITY
├── P3-TOAST-EXTRACT
│   └── DEPENDS ON: Nothing — ready
│   └── BEST DONE: After P3-TOAST-TESTS are written (tests ensure refactor doesn't break behavior)
│
├── P3-TOAST-TESTS
│   └── DEPENDS ON: Established Angular component testing pattern in FE repo
│   └── CURRENTLY BLOCKED: No test infrastructure in FE dialogs
│
├── P3-BCRYPT-JS
│   └── DEPENDS ON: Nothing — ready (XS)
│
├── P3-AXIOS-1X
│   └── DEPENDS ON: Nothing — ready (requires breaking-change audit)
│
├── P3-DEAD-LOG-CONTACT
│   └── DEPENDS ON: Nothing — ready (XS)
│
├── P3-CANDIDATE-FORM-GUARD
│   └── DEPENDS ON: Nothing — ready (XS)
│
└── P1-ESM-ACORN-FULL (full migration)
    └── DEPENDS ON: P1-ESM-ACORN (lint rule first, then migrate)
    └── RECOMMENDED: Combine with Node 14 → 18 LTS upgrade

DEFERRED FEATURES
├── FEAT-MESSAGES-WIDGET
│   └── BLOCKED BY: No is_read column in DB; no all-threads endpoint
│   └── UNBLOCKED WHEN: BE dev adds column + endpoint
│
├── FEAT-ADMIN-PAGES
│   └── BLOCKED BY: DEC-V5-06 (data model decision)
│
├── FEAT-INDEXING-API
│   └── DEPENDS ON: P1-GSC [CLOSED] — now unblocked
│   └── NEXT STEP: Additional OAuth setup for Indexing API service account
│
└── FEAT-PROGRAMMATIC-SEO
    └── BLOCKED BY: Insufficient job volume (need 5+ per city/category)
    └── UNBLOCKED WHEN: Job volume reaches threshold
```

---

## Items Ready to Start (No Dependencies Blocked)

These items have no dependencies — they can be started immediately in any sprint:

| Item | Priority | Effort | Owner |
|---|---|---|---|
| P1-PAYMONGO-ENV | P1 | XS (5 min) | Paul |
| P1-RATE-LIMIT | P1 | M | BE dev |
| P1-ESM-ACORN (lint rule) | P1 | S | BE dev |
| P1-DEPENDABOT-CRITICAL | P1 | M | BE+FE |
| P2-PM2-ECOSYSTEM | P2 | S | BE/Ops |
| P2-CSV-ROW-CAP | P2 | S | FE dev |
| P2-SSR-VERIFY | P2 | XS | Paul/Ops |
| P2-LOCALSTORAGE-SSR | P2 | XS | FE dev |
| P2-SVG-CLS | P2 | S | FE dev |
| P2-HERO-CTA | P2 | XS | FE dev |
| P3-BCRYPT-JS | P3 | XS | BE dev |
| P3-DEAD-LOG-CONTACT | P3 | XS | FE dev |
| P3-CANDIDATE-FORM-GUARD | P3 | XS | FE dev |

---

## Items With Dependencies / Blockers

| Item | Blocked By |
|---|---|
| P2-POOL-EXHAUSTION | Recommend after P2-CSV-ROW-CAP ships |
| P2-COMPANY-SITEMAP | Should verify SSR first (P2-SSR-VERIFY) |
| P3-TOAST-EXTRACT | Better after P3-TOAST-TESTS written |
| P3-TOAST-TESTS | Needs Angular component testing pattern established |
| FEAT-MESSAGES-WIDGET | BE DB column (is_read) + endpoint needed |
| FEAT-ADMIN-PAGES | DEC-V5-06 data model decision |
| FEAT-INDEXING-API | OAuth setup for Indexing API |
| FEAT-PROGRAMMATIC-SEO | Job volume threshold |
| P1-ESM-ACORN-FULL | Plan after interim lint rule is in place |

---

## Critical Path to Public Launch

```
1. Verify PAYMONGO_WEBHOOK_SECRET on Linode (5 min) → LAUNCH CLEARED

Post-launch hardening (ordered):
2. ESM lint rule (protect BE from syntax breaks)
3. PM2 ecosystem file (protect deploy entry point)
4. Rate limiting (protect auth endpoints)
5. Dependabot critical CVEs (supply chain safety)
6. CSV cap + pool exhaustion (reliability)
7. SSR verify + SEO polish
```
