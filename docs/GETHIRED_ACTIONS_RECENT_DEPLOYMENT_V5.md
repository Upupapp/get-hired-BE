# GETHIRED ACTIONS — Recent Deployment V5
## Post-NOTIFY-P2 Full QA Cycle Synthesis
**Generated:** 2026-06-26
**FE HEAD:** `41b5920` | **BE HEAD:** `6a7755c`
**Supersedes:** GETHIRED_ACTIONS_RECENT_DEPLOYMENT_REPORT.md (BE 2ff6358 / FE 1863842)

---

## 1. Executive Summary

This V5 ACTIONS synthesis covers the full QA cycle run post-NOTIFY-P2 deployment. Seven command passes were executed (SWEEP, TEST, STITCH, SECURE, NOTIFY, OPTIMIZE, MOBILEVIEW + SEO). Between the initial QA docs and the current HEADs, an additional code sprint landed 10+ fixes on top of NOTIFY-P2.

**Current system health: GREEN with known pre-launch blockers**

- P0 count: 1 (Firebase key in git history — user-action only, no code fix possible)
- P1 count: 5 (1 code-fixable: rate limiting; 4 user/ops actions)
- P2 count: 9 (architectural/SEO/ops)
- P3 count: 10 (polish/a11y/DX)
- Deferred features: 4

**No security regressions were introduced by any deployment this sprint.**

---

## 2. What This Sprint Closed (Full Inventory)

### NOTIFY-P2 core fixes (BE 2ff6358 / FE 1863842)

| Fix | Description |
|---|---|
| BUG-01 | Company user invite false-positive success toast — FE now reads per-email `status !== 'failed'` |
| BUG-02 | Single contact add: success toast on duplicate — BE returns `DUPLICATE_CONTACT` status; FE branches on it |
| BUG-03 | Single candidate add: success toast on duplicate — BE returns `DUPLICATE_CANDIDATE`; copy "Contact added." → "Candidate added." |
| STRUCT-01 | `forEach(async)` in `multipleContact`/`multipleCandidate` → `Promise.allSettled`; bulk responses now include structured `{ summary }` |

### Post-NOTIFY-P2 sprint fixes

| Fix | Commit | File(s) |
|---|---|---|
| verifyAuth.js raw Firebase error redacted from 403 | 6a7755c | `middleware/verifyAuth.js` |
| createGroup/updateGroup `forEach(async)` → `Promise.allSettled` | 25f5e17 | `controllers/contactsController.js` |
| interview.service.js `forEach(async)` → `Promise.allSettled` | 25f5e17 | `services/interview.service.js` |
| `checkEmailIfExistInCandidate` scoped to company_id | d5bba41 | `services/candidate.service.js` |
| `sameAs: []` removed from Organization JSON-LD when empty | 94e4d39 | `src/app/core/services/seo.service.ts` |
| Dead `?id=` param removed from `getApplicant()` | 94e4d39 | `src/app/applicant/applicant.service.ts` |
| `isMobileViewAllowed` dead route data removed | 94e4d39 | `src/app/app.routing.module.ts`, `auth.module.ts`, `auth.guard.ts` |
| Job-seeker portal CTA buttons → crawlable `<a routerLink>` | 94e4d39 | `job-seeker-portal.component.html` |
| Visual breadcrumb nav on job detail page | 41b5920 | `job-posts-details.component.html/scss/ts` |
| Error-state noindex on job detail page | 41b5920 | `job-posts-details.component.ts` |
| `.success-snackbar` missing `color: #ffffff` | 5ea4466 | `src/styles.scss` |
| `.warning-snackbar` WCAG contrast: #f59e0b → #b45309 | 5ea4466 | `src/styles.scss`, `src/assets/styles/colors.scss` |
| Import-add-user dialog opener missing maxWidth/maxHeight | 5ea4466 | `src/app/company/company-users/company-users.component.ts` |
| Job detail `pe-5` clipping text on mobile | 5ea4466 | `job-posts-details.component.html` |
| "No contacts were added." copy → "No invites were sent." | 5ea4466 | `import-add-user.component.ts` |
| Spurious `SAVE_CONTACT` dispatch in candidate add flow | 21657a5 | `import-add-candidate.component.ts` |

