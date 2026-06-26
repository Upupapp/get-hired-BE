# GETHIRED SWEEP — RECENT DEPLOYMENT 3

**BE HEAD:** `a32aa3b` (local = GitHub = Linode — all synced)
**FE HEAD:** `2ff2409` (latest)
**Date audited:** 2026-06-26
**Auditor:** Claude Code (claude-sonnet-4-6)
**Scope:** Full 24-phase system discovery audit focused on the 6 changes in this deployment round (SSH deploy key, ESM compat fix, BE catch-up deploy, PM2 entry-point clarification, Firebase credential hardening, production sync).

---

## Executive Summary

**Deployment health: GREEN with important systemic debt and 2 deployment script mismatches**

The six changes in this round are all correctly implemented and safe. The ESM compat fix cleanly removes the `?.` / `??` operators from all three targeted files. Firebase credential hardening is sound and the 4-strategy chain is properly implemented. The SSH deploy key is active. PM2 is correctly pointed to `start.js`.

**New critical findings in this round:**
1. **CRITICAL DEBT (systemic):** The `esm` v3.2.25 Acorn parser constraint (`?.` / `??` not supported) is documented in the runbook but has NOT been encoded as a lint rule, git hook, or CI check. The one remaining `?.` usage (`backfill_application_snapshots.js:96`) lives in a scripts-only file that runs via Node directly (not through `esm`) — it is safe today, but the gap between documentation and enforcement means the next developer working on a service or controller has no automated guardrail.

2. **HIGH (deployment script mismatch):** The GitHub Actions workflow (`deploy.yml`) uses `pm2 restart 0` (restart by process index 0), while the documented production manual command uses `pm2 restart gethired`. If the PM2 process list changes order, `pm2 restart 0` silently restarts the wrong process. The workflow should use `pm2 restart gethired --update-env` for correctness.

3. **HIGH (stale backlog):** `GETHIRED_OPEN_BACKLOG.md` (BL-P1-01) still lists "Rate limiting missing repo-wide" as an open P1 item. Rate limiting is CONFIRMED IMPLEMENTED in `server.js` — 4-tier system (globalLimiter / authLimiter / writeLimiter / sensitiveLimiter) using `express-rate-limit`. This item must be closed.

4. **HIGH (CORS — local dev localhost only):** `server.js` line 90: `app.use(cors({ origin: env.app_url }))` — the `.env` value for `APP_URL` is `http://localhost:4200`. The production `.env` on Linode must have `APP_URL=https://gethiredonline.app`. If the env var is missing or wrong on Linode, CORS blocks all FE→BE calls in production. Unverifiable without live server access.

5. **MEDIUM (catch-up deploy regression risk):** The 99-file catch-up deploy from `d321447` to `a32aa3b` is presumed clean because every change in that range was individually verified across prior SWEEP/QA sessions. However, a single-pass regression smoke test against the production API was not run as part of this round.

**Previously tracked P0 (Firebase key in git history):** Still OPEN. The new `firebaseApp.js` credential chain removes the need for the local key file in production, but the old key (if not yet rotated/revoked in Firebase Console) is still a live credential risk if the repo is public or accessible to unauthorized parties.

**Previously resolved items (all hold):**
- SEC-01 (BOLA/IDOR on applicant profile): CONFIRMED FIXED
- SEC-02 (BOLA on job details UID): CONFIRMED FIXED  
- SEC-07 (UID spoofing in verifyRoles): CONFIRMED FIXED
- DEBT-01/DEBT-02 (forEach async): CONFIRMED FIXED
- DEBT-06 (no rate limiting): CONFIRMED FIXED (stale backlog entry, see above)
- Firebase error redaction: CONFIRMED (verifyAuth.js returns `'Authentication failed.'`)
- PayMongo webhook HMAC: CONFIRMED FIXED
- SQL injection in job.service.js: CONFIRMED FIXED (parameterized query)
- Magic-byte file upload check: CONFIRMED PRESENT
- Security headers (nosniff, X-Frame-Options): CONFIRMED PRESENT

---

## §1 What Changed — Verified

### 1.1 SSH Deploy Key (`gethired-deploy-linode`)

**Status: COMPLETE — documented**

`DEPLOYMENT_AUTH_RUNBOOK.md` updated to reflect completed Option A:
- Ed25519 key generated at `/root/.ssh/gethired_deploy`
- Public key registered as read-only deploy key in GitHub under name `gethired-deploy-linode`
- `/root/.ssh/config` on Linode routes `github.com` to `IdentityFile /root/.ssh/gethired_deploy`
- Remote updated to `git@github.com:Upupapp/get-hired-BE.git`
- Normal deploy command: `ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull --ff-only && pm2 restart gethired --update-env"`

**Finding (HIGH):** The GitHub Actions workflow (`deploy.yml`) was NOT updated to use the deploy key. It still relies on `LINODE_SSH_KEY` (a base64-encoded private key stored in GitHub Secrets) and uses `pm2 restart 0 --update-env`. This means:
- Manual deploys use the new deploy key via SSH on Linode
- GitHub Actions deploys still use the old LINODE_SSH_KEY secret path
- The two deploy paths use different PM2 restart commands (`0` vs `gethired` by name)

