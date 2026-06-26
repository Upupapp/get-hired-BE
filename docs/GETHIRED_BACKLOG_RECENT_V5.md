# GetHired — Prioritized Backlog V5
> Generated: GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5
> FE HEAD: `41b5920` | BE HEAD: `6a7755c`
> QA cycle scope: NOTIFY-P2 + post-NOTIFY-P2 sweep (QA cycles through 2026-06-26)

---

## Full Backlog Table

| ID | Title | Status | Priority | Owner | Effort | Source |
|----|-------|--------|----------|-------|--------|--------|
| **P0-FIREBASE** | Firebase service account key in git history | OPEN | P0 | User-action | XL | SECURE, multiple sessions |
| **P1-OG-IMAGE** | OG image `gethired-og-default.png` missing | OPEN | P1 | User-action/Design | S | SEO, ACTIONS |
| **P1-GSC** | Google Search Console property verification + sitemap submission | OPEN | P1 | User-action | XS | SEO |
| **P1-PAT** | GitHub PAT for Linode `git pull` expired | OPEN | P1 | User-action | XS | SWEEP, ops |
| **P1-PAYMONGO-ENV** | Confirm `PAYMONGO_WEBHOOK_SECRET` env var on Linode | OPEN | P1 | User-action | XS | ACTIONS (code is wired) |
| **P1-RATE-LIMIT** | No rate limiting on any write endpoint (repo-wide) | OPEN | P1 | BE | M | SWEEP, SECURE |
| **P2-CANDIDATE-SCOPE** | `checkEmailIfExistInCandidate` global scope — cross-tenant oracle | CLOSED | — | — | — | SECURE; FIXED in d5bba41 |
| **P2-CREATEGROUP-FOREACH** | `createGroup`/`updateGroup` broken `forEach(async)` | CLOSED | — | — | — | NOTIFY; FIXED in 25f5e17 |
| **P2-INTERVIEW-FOREACH** | `interview.service.js` broken `forEach(async)` | CLOSED | — | — | — | SWEEP; FIXED in 25f5e17 |
| **P2-POOL-EXHAUSTION** | DB pool exhaustion on large bulk CSV imports (max: 10) | OPEN | P2 | BE | M | OPTIMIZE |
| **P2-CSV-ROW-CAP** | No CSV import row count cap in any import component | OPEN | P2 | FE+BE | S | OPTIMIZE |
| **P2-SSR-VERIFY** | Verify Angular Universal SSR is actually serving in production | OPEN | P2 | Ops | XS | SEO |
| **P2-COMPANY-SITEMAP** | Company pages not included in sitemap.xml | OPEN | P2 | BE | S | BACKLOG legacy |
| **P2-HERO-CTA** | Employer info page CTAs not crawlable `<a>` tags | OPEN | P2 | FE | XS | BACKLOG legacy |
| **P2-SOFT-404** | Soft 404: expired/unknown jobs return HTTP 200 from SSR | OPEN | P2 | FE+BE | S | BACKLOG legacy |
| **P2-SVG-CLS** | SVG images without explicit width/height attributes (CLS) | OPEN | P2 | FE | S | BACKLOG legacy |
| **P2-LOCALSTORAGE-SSR** | `localStorage` in PublicSearchComponent without `isPlatformBrowser` | OPEN | P2 | FE | XS | BACKLOG legacy |
| **P3-SNACKBAR-ASSERTIVE** | `danger-snackbar` should use `aria-live="assertive"` | OPEN | P3 | FE | M | NOTIFY, a11y |
| **P3-DIALOG-ALL-FAILED-UX** | Keep invite dialog open (inline error) when all invites fail | OPEN | P3 | FE | S | NOTIFY |
| **P3-FAILED-EMAIL-INDICATOR** | Show failed-email indicator per item in partial-success invite list | OPEN | P3 | FE | S | NOTIFY |
| **P3-TOAST-TESTS** | Unit tests for toast outcome logic in 3 import-add dialog components | OPEN | P3 | FE | M | TEST |
| **P3-BCRYPT-JS** | `bcrypt` → `bcryptjs` (avoid native binaries on Node 14) | OPEN | P3 | BE | XS | BACKLOG legacy |
| **P3-AXIOS-1X** | `axios` 0.x → 1.x (CVE + breaking-change housekeeping) | OPEN | P3 | BE | S | BACKLOG legacy |
| **P3-TOAST-EXTRACT** | Extract duplicated toast decision logic into shared utility | OPEN | P3 | FE | M | OPTIMIZE |
| **P3-DEAD-LOG-CONTACT** | `contact-list.component` / `candidate-list.component` dead `success` state snackbar branches | OPEN | P3 | FE | XS | NOTIFY |
| **P3-CANDIDATE-FORM-GUARD** | `importCandidateForm` uninitialized until CSV upload — latent throw risk | OPEN | P3 | FE | XS | TEST, STITCH |
| **P3-CANDIDATE-SINGULAR** | Bulk candidate import uses `candidate` (singular) field vs `contacts` (plural) — asymmetry risk | OPEN | P3 | BE+FE | XS | STITCH (informational) |
| **P3-REUSABLE-TABLE-MOBILE** | `reusable-table.component` hides table on mobile with no card fallback | OPEN | P3 | FE | M | MOBILEVIEW |
| **FEAT-MESSAGES-WIDGET** | Messages widget — employer dashboard (is_read column + all-threads endpoint missing) | DEFERRED | — | BE+FE | L | GH1 checkpoint |
| **FEAT-ADMIN-PAGES** | Admin companies + reports pages | DEFERRED | — | BE+FE | XL | backlog |
| **FEAT-INDEXING-API** | Google Indexing API integration | DEFERRED | — | BE | L | SEO (blocked on P1-GSC) |
| **FEAT-PROGRAMMATIC-SEO** | Programmatic SEO landing pages ("Jobs in Manila", etc.) | DEFERRED | — | FE+BE | XL | SEO |

