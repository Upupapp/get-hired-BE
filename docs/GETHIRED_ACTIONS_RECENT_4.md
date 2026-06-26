# GetHired — Prioritized Backlog (ACTIONS RECENT_4)
> Updated: 2026-06-26 | ACTIONS RECENT_4
> FE HEAD: `8a41f25` | BE HEAD: `35f7754`
> Production: fully deployed and synced
> Previous backlog: `GETHIRED_OPEN_BACKLOG.md` (V5)

---

## Items Closed This Sprint (RECENT_4)

| Item | Fixed in | Notes |
|------|----------|-------|
| BL-P3-01 — `danger-snackbar` / error ARIA assertive | FE 8a41f25 | SnackbarService with `politeness: 'assertive'` for error(); MatSnackBar direct calls partially migrated |
| HapticService SSR-safe | FE 8a41f25 | `navigator.vibrate()` guarded; SSR-safe; registered in core.module.ts |
| WCAG AA contrast: success-snackbar | FE 8a41f25 | `#FF7062` (3.1:1 FAIL) → `#1A7A4A` (4.85:1 PASS) |
| WCAG AA contrast: danger-snackbar / error-snackbar | FE 8a41f25 | `#FE6F61` (3.1:1 FAIL) → `#C0392B` (5.14:1 PASS) |
| BL-P3-02 — invite all-fail: keeps dialog open with error panel | FE 8a41f25 | Inline error panel + failed email list; partial-fail shows retry result panel |
| BL-P3-03 — per-item failure in invite list | FE 8a41f25 | Partial result panel now itemizes failed emails |
| `Job.companyName` type safety | FE 8a41f25 | `companyName?: string` added to Job interface; unsafe `(company as any).companyName` cast removed |
| `localStorage` SSR guard — import-add-user | FE 8a41f25 | `typeof localStorage` guard in ngOnInit |
| BL-P3-05 — bcrypt → bcryptjs | BE 35f7754 | `bcrypt` removed; `bcryptjs` was already the active import |
| BL-P3-06 — axios 0.27.2 → 1.7.9 | BE 35f7754 | No breaking changes in current usage |
| SQL injection — 14 raw interpolations | BE 986e6da | `contact.service.js` + `candidate.service.js` fully parameterized |
| deploy.yml PM2 name fix | BE 986e6da | `pm2 restart 0` → `pm2 restart gethired` |
| `ecosystem.config.js` version-controlled | BE 986e6da | Entry point, process name, pm2 config locked to source |
| `verifyAuth` on `/auth/manualexcelverification` | BE 986e6da | Unauthenticated admin-named route now guarded |
| CORS fixed (APP_URL corrected) | BE 986e6da | Production CORS config corrected |
| OG social card branded 1200×630 | FE 9f939b2 | 66KB real branded card (was 10KB placeholder gradient) |
| Star SVG CLS fix (width attributes) | FE 9f939b2 | `width` added in company-banner and applicant-avatar |
| BL-P2-08 — `localStorage` SSR guard — PublicSearchComponent | FE 880cf39 | `isPlatformBrowser` / `typeof localStorage` guard added |
| SSR localStorage guards (4 more components) | FE 880cf39 | public-list, job-board-employer-cta, public.component, job-post-search-banner |
| JWT token leak — `console.log(user)` in signin | FE 880cf39 | Removed |
| PII leak — `console.log(this.data)` in import-add-contact | FE 880cf39 | Removed |
| TELECOMMUTE remote job badge (JSON-LD) | FE 7acb092 | `jobLocationType: "TELECOMMUTE"` when remote |
| Description null fallback to jobTitle (JSON-LD) | FE 7acb092 | Prevents empty description field in structured data |
| BL-P1-02 — OG image (initial wiring) | Prior | seo.service.ts DEFAULT_OG_IMAGE wired |

---

## P0 — Public Launch Blockers

