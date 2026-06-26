# GetHired — Prioritized Backlog RECENT 3
**Generated:** 2026-06-26
**FE HEAD:** `a32aa3b` area (post-OG/SSR fixes) | **BE HEAD:** `a32aa3b`
**Supersedes:** GETHIRED_BACKLOG_RECENT_V5.md (25 open items from 2026-06-26)

---

## Effort Key
- **XS** — under 2 hours
- **S** — 2–8 hours
- **M** — 1–3 days
- **L** — 3–7 days
- **XL** — 7+ days

---

## Full Backlog Table

| ID | Title | Status | Priority | Owner | Effort | Source |
|----|-------|--------|----------|-------|--------|--------|
| **P0-FIREBASE** | Firebase service account key in git history + env-based credential chain | CLOSED | — | User-action | XL | SECURE; FIXED this session via env-base64 chain + old key auto-revoked by Google |
| **P1-SSH-DEPLOY-KEY** | SSH deploy key for Linode git pull | CLOSED | — | User-action | S | FIXED this session: gethired-deploy-linode key added |
| **P1-OG-IMAGE** | OG image `gethired-og-default.png` missing | CLOSED | — | User-action/Design | S | FIXED this session: 1200×630 PNG created, seo.service.ts updated |
| **P1-GSC** | Google Search Console verification + sitemap | CLOSED | — | User-action | XS | FIXED this session: property verified, sitemap submitted |
| **P1-BE-CATCHUP** | BE catch-up deploy to Linode | CLOSED | — | Ops | S | FIXED this session: Linode synced to a32aa3b |
| **SSR-REAL-404** | SSR real 404 on unknown/expired jobs | CLOSED | — | FE | S | FIXED this session: RESPONSE token injection |
| **SSR-JSON-LD** | SSR JSON-LD hydration fix | CLOSED | — | FE | S | FIXED this session: DOCUMENT token injection |
| **SUBSCRIPTION-LEAKS** | Subscription leaks in 3 FE components | CLOSED | — | FE | S | FIXED this session: job-posts-list, banner, public-search |
| **ESM-COMPAT-FIX** | `?.` replaced with `&&` guards in 3 BE files | CLOSED | — | BE | S | FIXED this session: restores Acorn parse compatibility |
| **P1-PAYMONGO-ENV** | Confirm `PAYMONGO_WEBHOOK_SECRET` env var set on Linode | OPEN | **P1** | User-action | XS | Code wired (97cd657); if env var missing, all webhooks rejected 400 (fail-closed); run: `ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env"` |
| **P1-ESM-ACORN** | ESM v3.2.25 Acorn limitation: cannot parse `?.` or `??` | OPEN | **P1** | BE | M | NEW this session; developer trap; any modern syntax silently breaks production; migrate to native Node ESM or add Babel |
| **P1-RATE-LIMIT** | No rate limiting on any write endpoint (repo-wide) | OPEN | **P1** | BE | M | SWEEP, SECURE; auth/write/public-read tiers needed; express-rate-limit |
| **P1-DEPENDABOT-CRITICAL** | 114 Dependabot vulnerabilities — 6 critical | OPEN | **P1** | BE+FE | M | 6 critical CVEs; triage for exploitability in GetHired context; upgrade affected packages |
| **P2-PM2-ECOSYSTEM** | PM2 ecosystem file — commits `start.js` as entry point | OPEN | **P2** | Ops/BE | S | NEW this session; prevents wrong-entry-point restart (server.js vs start.js); add ecosystem.config.js |
| **P2-POOL-EXHAUSTION** | DB pool exhaustion on large bulk CSV imports (pool max: 10) | OPEN | **P2** | BE | M | OPTIMIZE; add p-limit concurrency cap |
| **P2-CSV-ROW-CAP** | No CSV import row count cap in any import component | OPEN | **P2** | FE+BE | S | OPTIMIZE; add 50-row client-side guard |
| **P2-SSR-VERIFY** | Verify Angular Universal SSR actually serving in production | OPEN | **P2** | Ops | XS | Run `curl -A "Googlebot" https://gethiredonline.app/jobs/details/<active-id>` |
| **P2-COMPANY-SITEMAP** | Company pages not included in sitemap.xml | OPEN | **P2** | BE | S | sitemapController.js; company profile pages at /jobs/company/:id |
| **P2-HERO-CTA** | Employer info page CTAs not crawlable `<a>` tags | OPEN | **P2** | FE | XS | Convert (click)="router.navigate()" to `<a routerLink>`; job-seeker CTAs already fixed |
| **P2-SVG-CLS** | SVG images without explicit width/height attributes (CLS risk) | OPEN | **P2** | FE | S | Homepage/public pages; add width/height to prevent layout shift |
| **P2-LOCALSTORAGE-SSR** | `localStorage` in PublicSearchComponent without `isPlatformBrowser` | OPEN | **P2** | FE | XS | Throws ReferenceError in Node SSR; add isPlatformBrowser guard |
| **P2-DEPENDABOT-HIGH** | 114 Dependabot vulnerabilities — 61 high | OPEN | **P2** | BE+FE | L | Batch upgrade; lower urgency than critical 6 but significant surface |
| **P2-CANDIDATE-SINGULAR** | Bulk candidate import uses `candidate` (singular) vs `contacts` (plural) | OPEN | **P2** | BE+FE | XS | Asymmetry maintenance trap; align field names |
| **P3-SNACKBAR-ASSERTIVE** | `danger-snackbar` needs `aria-live="assertive"` | OPEN | **P3** | FE | M | MatSnackBar uses polite; errors need assertive; custom ToastComponent |
| **P3-DIALOG-ALL-FAILED-UX** | Keep invite dialog open on all-failed (inline error state) | OPEN | **P3** | FE | S | Dialog closes on all-failed; better UX is inline error so employer can correct |
| **P3-FAILED-EMAIL-INDICATOR** | Per-item failure indicator in partial-success invite list | OPEN | **P3** | FE | S | No visual indicator on failed status items in invitedUsersList |
| **P3-TOAST-TESTS** | Unit tests for toast outcome logic in 3 import-add dialogs | OPEN | **P3** | FE | M | No .spec.ts in contact/candidate dialog dirs; critical UX path has no coverage |
| **P3-BCRYPT-JS** | `bcrypt` → `bcryptjs` (avoid native binaries on Node 14) | OPEN | **P3** | BE | XS | Fragile node-gyp on Node 14 deploys |
| **P3-AXIOS-1X** | `axios` 0.x → 1.x (CVE + breaking-change housekeeping) | OPEN | **P3** | BE | S | Known CVE exposure; breaking changes need audit |
| **P3-TOAST-EXTRACT** | Extract duplicated toast decision logic into shared utility | OPEN | **P3** | FE | M | 3 import-add components share 95% identical toast branching |
| **P3-DEAD-LOG-CONTACT** | Dead `success` state snackbar branches in list components | OPEN | **P3** | FE | XS | contact-list.component.ts:102, candidate-list.component.ts:100 |
| **P3-CANDIDATE-FORM-GUARD** | `importCandidateForm` uninitialized until CSV upload | OPEN | **P3** | FE | XS | Latent throw risk if saveOnboardMultiple called before CSV |
| **P3-REUSABLE-TABLE-MOBILE** | Reusable table hidden on mobile — no card fallback | OPEN | **P3** | FE | M | d-none d-md-inline hides table; mobile sees empty space |
| **FEAT-MESSAGES-WIDGET** | Messages widget — employer dashboard | DEFERRED | — | BE+FE | L | No is_read column; no all-threads endpoint |
| **FEAT-ADMIN-PAGES** | Admin companies + reports pages | DEFERRED | — | BE+FE | XL | No route/data model |
| **FEAT-INDEXING-API** | Google Indexing API integration | DEFERRED | — | BE | L | Needs additional OAuth setup; unblocked by GSC now |
| **FEAT-PROGRAMMATIC-SEO** | Programmatic SEO landing pages ("Jobs in Manila", etc.) | DEFERRED | — | FE+BE | XL | Needs real data volume to avoid thin/duplicate pages |

