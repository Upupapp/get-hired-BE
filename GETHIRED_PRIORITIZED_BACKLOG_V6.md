# GETHIRED — Prioritized Backlog V6
**Generated:** 2026-07-01
**FE HEAD:** e828f7b | **BE HEAD:** 98b4bfb
**Baseline:** V5 backlog + V6 context updates (LinkedIn OIDC, company modal, sign-out, cert/license, Google Auth all COMPLETE)

---

## Full Backlog Table

| ID | Title | Status | Priority | Owner | Effort | Source |
|----|-------|--------|----------|-------|--------|--------|
| **P0-FIREBASE** | Firebase service account key in git history | OPEN | P0 | User-action | XL | SECURE, multiple sessions |
| **GH-ACT-091** | PayMongo Webhook Secret env var — confirm on Linode | OPEN | P0 | User-action | XS | V6 context, SECURE V5 |
| **P1-OG-IMAGE** | OG image `gethired-og-default.png` missing | OPEN | P1 | User-action/Design | S | SEO, ACTIONS |
| **P1-GSC** | Google Search Console property verification + sitemap submission | OPEN | P1 | User-action | XS | SEO |
| **P1-PAT** | GitHub PAT for Linode `git pull` expired | OPEN | P1 | User-action | XS | SWEEP, ops |
| **ACT-004** | Wire ProfileQualityService into Applicant Dashboard | OPEN | P1 | FE | M | ACTIONS V5 |
| **ACT-005** | Add JobPosting JSON-LD to /jobs/:id | OPEN | P1 | FE | XS | ACTIONS V5, SEO |
| **ACT-012** | Easy Job Post Extraction Per-User Rate Limit | OPEN | P1 | BE | S | ACTIONS V5, SECURE |
| **P1-RATE-LIMIT** | Tiered rate limiting on all write endpoints | OPEN | P1 | BE | M | SWEEP, SECURE |
| **P1-PAYMONGO-ENV** | Confirm `PAYMONGO_WEBHOOK_SECRET` env var on Linode | OPEN | P1 | User-action | XS | ACTIONS (code wired, env unverified) |
| **ACT-008** | Add noindex to Role Classification Page | OPEN | P2 | FE | XS | ACTIONS V5, SEO |
| **ACT-009** | Messages Widget is_read + All-Threads Endpoint | OPEN | P2 | BE+FE | L | GH1 checkpoint, deferred |
| **ACT-010** | Add provider column to user_credentials | OPEN | P2 | BE | S | ACTIONS V5 |
| **ACT-011 / GH-ACT-092** | Google One Tap (FedCM) | OPEN | P2 | FE | S | ACTIONS V5 (defer until OAuth fully QA'd) |
| **ACT-014** | CV Doctor FE Wiring | OPEN | P2 | FE | L | ACTIONS V5 |
| **ACT-015** | Applicant Profile Grading UI | OPEN | P2 | FE | M | ACTIONS V5 |
| **ACT-016** | Canonical URL Meta + Sitemap.xml | OPEN | P2 | FE+BE | S | ACTIONS V5, SEO |
| **ACT-017** | Node.js 14 Migration Plan | OPEN | P2 | BE | XL | ACTIONS V5, SWEEP |
| **ACT-018** | Automated Test Suite for Critical Paths | OPEN | P2 | BE+FE | XL | ACTIONS V5, TEST |
| **GH-ACT-088** | LinkedIn Unlink UI — Account Settings Component | OPEN | P2 | FE | M | V6 context |
| **GH-ACT-089** | LinkedIn Error Page Polish | OPEN | P2 | FE | S | V6 context |
| **P2-POOL-EXHAUSTION** | DB pool exhaustion on large bulk CSV imports (max: 10) | OPEN | P2 | BE | M | OPTIMIZE |
| **P2-CSV-ROW-CAP** | No CSV import row count cap in any import component | OPEN | P2 | FE+BE | S | OPTIMIZE |
| **P2-SSR-VERIFY** | Verify Angular Universal SSR is actually serving in production | OPEN | P2 | Ops | XS | SEO |
| **P2-COMPANY-SITEMAP** | Company pages not included in sitemap.xml | OPEN | P2 | BE | S | Backlog legacy |
| **P2-HERO-CTA** | Employer info page CTAs not crawlable `<a>` tags | OPEN | P2 | FE | XS | Backlog legacy |
| **P2-SOFT-404** | Soft 404: expired/unknown jobs return HTTP 200 from SSR | OPEN | P2 | FE+BE | S | Backlog legacy |
| **P2-SVG-CLS** | SVG images without explicit width/height attributes (CLS) | OPEN | P2 | FE | S | Backlog legacy |
| **P2-LOCALSTORAGE-SSR** | `localStorage` in PublicSearchComponent without `isPlatformBrowser` | OPEN | P2 | FE | XS | Backlog legacy |
| **GH-ACT-090** | Modal Acknowledgement Persistence to DB | OPEN | P3 | BE+FE | S | V6 context |
| **ACT-019** | Video CV Public Display | OPEN | P3 | FE | L | ACTIONS V5 |
| **ACT-020** | Job Seeker Match Score Wiring | OPEN | P3 | FE | M | ACTIONS V5 |
| **P3-SNACKBAR-ASSERTIVE** | `danger-snackbar` should use `aria-live="assertive"` | OPEN | P3 | FE | M | NOTIFY, a11y |
| **P3-DIALOG-ALL-FAILED-UX** | Keep invite dialog open on all-failed | OPEN | P3 | FE | S | NOTIFY |
| **P3-FAILED-EMAIL-INDICATOR** | Per-item failure indicator in partial-success invite list | OPEN | P3 | FE | S | NOTIFY |
| **P3-TOAST-TESTS** | Unit tests for toast outcome logic in 3 import-add dialogs | OPEN | P3 | FE | M | TEST |
| **P3-BCRYPT-JS** | `bcrypt` → `bcryptjs` | OPEN | P3 | BE | XS | Backlog legacy |
| **P3-AXIOS-1X** | `axios` 0.x → 1.x | OPEN | P3 | BE | S | Backlog legacy |
| **P3-TOAST-EXTRACT** | Extract duplicated toast decision logic into shared utility | OPEN | P3 | FE | M | OPTIMIZE |
| **P3-DEAD-LOG-CONTACT** | Dead snackbar branches in contact/candidate list components | OPEN | P3 | FE | XS | NOTIFY |
| **P3-CANDIDATE-FORM-GUARD** | `importCandidateForm` uninitialized until CSV upload | OPEN | P3 | FE | XS | TEST, STITCH |
| **P3-CANDIDATE-SINGULAR** | Bulk candidate import `candidate` (singular) field asymmetry | OPEN | P3 | BE+FE | XS | STITCH |
| **P3-REUSABLE-TABLE-MOBILE** | `reusable-table.component` hides table on mobile with no fallback | OPEN | P3 | FE | M | MOBILEVIEW |
| **FEAT-MESSAGES-WIDGET** | Employer dashboard messages widget (is_read + threads endpoint) | DEFERRED | — | BE+FE | L | GH1 checkpoint |
| **FEAT-ADMIN-PAGES** | Admin companies + reports pages | DEFERRED | — | BE+FE | XL | Backlog |
| **FEAT-INDEXING-API** | Google Indexing API integration | DEFERRED | — | BE | L | SEO (blocked on P1-GSC) |
| **FEAT-PROGRAMMATIC-SEO** | Programmatic SEO landing pages | DEFERRED | — | FE+BE | XL | SEO (needs job volume) |

---

## Closed Items (History — Do Not Delete)

| ID | Title | Closed | Commit/Session |
|----|-------|--------|----------------|
| ACT-001 | Create new OAuth web client | CLOSED | Session 2026-07-01 |
| ACT-002 | Update environment files with new Client ID | CLOSED | Session 2026-07-01 |
| ACT-003 | Deploy requestUri fix to Linode | CLOSED | BE=98b4bfb |
| ACT-006 | PayMongo Webhook Signature Verification (code) | CLOSED | Commit 97cd657 |
| ACT-007 | CORS Allowlist | CLOSED | Commit d4e34c7 |
| LINKEDIN-OIDC | LinkedIn OAuth sign-in | CLOSED | Session 2026-07-01 |
| COMPANY-MODAL | Company setup success modal | CLOSED | Session 2026-07-01 |
| SIGNOUT-FIX | Employer panel sign-out | CLOSED | Session 2026-07-01 |
| CERT-LICENSE | Job cert/license requirements feature | CLOSED | Session 2026-07-01 |
| NOTIFY-P2-BUG-01 | Company user invite false-positive success toast | CLOSED | Commit 1863842 |
| NOTIFY-P2-BUG-02 | Single contact add success toast on duplicate | CLOSED | Commits 2ff6358/1863842 |
| NOTIFY-P2-BUG-03 | Single candidate add success toast on duplicate | CLOSED | Commits 2ff6358/1863842 |
| NOTIFY-P2-STRUCT-01 | forEach(async) → Promise.allSettled (contacts/candidates) | CLOSED | Commit 2ff6358 |
| P2-CANDIDATE-SCOPE | Cross-tenant candidate email oracle | CLOSED | Commit d5bba41 |
| P2-CREATEGROUP-FOREACH | createGroup/updateGroup broken forEach | CLOSED | Commit 25f5e17 |
| P2-INTERVIEW-FOREACH | interview.service.js broken forEach | CLOSED | Commit 25f5e17 |
| SEC-TOKEN-01 | Raw Firebase error in 403 response | CLOSED | Commit 6a7755c |
| SEC-DEAD-01 | isMobileViewAllowed dead code | CLOSED | Commit 94e4d39 |

---

## Status Summary V6

| Category | Count |
|---|---|
| OPEN — P0 | 2 |
| OPEN — P1 | 8 |
| OPEN — P2 | 19 |
| OPEN — P3 | 13 |
| DEFERRED features | 4 |
| **Total OPEN** | **42** |
| Closed this sprint + prior | 18+ |