### BL-P0-01 | Firebase service account key in git history
**Files:** `get-hired-BE/` (git history)
**Risk:** P0 — key is live in public git history; anyone with repo access can impersonate the Firebase service account
**Steps:**
1. Rotate the key: Firebase Console → Project Settings → Service Accounts → Generate new private key
2. Download new key, place at `get-hired-BE/jobhunt-serviceAccountKey.json` (DO NOT commit)
3. Purge old key from history: `git filter-repo --path jobhunt-serviceAccountKey.json --invert-paths`
4. Force-push: `git push origin main --force`
5. Notify all collaborators to re-clone
6. Update Linode: SCP new key file to `/var/www/_work/get-hired-BE/jobhunt-serviceAccountKey.json`
7. `ssh root@139.162.11.242 "pm2 restart all"`
**Verification:** Old key no longer usable (Firebase Console shows it revoked); `git log --all --full-history -- jobhunt-serviceAccountKey.json` returns nothing
**Status:** OPEN — unchanged from V5

---

## P1 — Pre-Public / High Priority

### BL-P1-01 | Rate limiting missing repo-wide
**Files:** `get-hired-BE/` (no `express-rate-limit` anywhere confirmed)
**Risk:** P1 — all auth, write, and public-read endpoints open to brute-force and flooding
**Fix:** Install `express-rate-limit`; apply tiered limits (auth: 10/15min, write: 100/15min, public read: 500/15min)
**Execution pack:** See `GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md` EXEC-PACK-1
**Note:** Memory entry `feedback_gethired_no_rate_limiting.md` marks this STALE (says a 4-tier limiter IS present in server.js). Verify before implementing: `grep -n "rate-limit\|rateLimit" get-hired-BE/server.js`. If confirmed present, close this item.
**Status:** OPEN — needs verification

### BL-P1-03 | Google Search Console verification + sitemap submission
**Files:** None (manual step)
**Risk:** P1 — without Search Console, JobPosting rich results can't be monitored; sitemap not submitted slows discovery
**Steps:**
1. search.google.com/search-console → Add property → `https://gethiredonline.app`
2. Verify ownership via HTML tag or DNS TXT record
3. Submit sitemap: `https://gethiredonline.app/sitemap.xml`
4. Check Rich Results → Job Postings within 48–72 hours
**Verification:** Search Console shows "Sitemap submitted" and starts reporting indexed URLs
**Status:** OPEN — manual step, blocked only by time

### BL-P1-04 | GitHub PAT for Linode expired
**Files:** Linode server config (no code change)
**Risk:** P1 — BE deploys require manual SCP per file
**Steps:**
1. github.com/settings/tokens → Generate new classic token with `repo` scope
2. `ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git remote set-url origin https://<TOKEN>@github.com/Upupapp/get-hired-BE.git"`
3. Test: `git pull origin main`
**Verification:** `git pull` succeeds from Linode
**Status:** OPEN

### BL-P1-05 | Confirm `PAYMONGO_WEBHOOK_SECRET` env var on Linode
**Files:** Linode prod env (code is wired)
**Risk:** P1 — if missing, all PayMongo webhooks rejected 400; payment events will not process
**Verification:** `ssh root@139.162.11.242 "pm2 env 0 | grep PAYMONGO"` must return a non-empty value
**Status:** OPEN — user must SSH and verify

### BL-P1-06 | Register PayMongo webhook endpoint URL in PayMongo Dashboard
**Risk:** P1 — secret is confirmed present in code, but if the webhook URL is not registered in the PayMongo Dashboard, no payment events will be delivered
**Steps:**
1. Log into PayMongo Dashboard → Webhooks
2. Add webhook URL: `https://gethiredonline.app/api/paymongo/webhook`
3. Select events: `payment.paid`, `payment.failed`, subscription events
**Verification:** PayMongo Dashboard shows webhook as active; test event is delivered
**Status:** OPEN — user action required