### Confirmed-closed stale items (previously listed as open in session memory)
- PayMongo webhook HMAC verification: **CLOSED** (commit 97cd657, prior sprint)
- CORS wildcard `app.use(cors())`: **CLOSED** (commit d4e34c7, prior sprint)
- SEC-08 `getJobApplicantDetails` BOLA: **CONFIRMED ALREADY FIXED** (prior sprint)
- `addCompanyUserByEmail` catch block raw error: **CONFIRMED ALREADY CLEAN**
- `listRecruiterThreads` missing LIMIT: **CONFIRMED ALREADY FIXED**

---

## 3. Open Backlog — Prioritized

### P0 — Public Launch Blocker (1 item)

#### P0-FIREBASE: Firebase service account key in git history
**Owner:** Paul (user action only)
**Effort:** XL
**Evidence:** `jobhunt-serviceAccountKey.json` exists in BE git history. Anyone with repo access has valid Firebase Admin SDK credentials.
**Steps:**
1. Firebase Console → Project Settings → Service Accounts → revoke existing key, generate new key
2. Place new key at `get-hired-BE/jobhunt-serviceAccountKey.json` (already gitignored)
3. Purge old key from history: `git filter-repo --path jobhunt-serviceAccountKey.json --invert-paths`
4. Force-push: `git push origin main --force` (coordinate with any collaborators)
5. SCP new key to Linode: `scp jobhunt-serviceAccountKey.json root@139.162.11.242:/var/www/_work/get-hired-BE/`
6. `ssh root@139.162.11.242 "pm2 restart all"`
**Blocking:** Public launch only. Safe for internal/invite-only use in the meantime.

---

### P1 — Pre-Public Items (5 items)