---

## Status Summary

| Category | Count |
|---|---|
| OPEN — P0 | 1 |
| OPEN — P1 | 5 |
| OPEN — P2 | 9 |
| OPEN — P3 | 10 |
| DEFERRED features | 4 |
| **Total OPEN** | **25** |
| Closed this sprint (not listed above) | 20+ |

---

## Items Closed This Sprint (2026-06-26 QA cycle)

| Item | Commit | Description |
|---|---|---|
| NOTIFY-P2-BUG-01 | 1863842 | Company user invite: false-positive success toast on all-failed |
| NOTIFY-P2-BUG-02 | 2ff6358 / 1863842 | Single contact add: success toast on duplicate |
| NOTIFY-P2-BUG-03 | 2ff6358 / 1863842 | Single candidate add: success toast on duplicate + wrong copy |
| NOTIFY-P2-STRUCT-01 | 2ff6358 | forEach(async) in multipleContact/multipleCandidate → Promise.allSettled |
| verifyAuth raw error leak | 6a7755c | Raw Firebase error redacted from 403 response body |
| createGroup/updateGroup forEach | 25f5e17 | Promise.allSettled fix for group management controllers |
| interview.service.js forEach | 25f5e17 | Promise.allSettled fix for interview invite email flow |
| checkEmailIfExistInCandidate cross-tenant | d5bba41 | Added company_id scope to candidate duplicate check |
| sameAs: [] empty array | 94e4d39 | Omit sameAs when no social URLs exist in Organization JSON-LD |
| applicant.service.ts ?id= param | 94e4d39 | Removed dead query param (BE derives from JWT) |
| isMobileViewAllowed dead code | 94e4d39 | Removed from all route data + auth guard |
| Browse jobs crawlable links | 94e4d39 | 3 CTAs converted from `(click)` to `<a routerLink>` |
| Job detail breadcrumb UI | 41b5920 | Visual breadcrumb nav added above job banner |
| Error-state noindex | 41b5920 | Subscribe to jobError$, set noindex meta tag |
| success-snackbar missing color | 5ea4466 | Added `color: #ffffff` to .success-snackbar |
| warning-snackbar WCAG contrast | 5ea4466 | #f59e0b (2.15:1 fail) → #b45309 (5.02:1 pass) |
| Import-add-user dialog mobile config | 5ea4466 | maxWidth/maxHeight added to MatDialog.open() |
| Job detail pe-5 mobile clipping | 5ea4466 | pe-5 → pe-lg-5 (48px right indent clipped text on mobile) |
| "No contacts were added." copy | 5ea4466 | → "No invites were sent." (correct domain noun) |
| Spurious SAVE_CONTACT dispatch in candidate add | 21657a5 | Removed unintentional cross-dispatch that silently created contacts |
| SEC-08 (getJobApplicantDetails) | Prior sprint | CONFIRMED ALREADY FIXED |
| addCompanyUserByEmail catch block | Prior sprint | CONFIRMED ALREADY CLEAN |
| listRecruiterThreads LIMIT | Prior sprint | CONFIRMED ALREADY FIXED |
| PayMongo webhook HMAC | 97cd657 | CONFIRMED ALREADY FIXED (stale in risk register) |
| CORS wildcard | d4e34c7 | CONFIRMED ALREADY FIXED (stale in risk register) |