### BL-P1-07 | SnackbarService migration: 13+ components still calling MatSnackBar directly
**Files:** Search `get-hired-FE/src/` for `danger-snackbar` panelClass usage outside SnackbarService
**Risk:** P1 (a11y regression) — SnackbarService now enforces ARIA assertive on errors and correct WCAG contrast; components bypassing it will miss both fixes
**Fix:** Replace each `this.snackBar.open(...)` / `this.snackBar.openFromComponent(...)` with `danger-snackbar` panelClass → `this.snackbarService.error(msg)`; success/info calls → `this.snackbarService.success(msg)`
**Scope:** At minimum migrate all 13+ `danger-snackbar` callers; migrate success-snackbar callers opportunistically
**Status:** NEW (RECENT_4) — partial migration done in import-add-user; remainder outstanding

---

## P2 — Architectural / SEO Items

### BL-P2-01 | DB pool exhaustion on large bulk CSV imports
**Files:** `get-hired-BE/db/dbQuery.js` (`max: 10`), `controllers/contactsController.js`, `controllers/candidateController.js`
**Risk:** P2 — `Promise.allSettled` fans out all rows concurrently; 100-row import fires 100 parallel DB calls; pool times out; rows appear as failures
**Fix:** Install `p-limit`; wrap `contacts.map(...)` with `limit(10)` concurrency cap
**Execution pack:** See `GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md` EXEC-PACK-2
**Status:** OPEN

### BL-P2-02 | No CSV import row count cap
**Files:** `import-add-contact.component.ts`, `import-add-candidate.component.ts`, `import-add-user.component.ts`
**Risk:** P2 — no guard prevents 500-row CSV import; tied to pool exhaustion above
**Fix:** Guard in each `uploadListener`: if `records.length > 50` show `snackbarService.error()` and abort
**Note:** Now that SnackbarService exists, use it here instead of raw MatSnackBar
**Status:** OPEN

### BL-P2-03 | Verify Angular Universal SSR is running in production
**Files:** `server.ts`, Linode nginx config
**Risk:** P2 — if Linode serves static index.html only, Googlebot cannot see dynamic titles, JSON-LD, or meta tags
**Verification:** `curl -A "Googlebot" https://gethiredonline.app/jobs/details/{active-job-id}` — check if `<title>` and `<script type="application/ld+json">` appear in raw HTML
**Status:** OPEN — must be verified before SEO launch push

### BL-P2-04 | Soft 404 on expired/unknown jobs
**Files:** `src/app/jobs/job-posts-details/job-posts-details.component.ts`, `server.ts`
**Risk:** P2 — error-state noindex now set but HTTP status is still 200; Google indexes thin error pages
**Fix:** Inject Angular `RESPONSE` token; call `response.status(404)` when `jobError$` fires
**Execution pack:** See `GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md` EXEC-PACK-5
**Status:** OPEN

### BL-P2-05 | Company pages not in sitemap
**Files:** `get-hired-BE/controllers/sitemapController.js`
**Risk:** P2 — company profile pages discovered only via link-following, not direct sitemap crawl
**Fix:** Add query for active companies; generate `<url>` entries for `/jobs/company/:company_id`
**Status:** OPEN

### BL-P2-06 | Employer info page CTAs not crawlable `<a>` tags
**Files:** `src/app/home/employers/` component HTML
**Risk:** P2 — CTAs using `(click)="router.navigate()"` not followable by Googlebot; job-seeker portal was fixed (94e4d39)
**Fix:** Replace button click handlers with `<a routerLink="...">`
**Status:** OPEN

### BL-P2-07 | SVG images without explicit width/height (CLS) — remaining
**Files:** Homepage and public-page component HTML
**Risk:** P2 — CLS score degradation; browser cannot reserve layout space without explicit dimensions
**Note:** Star SVG fixed in 9f939b2. Remaining SVGs in homepage/public pages need audit.
**Fix:** Search `src/` for `<img src="*.svg">` without width/height attributes
**Status:** PARTIALLY CLOSED — star.svg fixed; audit remaining SVGs