#### P1-RATE-LIMIT: No rate limiting on any write endpoint
**Owner:** BE dev
**Effort:** M
**Evidence:** `get-hired-BE/src/index.js` (or server entry) has no `express-rate-limit`, `express-slow-down`, or equivalent throttle middleware. Every auth, contact, candidate, job-apply, and payment endpoint is open to brute-force and flooding.
**Fix (execution pack below — ITEM #1):** Install `express-rate-limit`; apply tiered limits: auth endpoints (10/15min), write endpoints (100/15min), public read (500/15min).

#### P1-OG-IMAGE: OG image `gethired-og-default.png` missing
**Owner:** Design / Paul
**Effort:** S (asset creation only; code already wired)
**Evidence:** `SeoService.DEFAULT_OG_IMAGE` and `src/index.html` already reference `/assets/brand/gethired-og-default.png`, but the file does not exist. All social share previews (LinkedIn, Facebook, WhatsApp, Twitter/X) show the logo instead of a branded card.
**Spec:** 1200×630px PNG, branded, no private data. Place at `get-hired-FE/src/assets/brand/gethired-og-default.png` and update `DEFAULT_OG_IMAGE` constant in `seo.service.ts`.

#### P1-GSC: Google Search Console verification + sitemap submission
**Owner:** Paul
**Effort:** XS
**Steps:** Add property at search.google.com/search-console → verify ownership (HTML meta tag or DNS TXT) → submit `https://gethiredonline.app/sitemap.xml`. Unblocks monitoring of JobPosting rich results and indexing velocity.

#### P1-PAT: GitHub PAT for Linode `git pull` expired
**Owner:** Paul
**Effort:** XS
**Steps:** github.com/settings/tokens → generate new classic token with `repo` scope → SSH to Linode → `cd /var/www/_work/get-hired-BE && git remote set-url origin https://<TOKEN>@github.com/Upupapp/get-hired-BE.git`. Current workaround: SCP-per-file deploy.

#### P1-PAYMONGO-ENV: Confirm `PAYMONGO_WEBHOOK_SECRET` env var set on Linode
**Owner:** Paul
**Effort:** XS
**Evidence:** HMAC signature verification code is shipped (commit 97cd657). If env var is missing on Linode, `verifyPaymongoSignature()` returns false and ALL webhooks are rejected 400 (fail-closed, no data risk, but payment events will not process).
**Command:** `ssh root@139.162.11.242 "pm2 env 0 | grep PAYMONGO"` — must show a non-empty value.

---

### P2 — Pre-Scaling Items (9 items)

#### P2-POOL-EXHAUSTION: DB pool exhaustion on large bulk CSV imports
**File:** `get-hired-BE/db/dbQuery.js` (`max: 10`), all import bulk flows
**Evidence:** `Promise.allSettled` in `multipleContact`/`multipleCandidate` fans out ALL rows concurrently. A 100-row CSV fires 100 parallel service calls, each needing 2–5 sequential DB queries. With `max: 10` pool connections and `connectionTimeoutMillis: 5000`, rows will time out into the `rejected` bucket, appearing as failures even with valid data.
**Fix:** Add a concurrency limiter (`p-limit` or manual chunk batching at ≤10 rows/batch).
**Short-term mitigation:** Cap CSV import at 50 rows per batch in FE (execution pack below — ITEM #2).

#### P2-CSV-ROW-CAP: No CSV import row count cap in any import component
**Files:** `import-add-contact.component.ts`, `import-add-candidate.component.ts`, `import-add-user.component.ts`
**Evidence:** No `if (records.length > N)` guard before dispatching bulk import. Related to pool exhaustion above.
**Fix (execution pack below — ITEM #3):** Add client-side validation: `if (this.records.length > 50) { show error toast; return; }`

#### P2-SSR-VERIFY: Verify Angular Universal SSR is actually running in production
**Evidence:** `server.ts` and `AppServerModule` exist and are configured, but whether Linode/nginx is actually serving the Node SSR process (vs static `index.html`) is unverifiable from local files. If static only, Googlebot does not see dynamic `<title>`, JSON-LD, or `og:` tags.
**Fix:** `curl -A "Googlebot" https://gethiredonline.app/jobs/details/{any-active-job-id}` — if `<title>` and `<script type="application/ld+json">` appear in raw HTML, SSR is running. If `<title>GetHired Online</title>` is the generic app title, it is client-side only.

#### P2-COMPANY-SITEMAP: Company pages not in sitemap.xml
**File:** `get-hired-BE/controllers/sitemapController.js` (or `server.js` sitemap block)
**Evidence:** Sitemap only includes job URLs + 4 static pages. Company profile pages exist at `/jobs/company/:id` but are discovered only via link-following.

#### P2-SOFT-404: Expired/unknown jobs return HTTP 200 from SSR (soft 404)
**File:** `src/app/jobs/job-posts-details/job-posts-details.component.ts`, `server.ts`
**Evidence:** Error-state noindex meta tag is now set (commit 41b5920), but the HTTP response code is still 200. Google indexes these as thin content pages. Needs Angular `RESPONSE` token injection to set actual 404 status.

#### P2-HERO-CTA: Employer info page CTAs not crawlable `<a>` tags
**Files:** `src/app/home/employers/` component HTML
**Evidence:** Job-seeker portal CTAs were fixed (94e4d39), but employer info page CTAs using `(click)="router.navigate()"` were not audited in that sprint.

#### P2-SVG-CLS: SVG images without explicit width/height (CLS risk)
**Files:** Homepage and public-page components
**Evidence:** `<img src="*.svg">` without `width`/`height` attributes prevents browser from reserving layout space → layout shift → CLS score degradation.

#### P2-LOCALSTORAGE-SSR: `localStorage` in PublicSearchComponent without `isPlatformBrowser`
**File:** `src/app/jobs/public-search/public-search.component.ts`
**Evidence:** `localStorage` calls throw `ReferenceError` in Node SSR context, causing Angular Universal to fall back to client-only rendering for this page.

#### P2-CANDIDATE-SINGULAR: Bulk candidate import uses `candidate` (singular) field name
**Files:** `import-add-candidate.component.ts` (line ~360), `candidateController.js` (line ~40)
**Evidence:** FE sends `{ candidate: [...records] }`; BE destructures `const { candidate } = req.body`. Contact bulk uses `contacts` (plural). Asymmetry is a maintenance trap if a future dev aligns with the contact pattern and breaks the candidate endpoint.

---

### P3 — Polish / A11y / DX (10 items)

#### P3-SNACKBAR-ASSERTIVE: `danger-snackbar` needs `aria-live="assertive"`
**File:** Global snackbar config (Angular Material MatSnackBar)
**Issue:** `MatSnackBar` uses `aria-live="polite"`. Error outcomes should interrupt screen readers.
**Fix:** Custom `ToastComponent` with `role="alert"` used via `openFromComponent()`.

#### P3-DIALOG-ALL-FAILED-UX: Keep invite dialog open with inline error on all-failed
**File:** `src/app/company/company-users/company-users.component.ts`
**Issue:** Dialog closes after showing error toast — employer must reopen to correct emails.

#### P3-FAILED-EMAIL-INDICATOR: Per-item failure indicator in partial-success invite list
**File:** `import-add-user.component.ts` / `invitedUsersList` template
**Issue:** Partial-success renders all items equally — no red icon on `status: 'failed'` items.

#### P3-TOAST-TESTS: Unit tests for toast outcome logic in import-add dialogs
**Files:** No `.spec.ts` in contact/candidate dialog directories
**Issue:** TC-05 through TC-08 from TEST report are unimplemented. Toast logic is critical user-facing behavior with no automated coverage.

#### P3-BCRYPT-JS: `bcrypt` → `bcryptjs`
**File:** `get-hired-BE/package.json`
**Issue:** `bcrypt` requires native binaries (node-gyp) — fragile on Node 14 deploys.

#### P3-AXIOS-1X: `axios` 0.x → 1.x
**File:** `get-hired-BE/package.json`
**Issue:** Outdated major version with known CVE exposure.

#### P3-TOAST-EXTRACT: Duplicated toast decision logic across 3 import-add components
**Files:** `import-add-user.component.ts`, `import-add-contact.component.ts`, `import-add-candidate.component.ts`
**Issue:** ~95% identical toast branching logic in all three. A shared `resolveImportToast(res, entityLabel)` utility would centralize future changes.

#### P3-DEAD-LOG: Dead snackbar subscription branches in contact/candidate list components
**Files:** `contact-list.component.ts:102`, `candidate-list.component.ts:100`
**Issue:** Subscribe to `contact.success` / `candidate.success` — these reducer fields are never populated. Dead code branches.

#### P3-CANDIDATE-FORM-GUARD: `importCandidateForm` uninitialized until CSV upload
**File:** `import-add-candidate.component.ts` (line ~77)
**Issue:** Form is `undefined` at `ngOnInit`; only initialized inside `uploadListener()`. A future template/logic change that calls `saveOnboardMultiple()` before CSV upload would throw.

#### P3-REUSABLE-TABLE-MOBILE: Table hidden on mobile with no card fallback
**File:** `src/app/shared/components/reusable-table/reusable-table.component.html`
**Issue:** `d-none d-md-inline` hides the data table on mobile but no card-view fallback exists. Authenticated panel users on mobile see empty space where the table should be.

---

### Deferred Features (4 items)

| ID | Feature | Blocker |
|---|---|---|
| FEAT-MESSAGES-WIDGET | Employer dashboard messages widget | No `is_read` column; no `GET /messages/all-threads` endpoint |
| FEAT-ADMIN-PAGES | Admin companies + reports pages | No route/data model |
| FEAT-INDEXING-API | Google Indexing API integration | Blocked on P1-GSC (Search Console verification) |
| FEAT-PROGRAMMATIC-SEO | Landing pages by city/category/role | Needs real data volume to avoid thin/duplicate pages |

---

## 4. Execution Packs — Top 5 Open Items

### EXEC-PACK-1: Rate Limiting (P1-RATE-LIMIT)

**Owner:** BE dev | **Effort:** 2-4 hours | **Files:** `server.js` / `index.js` (main express entry)

**Step 1 — Install dependency:**
```bash
npm install express-rate-limit
```

**Step 2 — Create `middleware/rateLimiter.js`:**
```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' }
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' }
});

const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' }
});

module.exports = { authLimiter, writeLimiter, publicReadLimiter };
```

**Step 3 — Apply in route files:**
```javascript
// routes/authRoutes.js (or userRoutes.js)
const { authLimiter } = require('../middleware/rateLimiter');
router.post('/signin', authLimiter, signIn);
router.post('/signup', authLimiter, signUp);
router.post('/reset-password', authLimiter, resetPassword);

// routes/contactRoutes.js
const { writeLimiter } = require('../middleware/rateLimiter');
router.post('/addcontact', writeLimiter, verifyAuth, addContact);
router.post('/multiplecontact', writeLimiter, verifyAuth, multipleContact);

// routes/jobsRoute.js (public endpoints)
const { publicReadLimiter } = require('../middleware/rateLimiter');
router.get('/published', publicReadLimiter, getPublishedJobs);
```

**Verification:** `for i in {1..12}; do curl -X POST http://localhost:3000/api/signin; done` — requests 11+ should return 429.

---

### EXEC-PACK-2: Pool Exhaustion Mitigation (P2-POOL-EXHAUSTION)

**Owner:** BE dev | **Effort:** 3-5 hours | **Files:** `controllers/contactsController.js`, `controllers/candidateController.js`

**Step 1 — Install p-limit:**
```bash
npm install p-limit
```

**Step 2 — Apply to `multipleContact` controller:**
```javascript
const pLimit = require('p-limit');
const limit = pLimit(10);  // match pool max

// Replace the current Promise.allSettled line:
// const settled = await Promise.allSettled(contacts.map(async option => { ... }));

// With:
const settled = await Promise.allSettled(
  contacts.map(option => limit(async () => {
    return addMultipleContact({ ...option, companyId });
  }))
);
```

Apply the same pattern to `multipleCandidate` controller.

**Step 3 — Increase pool size (optional):**
In `db/dbQuery.js`, consider raising `max: 10` to `max: 20` if Linode Postgres can handle the connections.

**Verification:** Import a 100-row CSV. Check PM2 logs — no `connection timeout` errors. All rows land in success or duplicate (not rejected due to timeout).

---

### EXEC-PACK-3: CSV Import Row Count Cap (P2-CSV-ROW-CAP)

**Owner:** FE dev | **Effort:** 1 hour | **Files:** `import-add-contact.component.ts`, `import-add-candidate.component.ts`, `import-add-user.component.ts`

**Step 1 — Add guard in `uploadListener` / `saveOnboardMultiple`:**

In each of the three import components, after `this.records = result.data`:
```typescript
const MAX_IMPORT_ROWS = 50;
if (this.records.length > MAX_IMPORT_ROWS) {
  this.snackBar.open(
    `CSV has ${this.records.length} rows. Maximum allowed is ${MAX_IMPORT_ROWS}. Please split your file.`,
    '',
    { duration: 8000, panelClass: 'danger-snackbar' }
  );
  this.records = [];
  return;
}
```

**Verification:** Upload a 51-row CSV → danger-snackbar shows "CSV has 51 rows. Maximum allowed is 50." Import does not proceed.

---

### EXEC-PACK-4: `checkEmailIfExistInCandidate` — CONFIRMED ALREADY FIXED

**Status: CLOSED** as of commit d5bba41.

Verification (already done):
```javascript
// services/candidate.service.js line 57 now reads:
const checkEmailIfExistInCandidate = async (email, companyId) => {
  const searchQuery = `SELECT email FROM ${dbSchema}.candidates
    WHERE candidates.email = $1 AND company_id = $2;`;
  const { rows } = await dbQuery.query(searchQuery, [email, companyId]);
  ...
};
```
Caller at line 21: `const ifExistCandidate = await checkEmailIfExistInCandidate(email, companyId);`

**No further action needed.**

---

### EXEC-PACK-5: Soft 404 on Expired/Unknown Jobs (P2-SOFT-404)

**Owner:** FE dev | **Effort:** 2-3 hours | **Files:** `job-posts-details.component.ts`, `server.ts`

**Step 1 — Inject Angular RESPONSE token:**
```typescript
// job-posts-details.component.ts
import { Optional, Inject } from '@angular/core';
import { RESPONSE } from '@nguniversal/express-engine/tokens';

constructor(
  ...
  @Optional() @Inject(RESPONSE) private response: any
) {}
```

**Step 2 — Set 404 status when jobError$ fires:**
```typescript
// In ngOnInit, inside the jobError$ subscription (already exists from commit 41b5920):
this.jobError$.subscribe(error => {
  if (error && this.response) {
    this.response.status(404);
  }
  this.meta.updateTag({ name: 'robots', content: 'noindex' });  // already present
});
```

**Step 3 — Verify:**
```bash
curl -I https://gethiredonline.app/jobs/details/nonexistent-job-id-12345
# Expected: HTTP/1.1 404 Not Found
# Current: HTTP/1.1 200 OK (soft 404)
```

---

## 5. Decision Log

Items requiring product or design decisions before code work begins.

### DEC-01: OG Image Design Direction
**Question:** What should the GetHired Online OG image (social share card) look like?
**Options:**
- (A) Brand color background (#FF7062 coral) with logo and tagline — "GetHired Online | Find Your Next Job"
- (B) Dark background (navy/charcoal) with logo, tagline, and CTA call — more legible on LinkedIn dark mode
- (C) Job-search photo/illustration background with logo overlay
**Constraints:** 1200×630px PNG, no PII, safe for all social platforms, must look good at ~160px thumbnail (LinkedIn preview size)
**Decision owner:** Paul
**Blocking:** P1-OG-IMAGE

### DEC-02: CSV Import Row Limit
**Question:** What is the right CSV import batch size limit?
**Tradeoffs:**
- Lower (20-30): Better pool safety; more annoying for large-volume employers
- Higher (50): Reasonable UX; still risky at pool max=10
- Higher (100): Pool exhaustion risk documented; acceptable with p-limit fix in place
**Recommendation:** 50 rows (safe without code changes to pool); revisit after p-limit is installed
**Decision owner:** Paul
**Blocking:** EXEC-PACK-3

### DEC-03: Employer Info Page CTAs — Crawlable Links
**Question:** Should "Post a Job" / "Get Started" / "Learn More" buttons on the employer info page be converted to `<a routerLink>` elements?
**Context:** Job-seeker portal CTAs were already converted (commit 94e4d39). The employer info page has similar patterns but was not audited in that sprint. Converting improves SEO link equity flow to the `/jobs/post` route.
**Risk:** Low — same pattern already applied to job-seeker portal; no behavioral change for logged-in users.
**Decision owner:** Paul
**Blocking:** P2-HERO-CTA

### DEC-04: `SAVE_CONTACT` Side-Effect on Candidate Add (RESOLVED)
**Question (was):** Was the `SAVE_CONTACT` dispatch in `import-add-candidate.saveOnboard()` intentional (cross-linking candidates to contacts) or a bug?
**Decision:** Removed as unintentional in commit 21657a5. CLOSED.

### DEC-05: Programmatic SEO Landing Pages — Minimum Content Threshold
**Question:** Before building "Jobs in Manila" / "Remote jobs in Philippines" landing pages, how many unique jobs per city/category are needed to avoid thin-content penalties?
**Google guidance:** Each page should have unique, substantive content — not just a filtered list. Recommended minimum: 5+ active jobs per page with unique intro text.
**Recommendation:** Defer until job volume reaches this threshold. Do not build stub pages.
**Decision owner:** Paul
**Blocking:** FEAT-PROGRAMMATIC-SEO

### DEC-06: Admin Companies + Reports Pages — Data Model
**Question:** What data should admin company reports show? Options:
- (A) Company-level stats: job count, application count, hire rate
- (B) Platform-wide aggregate: total jobs, total applicants, conversion funnel
- (C) Financial: subscription status, payment history per company
**Blocking:** FEAT-ADMIN-PAGES

---

## 6. Launch Gate Assessment

| Gate | Status | Notes |
|---|---|---|
| No P0 in code | CONDITIONAL PASS | P0-FIREBASE is user-action (key rotation), not a code regression |
| Security: BOLA guards | PASS | All endpoints use JWT-derived companyId; verified holding across sprints |
| Security: Auth middleware | PASS | All write routes have verifyAuth; public routes have optionalVerifyAuth |
| Security: PayMongo HMAC | PASS | Committed 97cd657; verify env var on Linode |
| Security: CORS | PASS | Restricted to env.app_url (d4e34c7) |
| SSR / meta tags on public pages | CONDITIONAL PASS | Needs `curl -A Googlebot` verification on Linode |
| OG image | FAIL | Missing asset; social shares show logo |
| Rate limiting | FAIL | No express-rate-limit; P1 code fix pending |
| Mobile: public pages | PASS | Mobile block removed; public pages fully accessible |
| Mobile: authenticated dialogs | PASS | All 3 import dialogs have maxWidth/maxHeight CSS + TS |
| Crawlability: job detail | PASS | optionalVerifyAuth on GET /job/details; JSON-LD present |
| Crawlability: job-seeker CTAs | PASS | 3 CTA buttons converted to `<a routerLink>` |
| Sitemap | PASS | Endpoint exists, queries active jobs, has cache + error fallback |
| robots.txt | PASS | Correct disallow list; sitemap reference |

**Verdict: BLOCKED FOR PUBLIC LAUNCH**
Blockers: P0-FIREBASE (user action) + P1-RATE-LIMIT (code fix) + P1-OG-IMAGE (design asset)
Safe for: Internal demo, invite-only beta

---

## 7. Recommended Execution Order

1. **Immediate (user action, minutes):** `ssh root@139.162.11.242 "pm2 env 0 | grep PAYMONGO"` — verify PAYMONGO_WEBHOOK_SECRET is set
2. **Same day (user action):** Renew GitHub PAT → `git pull` on Linode working again
3. **This week (user action, blocks P0):** Rotate Firebase key → purge git history → force push
4. **This week (design):** Create 1200×630px OG image → commit to assets/brand/
5. **Next code sprint:** EXEC-PACK-1 (rate limiting) — closes last code-fixable P1
6. **Next code sprint:** EXEC-PACK-2 + EXEC-PACK-3 (pool exhaustion + CSV cap) — closes P2 architectural risk
7. **Next code sprint:** EXEC-PACK-5 (soft 404) — closes SEO P2
8. **Search Console (after P0 resolved):** Verify property → submit sitemap → enroll in Indexing API
9. **A11y sprint:** P3-SNACKBAR-ASSERTIVE, P3-TOAST-TESTS, P3-DEAD-LOG

---

## 8. Files Written by This Actions Pass

| File | Purpose |
|---|---|
| `docs/GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md` | This file — full synthesis, execution packs, decision log |
| `docs/GETHIRED_BACKLOG_RECENT_V5.md` | Full prioritized backlog table (25 open items + 25+ closed) |
| `get-hired-FE/GETHIRED_OPEN_BACKLOG.md` | Master backlog updated to reflect current state |