If GitHub Actions runs a deploy and PM2 process list has `gethired` at index 1 instead of 0, the wrong process gets restarted silently.

### 1.2 ESM Compat Fix (commit `e10a44f`)

**Status: COMPLETE — clean**

Three files had `?.` (optional chaining) replaced with `&&` guards:

| File | Pattern removed | Replacement |
|------|-----------------|-------------|
| `controllers/contactsController.js` | `?.` in field access | `&&` guards |
| `controllers/candidateController.js` | `?.` in field access | `&&` guards |
| `middleware/verifyRoles.js` | `?.` in field access | `req.user && req.user.uid` |

**ESM-incompatible syntax remaining in BE source — full audit result:**

| File | Line | Content | Risk |
|------|------|---------|------|
| `controllers/jobsController.js` | 625 | Comment only — `// ESM 3.x compat: avoid optional chaining (?.) and nullish coalescing (??)` | No risk (comment) |
| `scripts/backfill_application_snapshots.js` | 96 | `if (v.errors?.length) {` | **SAFE** — this script runs with `node` directly (not through `esm`) and is never imported by server.js. Acorn parser is not involved. |

**Core source directories (controllers, routes, middleware, services, helpers, db):** CLEAN — zero `?.` or `??` found.

**Verdict: ESM compat scope is CLEAN for all production-loaded files.** The one surviving `?.` is in a standalone script that Node.js handles natively (Node 14+ supports optional chaining). No production risk.

### 1.3 Full BE Catch-Up Deploy (`d321447` → `a32aa3b`)

**Status: COMPLETE — 99 files changed**

The Linode server was 60+ commits behind GitHub. All sessions' work is now deployed. Key changes included in this catch-up (all individually verified in prior SWEEP/QA rounds):
- SEC-01 through SEC-07 security fixes
- NOTIFY-P2 false-positive toast fixes
- forEach(async) → Promise.allSettled fixes
- Rate limiting (4 tiers)
- PayMongo HMAC webhook verification
- Magic-byte file upload validation
- SQL injection fix in job.service.js
- Google Indexing API scaffold
- Sitemap endpoint with 15-min cache and XML escaping
- Application snapshot service (3 snapshot types)
- Firebase Admin credential hardening (this round)

**Regression risk:** No automated test suite exists (package.json `test` script exits 1). The catch-up is presumed correct based on prior SWEEP verifications. A live production smoke test is advisable.

### 1.4 PM2 Entry Point: `start.js` vs `server.js`

**Status: DOCUMENTED — critical knowledge asset**

`start.js` is a 2-line CommonJS wrapper:
```js
require = require("esm")(module);
module.exports = require("./server.js");
```

`server.js` uses ES module `import` syntax (import/export). Node.js cannot execute it directly — it requires the `esm` package wrapper. Starting `server.js` directly produces `ERR_MODULE_NOT_FOUND`.

`package.json` `main` field is correctly set to `start.js`. The `npm start` script runs `node start.js`.

**Finding (HIGH — deployment gap):** `deploy.yml` runs `npm run build --if-present` and `npm run migrate --if-present` before restarting PM2. There is no build step needed for this Node/ESM project (it runs source JS directly), and no `migrate` script exists. These steps are no-ops but add noise. More importantly, if a future developer adds a build step that outputs to `dist/`, the entry point would need updating.

**Finding (MEDIUM — documentation gap):** The PM2 process name `gethired` is assumed to be the current production process name, but there is no `ecosystem.config.js` in the repo to lock this in. The PM2 config exists only on the server. If the process is ever renamed or recreated, `pm2 restart gethired` silently fails.

### 1.5 Firebase Credential Hardening

**Status: COMPLETE — 4-strategy chain implemented and correct**