---

## Status Summary

| Category | Count |
|---|---|
| CLOSED this session (9 items) | 9 |
| OPEN — P0 | 0 |
| OPEN — P1 | 4 |
| OPEN — P2 | 9 |
| OPEN — P3 | 10 |
| Deferred features | 4 |
| **Total OPEN** | **23** |

---

## Items Closed This Session (ACTIONS RECENT 3)

| Item | Description |
|---|---|
| P0-FIREBASE | Firebase credential hardening via env-base64 chain; old key auto-revoked |
| P1-SSH-DEPLOY-KEY | gethired-deploy-linode SSH key active on GitHub + Linode |
| P1-OG-IMAGE | 1200×630 PNG created; seo.service.ts updated |
| P1-GSC | Search Console verified; sitemap submitted |
| P1-BE-CATCHUP | Linode fully synced to a32aa3b |
| SSR-REAL-404 | RESPONSE token injection in job-posts-details.component.ts |
| SSR-JSON-LD | DOCUMENT token injection in seo.service.ts |
| SUBSCRIPTION-LEAKS | 3 components fixed (job-posts-list, banner, public-search) |
| ESM-COMPAT-FIX | 3 BE files: `?.` → `&&` guards |

---

## New Items Added This Session

| Item | Priority | Description |
|---|---|---|
| P1-ESM-ACORN | P1 | Acorn 6/7 limitation in ESM v3.2.25 — developer trap for modern syntax |
| P2-PM2-ECOSYSTEM | P2 | PM2 entry point knowledge risk; ecosystem.config.js needed |
| P1-DEPENDABOT-CRITICAL | P1 | 6 critical Dependabot CVEs — triage required |
| P2-DEPENDABOT-HIGH | P2 | 61 high Dependabot CVEs — batch upgrade needed |