### BL-P2-09 | Bulk candidate import field name asymmetry
**Files:** `import-add-candidate.component.ts`, `controllers/candidateController.js`
**Risk:** P2 (maintenance trap) — FE sends `{ candidate: [...] }` while contact bulk uses `{ contacts: [...] }` (plural)
**Note:** Not a bug today — both sides match; document in API contract to prevent future drift
**Status:** OPEN (documentation only)

---

## P3 — Polish / A11y / DX

### BL-P3-03 | Per-item failure indicator — import-add-contact and import-add-candidate
**Files:** `import-add-contact.component.ts`, `import-add-candidate.component.ts`
**Issue:** RECENT_4 fixed import-add-user; the same partial-fail result panel with itemized failures needs to be applied to the contact and candidate import dialogs
**Fix:** Port the result panel HTML + logic from import-add-user to the other two import dialogs
**Status:** PARTIALLY CLOSED — user dialog fixed; contact + candidate dialogs outstanding

### BL-P3-04 | Unit tests for toast outcome logic
**Files:** No `.spec.ts` in contact/candidate dialog directories
**Issue:** TC-05 through TC-08 from TEST report unimplemented; toast logic has zero automated coverage
**Fix:** Create `import-add-user.component.spec.ts`, `import-add-contact.component.spec.ts`, `import-add-candidate.component.spec.ts` covering all outcome branches (success/partial/duplicate/all-failed)
**Status:** OPEN

### BL-P3-07 | Duplicated import toast logic across 3 components
**Files:** `import-add-user.component.ts`, `import-add-contact.component.ts`, `import-add-candidate.component.ts`
**Issue:** ~95% identical branching logic; future changes in one won't propagate to others
**Fix:** Extract `resolveImportResult(res, entityLabel: 'contact'|'candidate'|'user')` shared utility
**Note:** import-add-user was refactored in RECENT_4; now the divergence between it and the other two is larger. Extract utility before import-add-contact/candidate are also refactored.
**Status:** OPEN

### BL-P3-08 | Dead snackbar subscription branches in list components
**Files:** `contact-list.component.ts:102`, `candidate-list.component.ts:100`
**Issue:** `contact.success` / `candidate.success` reducer fields never set; these snackBar branches never fire
**Fix:** Remove dead `snackBar.open(contact.success, ...)` subscription branches
**Status:** OPEN

### BL-P3-09 | `importCandidateForm` uninitialized until CSV upload
**File:** `import-add-candidate.component.ts` (line ~77)
**Issue:** Form is `undefined` at init; only set inside `uploadListener()`; latent throw if `saveOnboardMultiple()` called before CSV
**Fix:** Initialize the FormGroup in `ngOnInit` (even if empty); remove commented-out `formBuilder.group` block
**Status:** OPEN

### BL-P3-10 | `reusable-table` hidden on mobile with no card fallback
**File:** `src/app/shared/components/reusable-table/reusable-table.component.html`
**Issue:** `d-none d-md-inline` hides data table on mobile (<768px) with no alternative card view
**Fix:** Add a mobile card-view mode or responsive column hiding
**Status:** OPEN

### BL-P3-11 | Touch targets below 44px — MOBILEVIEW backlog items (BL3-001, 002, 003)
**Files:** Subscription btn, Recorder btn, Billing bar link
**Risk:** P3 — WCAG 2.5.5 touch target minimum; affects mobile usability
- BL3-001: Subscription btn ~41-43px → `min-height: 44px`
- BL3-002: Recorder btn 40px → `min-height: 44px`
- BL3-003: Billing bar link ~23px tap target → expand
**Status:** OPEN (from MOBILEVIEW V3 backlog)