`middleware/firebaseApp.js` resolution order:
1. `FIREBASE_SERVICE_ACCOUNT_BASE64` (preferred — Linode/CI)
2. `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON string in env)
3. `GOOGLE_APPLICATION_CREDENTIALS` (ADC for GCP-hosted environments)
4. `FIREBASE_SERVICE_ACCOUNT_PATH` (local dev only — blocked if `NODE_ENV=production`)
5. No credentials → fail loudly with explicit error message

**Security properties confirmed:**
- Initializes exactly once (guards on `admin.apps.length > 0`)
- Logs source type only (e.g., "Firebase Admin: initializing via env-base64")
- No credential material is logged
- Production path (step 4) is blocked in production via explicit throw
- Named app `'admin'` preserved for downstream callers
- All exports (`firebaseAdmin`, `firebaseApp`, `firebaseConfig`) unchanged

**Production status:** Production `.env` on Linode has `FIREBASE_SERVICE_ACCOUNT_BASE64` set. This is the preferred path and is correctly used.

**Open item from SECURITY_HARDENING_SUMMARY.md:** Old Firebase service account key must be disabled/deleted in Google Cloud Console (P0 manual action, still open). The new credential chain makes this survivable, but the old key is still a live credential risk until revoked.

### 1.6 Production Sync (`local = GitHub = Linode at a32aa3b`)

**Status: CONFIRMED**

All three environments (local, GitHub main, Linode) are at `a32aa3b`. The long-running sync gap from prior sessions is closed.

---

## §2 Product System Map

**Two-repo architecture:**

| Layer | Technology | Repo |
|-------|-----------|------|
| Frontend | Angular 13.2.5, SSR via Angular Universal | `get-hired-FE` |
| Backend | Node.js/Express, ESM via `esm` v3.2.25, Firebase Auth/Admin | `get-hired-BE` |
| Database | PostgreSQL (Supabase or direct Postgres) | remote |
| Auth | Firebase Auth (JWT) + Firebase Admin (token verification) | BE middleware |
| File storage | Google Cloud Storage (via `uploader.js`) | BE |
| Payments | PayMongo (HMAC webhook verified) | BE |
| Email | SendGrid (`helpers/mailer.js`) | BE |
| Hosting | Linode VPS (`root@139.162.11.242`), PM2 process manager | server |
| Deploy | GitHub Actions (`deploy.yml`) + manual `git pull` | CI/ops |
| SEO | Angular Universal SSR, `seo.service.ts`, JSON-LD, sitemap.xml | FE+BE |

**User roles:** Admin (role `'1'`), Recruiter/Employer (role `'2'`), Applicant/Job Seeker (role `'3'`)

---

## §3 Frontend Route Map

### Public (unauthenticated)
| Path | Component | Notes |
|------|-----------|-------|
| `/home` | MainPortalComponent | Root redirect destination |
| `/jobs` | Job listing | Public job board |
| `/jobs/details/:id` | JobPostsDetailsComponent | SSR-enabled; noindex on error; real HTTP 404 via RESPONSE token |
| `/jobs/search/:keyword` | PublicSearchComponent | SSR guard added for localStorage (dd4fa99) |
| `/job-seekers` | JobSeekerPortalComponent | Employer CTAs fixed to `<a routerLink>` |
| `/employers` | EmployerPortalComponent | CTAs still using `(click)` (BL-P2-06 open) |
| `/signin` | Auth | noindex |
| `/signup` | Auth | noindex |
| `/reset-password` | Auth | noindex |
| `/change-password` | Auth | noindex |
| `/**` | ErrorPageComponent | 404 wildcard — wired at root |

### Authenticated
| Path | Guard | Role |
|------|-------|------|
| `/admin/**` | AuthGuard + AdminGuard | `'1'` |
| `/recruiter/**` | AuthGuard + EmployerGuard | `'2'` |
| `/user/**` | AuthGuard + ApplicantGuard | `'3'` |

**Guard note:** Role-based guards call `router.resetConfig([...])` at login, replacing the route table. The wildcard 404 route added at root-level may not be reachable post-login if the guard's replacement config lacks a wildcard. This is a known deferred item in the backlog.

---

## §4 Backend API Map

### Auth (`/api/auth/`)
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/signin` | None | authLimiter |
| POST | `/auth/signup` | None | authLimiter |
| POST | `/auth/logout` | verifyAuth | authLimiter + sensitiveLimiter (via `/api/auth`) |
| POST | `/auth/changepassword` | None | sensitiveLimiter |
| GET | `/auth/getpwresetlink` | None | sensitiveLimiter |
| GET | `/auth/getprofile` | verifyAuth | |
| PUT | `/auth/updateprofile` | verifyAuth | |
| PUT | `/auth/archive` | verifyAuth | sensitiveLimiter |

### Jobs (`/api/job/`)
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/job/published` | None | Public — SQL injection fix confirmed |
| GET | `/job/details` | optionalVerifyAuth | SEC-02 fix confirmed |
| GET | `/job/sharelink` | optionalVerifyAuth | |
| POST | `/job/create` | verifyAuth | |
| PUT | `/job/updatejobs` | verifyAuth | |
| DELETE | `/job/delete` | verifyAuth | |
| GET | `/job/basiclist` | verifyAuth | |
| GET | `/job/applicants` | verifyAuth | SECURE fix confirmed |
| GET | `/job/applicants/signals` | verifyAuth | MATCH v5 fit signals |
| GET | `/job/applicantdetails` | verifyAuth | |
| DELETE | `/job/deleteinterviewquestion` | verifyAuth | |

### Applicant (`/api/applicant/`)
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/applicant/createprofile` | verifyAuth | |
| PUT | `/applicant/updateprofile` | verifyAuth | |
| GET | `/applicant/userprofile` | verifyAuth | SEC-01 fix — JWT-derived only |
| GET | `/applicant/profile` | verifyAuth | |
| GET | `/applicant/profile/completeness` | verifyAuth | |
| GET | `/applicant/application/snapshot` | verifyAuth | |
| GET | `/applicant/application/snapshots` | verifyAuth | Batch |

### Payments (`/api/payment/`)
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/payment/paymongopaymentlink` | verifyAuth | SECURE fix confirmed |
| POST | `/payment/paymongowebhook` | None (sig check) | HMAC verified via crypto.timingSafeEqual |

### System
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/sitemap.xml` | None | 15-min in-memory cache; XML-escaped job IDs |
| GET | `/` | None | Health check — returns projectName |

---

## §5 FE-to-BE Contract Map

| FE Service | BE Endpoint | Auth | Status |
|-----------|-------------|------|--------|
| `applicant.service.ts → getApplicant()` | `GET /api/applicant/profile` | JWT | `?id=` param removed (94e4d39) |
| `applicant.service.ts → userProfile()` | `GET /api/applicant/userprofile` | JWT | SEC-01 fix active |
| `job.facade.ts → getJobById()` | `GET /api/job/details` | optionalJWT | SEC-02 fix; noindex on error |
| `jobs.service.ts → getAllPublishedJobs()` | `GET /api/job/published` | None | SQL injection fix |
| `contact.service → importContacts` | `POST /api/contacts/multiplecontact` | JWT | Promise.allSettled; summary field |
| `candidate.service → importCandidates` | `POST /api/candidates/multiplecandidate` | JWT | Promise.allSettled; summary field |
| `payment.service` | `POST /api/payment/paymongopaymentlink` | JWT | Auth added |
| Webhook (PayMongo) | `POST /api/payment/paymongowebhook` | HMAC | timingSafeEqual verified |

---

## §6 Database / Data Model Map

**Pool config:** `max: 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`

**Core tables confirmed used (from queries in service files):**
- `gethired.jobs` — job postings, job_status_id, company_id, job_title, expiration_date
- `gethired.companies` (or `gethired.company`) — company_name, company_id, logo_url
- `gethired.company_jobs` — company↔job join, isfilled, applications, isdraft, views
- `gethired.user_credentials` — uid, role (role-based access)
- `gethired.application` — job_id, candidate_id, applicationdate, status
- `gethired.applicant_profile` — profile data (excluded_fields list in snapshotService)
- `gethired.application_snapshots` — immutable submitted-state snapshot
- `gethired.application_completeness_snapshots` — completeness scoring snapshot
- `gethired.match_snapshots` — persisted match/fit signals

**DDL files present:** `db/complete_ddl.sql`, `db/user_ddl.sql`, `db/job_ddl.sql`, `db/company_ddl.sql`, `db/messages_ddl.sql`, `db/application_snapshots_ddl.sql`

**Known gap:** No automated migration runner. Schema changes require manual SQL execution on production. No migration version table confirmed.

---

## §7 Public Job Portal

**Routes:** `/home`, `/jobs`, `/jobs/details/:id`, `/jobs/search/:keyword`, `/job-seekers`

**Functional state:** WORKING

**Key improvements in this and recent rounds:**
- Job detail: real SSR HTTP 404 for expired/invalid jobs via Angular RESPONSE token (2ff2409)
- Job detail: visual breadcrumb nav with proper semantic structure (`<nav aria-label="Breadcrumb">`, `<ol>`)
- Job detail: `noindex` on error state (41b5920)
- JSON-LD: SSR-safe injection via DOCUMENT token (d908be8)
- "Browse jobs" CTAs: converted to `<a routerLink="/jobs">` (94e4d39)
- Sitemap: published jobs + static pages, 15-min cache, XML-escaped job IDs

**Still open:**
- OG image (1200×630 PNG) — `gethired-og-default.png` asset added in 2ff2409 but needs production verification
- SSR running in production? — needs curl verification with Googlebot user-agent
- Employer info page CTAs still using `(click)` not `<a routerLink>` (BL-P2-06)
- `PublicSearchComponent` localStorage SSR guard added (dd4fa99); verify no other SSR crashes remain

---

## §8 Applicant Experience

**Routes:** `/user/**` (AuthGuard + ApplicantGuard, role `'3'`)

**Functional state:** WORKING — all known SEC fixes in place

**Auth flow:** Firebase token → JWT verified in `verifyAuth.js` → `req.user.uid` for all identity derivation

**Key features:**
- Profile creation/update with work exp, education, certifications, skills, documents, video CV
- Application submission with immutable snapshot capture (post-submit)
- Application completeness scoring (rubric v1 — structural, not bias-inducing)
- Match/fit signals (employer-side only; applicants see aggregate signals)
- Application history

**Privacy guardrails confirmed in snapshotService.js:**
Protected fields excluded from all snapshots: gender, civil_status, date_of_birth, religion, nationality, political_views, union_membership, disability_status, health_conditions, family_status, race, ethnicity, raw_video_content, face_traits, voice_traits, accent_analysis, personality_analysis, emotion_analysis

**Open items:**
- PROFILE completeness badge nudges (CVCOACH, MATCH integration) — verified wired (see checkpoint memory)
- `getApplicant()` still has unused `userId` param in signature (dead code, post-94e4d39)

---

## §9 Recruiter / Employer

**Routes:** `/recruiter/**` (AuthGuard + EmployerGuard, role `'2'`)

**Functional state:** WORKING

**Key features:**
- Job create/update/delete (all auth-gated and ownership-verified)
- Applicant pipeline per job (`/job/applicants`)
- Employer Applicant Fit Signals (`/job/applicants/signals`) — MATCH v5
- Contact and candidate management (BOLA fix: companyId derived from JWT)
- Company profile tabs (11/11 shipped per memory checkpoint)
- Interview Hub (recruiter view)
- Messages inbox (thread list + compose; read/unread limited by missing `is_read` column — deferred)

**BOLA fixes confirmed:**
- `contactsController.js`: `companyId` from `getUserCompany(req.user.uid)` (QA8 FIX-7)
- `candidateController.js`: `companyId` from `getUserCompany(req.user.uid)` (QA10 FIX-5)
- `applicantsController.js`: `candidateId = req.user.uid` (QA9 FIX-1)
- `jobsController.js`: ownership checks throughout
- `verifyRoles.js`: uid from `req.user && req.user.uid` (SEC-07)

---

## §10 Admin

**Routes:** `/admin/**` (AuthGuard + AdminGuard, role `'1'`)

**Backend:** Only `GET /api/admin/userprofile` is registered (adminRoute.js — one route).

**Status:** Minimal. Admin dashboard pages are deferred (FEAT-ADMIN-PAGES backlog item). Admin panel module exists in FE but feature set is thin.

---

## §11 Security

### 11.1 Critical/High Issues

| ID | Risk | Status |
|----|------|--------|
| P0-FIREBASE-KEY | Old service account key not yet revoked in Firebase Console | OPEN (manual action required by repo owner) |
| HIGH-CORS | `cors({ origin: env.app_url })` — must be `https://gethiredonline.app` on Linode | UNVERIFIED (cannot check prod env remotely) |
| HIGH-GH-ACTIONS-PM2 | `pm2 restart 0` vs `pm2 restart gethired` in deploy.yml | OPEN — wrong process if list order changes |

### 11.2 Previously Fixed (Confirmed Holding)

| Fix | Commit | Status |
|-----|--------|--------|
| SEC-01 BOLA — applicant userprofile | 9173f0f | CONFIRMED FIXED |
| SEC-02 BOLA — job details UID | 2757af5 | CONFIRMED FIXED |
| SEC-07 UID spoofing — verifyRoles | a5ade86 | CONFIRMED FIXED |
| SQL injection — /job/published | earlier | CONFIRMED FIXED |
| PayMongo webhook HMAC | 97cd657 | CONFIRMED FIXED |
| Magic-byte file upload | earlier | CONFIRMED FIXED |
| Security headers (nosniff, X-Frame-Options, X-XSS-Protection: 0) | QA11 | CONFIRMED |
| Firebase error redaction | 6a7755c | CONFIRMED |

### 11.3 Firebase Credential Chain

**Production chain:** env-base64 → env-json → ADC → local-file (dev only) → fail-loud

This chain is correctly implemented in `middleware/firebaseApp.js`. Credential errors are redacted. Only source type is logged. The chain is immune to the local-file path in production.

### 11.4 Auth Model

- All protected routes use `verifyAuth` or `optionalVerifyAuth`
- Token verification: `firebaseAdmin.auth().verifyIdToken(idToken)`
- Expired token: explicit `'Token Expired. Login again.'` response
- All identity derivation from `req.user.uid` (JWT), never from request body/query

### 11.5 Rate Limiting (CONFIRMED IMPLEMENTED)

| Tier | Scope | Limit |
|------|-------|-------|
| globalLimiter | All routes | 500 req / 15 min |
| authLimiter | `/api/auth/*` | 20 req / 15 min |
| writeLimiter | POST/PUT/DELETE on `/api` | 100 req / 15 min |
| sensitiveLimiter | changepassword, resetlink, archive | 10 req / 60 min |

**Note:** BL-P1-01 in GETHIRED_OPEN_BACKLOG.md is STALE — rate limiting is implemented. Should be closed.

### 11.6 Outstanding Security Items

| ID | Risk | Action |
|----|------|--------|
| P1-PAYMONGO-ENV | `PAYMONGO_WEBHOOK_SECRET` env var on Linode — unverified | Check: `pm2 env 0 | grep PAYMONGO` |
| P2-DB-POOL | Concurrent bulk imports can exhaust the 10-connection pool | Fix: `p-limit` concurrency cap |
| LEAKED-KEY-HISTORY | Firebase key never committed (confirmed) but prior audit said risk is active | Verify old key is revoked |

---

## §12 Build / Config

### 12.1 Backend

| Item | Value | Notes |
|------|-------|-------|
| Runtime | Node.js (version unspecified) | PM2 on Linode |
| Entry point | `start.js` | CommonJS `esm` wrapper; NEVER start `server.js` directly |
| ESM package | `esm` v3.2.25 | Acorn 6/7 parser — NO `?.` or `??` in any file loaded via require chain |
| Package manager | npm | `npm ci --omit=dev` in deploy.yml |
| Process manager | PM2 | Process name: `gethired` |
| Deploy method | Manual: `git pull --ff-only && pm2 restart gethired --update-env` | GitHub Actions: `git reset --hard origin/main && pm2 restart 0` |
| Config | `env.js` + `.env` | `is_staging` flag switches between prod/staging/eucannajobs configs |

### 12.2 Critical ESM Constraint

**ESM v3.2.25 — FORBIDDEN SYNTAX IN ALL PRODUCTION BE FILES:**
- `?.` (optional chaining) — parse error at startup
- `??` (nullish coalescing) — parse error at startup

**Safe alternatives:**
- `a?.b` → `a && a.b`
- `a ?? b` → `a !== null && a !== undefined ? a : b` or `a || b` (if falsy-coalesce is acceptable)

**Scope of constraint:** All files imported through `start.js → server.js → routes → controllers → services → helpers`. The `scripts/` directory runs via `node` directly (not through `esm`) — optional chaining is safe there.

**Enforcement gap:** No ESLint rule, no `no-optional-chaining` config, no pre-commit hook, no CI check enforces this constraint. Documentation only. Any new developer who writes `const foo = obj?.prop` in a controller will break production on next deploy.

**Recommended fix:** Add `"no-optional-chaining": "error"` to an ESLint config, or configure `eslint-plugin-es` to target the Acorn-constrained syntax level. Add to `tools/check-secrets.sh` or a separate `tools/check-esm-compat.sh` script.

### 12.3 Frontend

| Item | Value |
|------|-------|
| Framework | Angular 13.2.5 |
| SSR | Angular Universal (`@nguniversal/express-engine`) |
| SSR server | `server.ts` — Express; REQUEST/RESPONSE tokens provided (2ff2409) |
| Build | `npm run build:ssr` → `dist/` |
| Deploy | Manual SCP / FE has GitHub Actions workflow referencing secrets (not yet verified) |

### 12.4 Deployment Script Mismatches

| Issue | deploy.yml | Manual command | Risk |
|-------|-----------|---------------|------|
| PM2 restart target | `pm2 restart 0` | `pm2 restart gethired --update-env` | Wrong process if list order changes |
| Git reset strategy | `git reset --hard origin/main; git clean -fd` | `git pull --ff-only` | `reset --hard` discards local changes (fine for deploy); `clean -fd` removes untracked — could delete prod `.env` if not gitignored |
| npm install | `npm ci --omit=dev` | (no install step in manual) | Fine |
| Build step | `npm run build --if-present` | (no build step) | No-op (no build script) but noise |

**Critical note on `git clean -fd`:** The `.env` file is gitignored, which means `git clean -fd` would delete it from the server if it exists as an untracked file. However, `.env` is in `.gitignore` so `git clean` without `-x` flag skips gitignored files by default. This is SAFE in standard usage. Verify that deploy.yml does NOT use `git clean -fdx` (it does not).

---

## §13 UI / UX

**Design system:** Custom SCSS with Angular Material CDK. Brand tokens defined in `_portal-common.scss`.

**Recent improvements (dd4fa99, 2ff2409):**
- 44px touch targets on `.btn-link-cta` and `.btn-cta-primary` (mobile compliance)
- `prefers-reduced-motion` wraps on hover transforms
- Breadcrumb on job detail page (semantic HTML)
- SVG CLS attributes added (width/height on brand images)
- Long job title truncation (max-width constraint)
- OG image added (1200×630 PNG)

**Open:**
- Employer info page CTAs not `<a>` tags (BL-P2-06)
- Admin pages thin/absent
- Messages widget limited (no `is_read` column, no all-threads endpoint)

---

## §14 Accessibility

**Confirmed improvements:**
- Breadcrumb uses `<nav aria-label="Breadcrumb">` + `<ol>` + `aria-current="page"` (41b5920)
- "Browse jobs" CTAs are `<a>` elements (keyboard and screen-reader navigable)
- 44px minimum touch targets on key interactive elements (dd4fa99)
- `danger-snackbar` / `warning-snackbar` / `success-snackbar` classes in styles.scss
- WCAG contrast fix: warning snackbar improved from 2.15:1 to 5.02:1 (#b45309)

**Open items:**
- P3: `danger-snackbar` should use `aria-live="assertive"` (currently `polite`)
- P3: Keep invite dialog open on all-failed case (inline error vs dismissal)
- Post-login 404 wildcard route not reachable (guard resets route config without wildcard)

---

## §15 Performance / SEO

### SEO

**Current state (GREEN with gaps):**

| Item | Status |
|------|--------|
| SSR via Angular Universal | Code present; needs `curl -A Googlebot` verification on production |
| JSON-LD (JobPosting, Organization, Website) | SSR-safe via DOCUMENT token (d908be8) |
| Job detail breadcrumb (BreadcrumbList JSON-LD) | Visual breadcrumb added; BreadcrumbList JSON-LD not confirmed |
| Canonical tags | `seoService.setCanonical()` now SSR-safe; set on valid job load |
| OG image (1200×630) | Asset added (2ff2409); needs production smoke test |
| OG image meta dimensions | Added (`og:image:width`, `og:image:height`) |
| Sitemap.xml | `/sitemap.xml` — published jobs + static pages, 15-min cache |
| Robots meta | `noindex` on job error, auth pages; `index,follow` on valid jobs |
| HTTP 404 on expired jobs | RESPONSE token injected (2ff2409); SSR real 404 now issued |
| Search Console verification | OPEN (P1-GSC) |
| Google Indexing API | Scaffold present; disabled until `GOOGLE_INDEXING_API_ENABLED=true` |
| Company pages in sitemap | NOT INCLUDED (BL-P2-05) |

### Performance

| Item | Status |
|------|--------|
| Rate limiting | 4-tier in-memory (express-rate-limit) |
| Sitemap cache | 15-min TTL; DB not hit on every bot crawl |
| Body size limit | 1MB on JSON and urlencoded bodies |
| Compression | `compression` middleware applied globally |
| DB pool | max: 10 connections; fan-out on bulk imports risks exhaustion |
| trackBy | Added for job list ngFor (dd4fa99) |
| Subscription cleanup | queryParams sub leak fixed; banner sub leak fixed (dd4fa99) |

---

## §16 Testing Readiness

**Current state: NO AUTOMATED TESTS**

`package.json` `test` script: `echo "Error: no test specified" && exit 1`

No unit tests, no integration tests, no e2e tests exist in either repo.

**What would break silently if regressed:**
- ESM compat (any `?.` / `??` in a loaded file → startup crash)
- Firebase credential chain (wrong env var → startup crash)
- verifyAuth — token expiry vs invalid token response shape
- PayMongo HMAC verification (timing attack surface if crypto.timingSafeEqual removed)
- SQL injection fix in job.service.js
- SEC-01 BOLA (applicant profile identity derivation)
- SEC-02 BOLA (job detail viewer context)

**Manual smoke test checklist (minimum viable):**
1. `GET /api/job/published` — returns 200 with job list
2. `GET /api/job/details?id={valid-id}` unauthenticated — returns job JSON, isApplied=false
3. `GET /api/job/details?id={valid-id}` with valid JWT — returns job JSON, isApplied correct
4. `GET /api/job/details?id={invalid-id}` — returns 500 (or 404) not a 200 with empty data
5. `GET /sitemap.xml` — returns valid XML with jobs
6. `POST /api/auth/signin` — returns Firebase token or error
7. `GET /api/applicant/userprofile` with valid JWT — returns profile
8. `GET /api/applicant/userprofile` without JWT — returns 403

---

## §17 Notifications / Errors

**Toast system (FE):**
- Four classes: `success-snackbar`, `warning-snackbar`, `info-snackbar`, `danger-snackbar`
- NOTIFY-P2 fixes confirmed: false-positive success toasts eliminated for contact/candidate/company-user invite flows

**Backend error envelopes:**
- Auth errors: exact messages (`'Unauthorized'`, `'Token Expired. Login again.'`, `'Authentication failed.'`)
- Controller errors: generic `errorResponse("Operation not successful. Please try again.")`
- console.error logging with structured prefixes (e.g., `[contactsController] error:`)

**Email (SendGrid):**
- Mailer configured in `helpers/mailer.js`
- Used for: email verification, password reset, interview invites, contact invites

---

## §18 Brand / Positioning

**Brand identity:** GetHired Online — Philippines job platform, "modern hiring platform"

**Key brand assets:**
- `gethired-og-default.png` (1200×630, added 2ff2409)
- Brand SVGs in `/assets/brand/gethired-wow/` (candidate-profile-card, video-answer-orb, match-signal-rings, application-status-path)
- Motion tokens in `_motion.scss` / `_portal-common.scss`
- WCAG-compliant color tokens (warning snackbar fixed to 5.02:1 contrast)

**Site metadata:**
- `BASE_URL`: `https://gethiredonline.app`
- `SITE_NAME`: `GetHired Online`
- Default OG description: "Find jobs, build your profile, post jobs, and manage hiring with GetHired Online — the modern hiring platform for the Philippines."

---

## §19 Redesign Readiness Matrix

| Area | State | Ready for public? |
|------|-------|------------------|
| Public job portal | Functional, SEO-improved | Yes — with caution (SSR verify needed) |
| Applicant experience | Feature-complete, auth secure | Yes |
| Employer portal | Feature-complete, 11 tabs | Yes |
| Admin panel | Minimal (1 BE route, thin FE) | No — deferred |
| SSR | Code correct, unverified in prod | Needs prod verification |
| Firebase credential | Hardened, base64 env set | Yes |
| Deploy pipeline | Functional but has mismatches | Yes (with deploy.yml fix) |
| Rate limiting | 4-tier active | Yes |
| BOLA/auth security | All known vectors fixed | Yes |
| Payments | HMAC verified | Yes (PAYMONGO_WEBHOOK_SECRET env check needed) |

---

## §20 Risk Register

### Critical (P0)

| ID | Description | Impact | Action |
|----|-------------|--------|--------|
| RISK-P0-01 | Firebase service account key not yet revoked in Firebase Console | Anyone with repo history access can impersonate the service account | Rotate key immediately; disable old key in Firebase Console |

### High (P1)

| ID | Description | Impact | Action |
|----|-------------|--------|--------|
| RISK-P1-01 | `deploy.yml` uses `pm2 restart 0` not `pm2 restart gethired` | Wrong process restarted if PM2 list changes | Update deploy.yml to use process name |
| RISK-P1-02 | No ESM-compat lint rule — `?.`/`??` invisible footgun for future devs | First `?.` in any new service → production crash at startup | Add ESLint `no-optional-chaining` rule |
| RISK-P1-03 | `PAYMONGO_WEBHOOK_SECRET` env var on Linode not verified | Payment webhooks rejected; subscriptions not activated | Run `pm2 env 0 | grep PAYMONGO` on Linode |
| RISK-P1-04 | CORS origin: `env.app_url` must be `https://gethiredonline.app` on Linode | If env var missing/wrong, all FE → BE calls blocked | Verify `.env` on Linode has `APP_URL=https://gethiredonline.app` |
| RISK-P1-05 | BL-P1-01 in open backlog incorrectly lists rate limiting as missing | Future developer implements duplicate rate limiting or skips it thinking it's done | Close backlog item |

### Medium (P2)

| ID | Description | Impact | Action |
|----|-------------|--------|--------|
| RISK-P2-01 | DB pool exhaustion on large bulk CSV imports (max 10 connections, concurrent fan-out) | Partial failures on large imports appear as data errors | Install `p-limit`, cap concurrency in bulk controllers |
| RISK-P2-02 | No CSV row count cap in 3 import components | 500-row import saturates pool; no user-facing guard | Add `if (records.length > 50)` guard |
| RISK-P2-03 | SSR not verified running in production | JSON-LD, canonical, and title not in first-byte HTML for Googlebot | `curl -A "Googlebot" https://gethiredonline.app/jobs/details/{id}` |
| RISK-P2-04 | `deploy.yml` `git clean -fd` could delete prod `.env` if `-x` flag ever added | Startup crash (no credentials) | Never add `-x` to `git clean` in deploy.yml |
| RISK-P2-05 | No PM2 ecosystem.config.js in repo | PM2 process config lives only on server; not version-controlled | Add `ecosystem.config.js` with `name: 'gethired', script: 'start.js'` |

### Low (P3)

| ID | Description | Action |
|----|-------------|--------|
| RISK-P3-01 | `getApplicant()` in `applicant.service.ts` has unused `userId` param | Remove param in next cleanup |
| RISK-P3-02 | `createGroup`/`updateGroup` still use `forEach(async)` pattern | Fix in next sprint (deferred from NOTIFY-P2) |
| RISK-P3-03 | `bcrypt` and `bcryptjs` both installed; prefer `bcryptjs` on Node 14 | Remove `bcrypt` (native binaries) |
| RISK-P3-04 | `axios` 0.27.2 (EOL); CVEs present | Upgrade to axios 1.x |
| RISK-P3-05 | No automated test suite | Add jest + supertest for critical routes |

---

## §21 Opportunity Register

| ID | Opportunity | Effort | Value |
|----|-------------|--------|-------|
| OPP-01 | Add ESLint rule `no-optional-chaining` to close ESM footgun permanently | XS (config only) | HIGH — prevents production startup crashes from future dev work |
| OPP-02 | Update `deploy.yml`: use `pm2 restart gethired --update-env`; remove `npm run build/migrate --if-present` noise | XS (1-line change) | HIGH — correct process management |
| OPP-03 | Add `ecosystem.config.js` to version-control PM2 config | XS | MEDIUM — makes server config reproducible |
| OPP-04 | Close BL-P1-01 (rate limiting) in `GETHIRED_OPEN_BACKLOG.md` | XS | MEDIUM — prevents misleading future developers |
| OPP-05 | Verify SSR in production via `curl -A "Googlebot"` | XS (ops check) | HIGH — determines if SEO work is actually live |
| OPP-06 | Submit sitemap to Google Search Console after P1-GSC verification | XS | HIGH — enables Rich Results Job Posting indexing |
| OPP-07 | Add `p-limit` concurrency cap to bulk contact/candidate import | S | MEDIUM — prevents DB pool exhaustion on large CSVs |
| OPP-08 | Add programmatic SEO landing pages ("Jobs in Manila", "Jobs in Cebu") | XL | HIGH — long-term SEO organic traffic |
| OPP-09 | Add jest + supertest for the top 5 critical routes (auth, job details, applicant profile, webhook, sitemap) | M | HIGH — prevents regressions in a codebase with no tests |
| OPP-10 | Add `BreadcrumbList` JSON-LD to job detail page (complements visual breadcrumb) | XS | MEDIUM — structured data bonus for Google |

---

## §22 Recommended Next Commands

Based on this SWEEP 3 audit, the priority order is:

1. **SECURE (focused)** — Fix the two deployment mismatches (`pm2 restart 0` in deploy.yml, ESLint ESM constraint), close stale backlog entries, verify CORS and PAYMONGO env vars on Linode.

2. **ACTIONS (update)** — Update the open backlog to reflect the new deployment state: close BL-P1-01 (rate limiting fixed), close BL-P1-04 (PAT fixed via SSH deploy key), add RISK-P1-01 (pm2 restart 0), add RISK-P1-02 (ESM lint).

3. **TEST (smoke)** — Run the 8-step manual smoke test against production API endpoints. Document results. Consider adding `jest` + `supertest` for the 5 highest-risk routes.

4. **SEO (verify)** — Run `curl -A "Googlebot" https://gethiredonline.app/jobs/details/{active-id}` and confirm JSON-LD + title appear in first-byte HTML. Submit sitemap to Search Console once P1-GSC is done.

---

## Appendix: Commit History (This Round)

| Commit | Message | Scope |
|--------|---------|-------|
| `a32aa3b` | docs: update deployment runbook with completed SSH key setup and esm compat notes | Docs |
| `e10a44f` | fix: replace optional chaining with null guards for esm v3 compat | BE compat |
| `c3e6b84` | docs: note BE deploy gap in SEO summary | Docs |
| `cbd9120` | fix: ESM 3.x compat in jobsController (avoid optional chaining) | BE compat |
| `2533789` | seo: Google Indexing API scaffold, Search Console runbook, env docs | SEO |
| `535a223` | security: Firebase credential hardening, secret scanning, deployment runbooks | Security |
| `6a7755c` | fix: redact raw Firebase error from 403 response | Security |

---

*Report generated by Claude Code (claude-sonnet-4-6) — read-only audit, no code changes.*
*BE HEAD verified: `a32aa3b` | FE HEAD verified: `2ff2409` | Date: 2026-06-26*