### BL-P3-12 | Skip-to-main-content link missing (WCAG 2.4.1)
**Files:** `src/index.html` or root app component
**Risk:** P3 — keyboard and screen-reader users cannot bypass navigation
**Fix:** Add `<a href="#main-content" class="skip-link">Skip to main content</a>` as first focusable element; add `id="main-content"` to main landmark
**Status:** OPEN (BL3-005 from MOBILEVIEW V3 backlog)

### BL-P3-13 | ESLint rule: no optional chaining / nullish coalescing in BE
**Files:** `get-hired-BE/.eslintrc.*` (or `package.json` eslint config)
**Risk:** P3 (DX) — ESM Acorn parser rejects `?.` and `??`; two fixes already landed (e10a44f, 986e6da) for this; without a lint rule the pattern will recur
**Fix:** Add `no-restricted-syntax` ESLint rule banning `OptionalMemberExpression`, `OptionalCallExpression`, `LogicalExpression[operator="??"]`
**Status:** NEW (RECENT_4)

### BL-P3-14 | Dependabot: 184 FE vulnerabilities (9 critical, 85 high)
**Files:** `get-hired-FE/package.json`
**Risk:** P3 for non-critical; P1 for the 9 critical
**Fix:** `npm audit fix --force` in FE; review breaking changes before committing; run `npm audit` to triage critical ones first
**Status:** OPEN

### BL-P3-15 | Dependabot: 114 BE vulnerabilities (6 critical, 61 high)
**Files:** `get-hired-BE/package.json`
**Risk:** P3 for non-critical; P1 for the 6 critical
**Fix:** `npm audit fix --force` in BE after axios upgrade (already done); run `npm audit` to confirm critical count reduced
**Status:** OPEN (reduced after axios upgrade — re-audit needed to confirm current count)

---

## Deferred Features (Build When Ready)

### BL-FEAT-01 | Messages widget — employer dashboard
**Reason deferred:** No `is_read` column in messages table; no `GET /messages/all-threads` endpoint
**Prerequisites:** Add `is_read` column to messages table; implement `listAllThreadsForCompany` service

### BL-FEAT-02 | Admin companies + reports pages
**Reason deferred:** Routes don't exist; data model TBD
**Decision needed:** See DEC-06 in ACTIONS V5

### BL-FEAT-03 | Google Indexing API integration
**Reason deferred:** Blocked on BL-P1-03 (Search Console verification)
**Plan:** See `GETHIRED_SEO_GOOGLE_INDEXING_API_PLAN_V4.md`

### BL-FEAT-04 | Programmatic SEO landing pages
**Reason deferred:** Needs real data volume (5+ active jobs per city/category)
**Decision needed:** See DEC-05 in ACTIONS V5

### BL-FEAT-05 | Company pages (public /companies/:slug)
**Reason deferred:** Product decision needed — full company profile page or just /jobs/company/:id redirect?
**Decision needed:** See DEC-RECENT-4-03 in DECISION LOG RECENT_4

---

## User Action Required (Cannot be done by code)

| Item | Command / URL | When |
|------|-------------|------|
| Firebase key rotation | Firebase Console → Service Accounts → Revoke + Generate | Before public launch |
| PAYMONGO_WEBHOOK_SECRET verify | `ssh root@139.162.11.242 "pm2 env 0 \| grep PAYMONGO"` | ASAP |
| PayMongo webhook URL register | PayMongo Dashboard → Webhooks → Add URL | Before payments go live |
| GitHub PAT renewal | github.com/settings/tokens → update on Linode | This week |
| Search Console | search.google.com/search-console → verify + submit sitemap | After P0 resolved |
| SSR verification | `curl -A "Googlebot" https://gethiredonline.app/jobs/details/{id}` | Before SEO launch push |
| Rate limiter verify | `grep -n "rate-limit\|rateLimit" get-hired-BE/server.js` | Before P1-01 work starts |

---

*Generated by GETHIRED ACTIONS RECENT_4 | FE 8a41f25 / BE 35f7754*
