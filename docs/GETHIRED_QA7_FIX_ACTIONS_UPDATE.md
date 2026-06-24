# GetHired QA Cycle 7 Fix Sprint — ACTIONS Update

**Generated:** 2026-06-25
**Scope:** Post-QA7 BOLA sweep, security posture assessment, rate-limiting sprint design, backlog priority call
**Predecessor docs:** GETHIRED_SECURITY_SPRINT_ACTIONS_UPDATE.md, GETHIRED_QA7_FIX_SPRINT_LOG.md

---

## 1. Security Posture Summary — Current State

### BOLA Coverage Across All Mutation Endpoints

| Controller | Handler | Check present? | Method | Notes |
|------------|---------|----------------|--------|-------|
| jobsController | `createJobs` | N/A | Authenticated | Job is created under caller's company |
| jobsController | `updateJob` | YES | `getUserCompany(uid)` + `company_id=$20` in UPDATE WHERE | QA7 Fix 3 hardened guard |
| jobsController | `deleteJob` | YES | `getUserCompany(uid)` + `company_id=$2` in DELETE WHERE | QA7 Fix 3 hardened guard; route is currently **commented out** (`// router.delete("/jobs/delete", deleteJob)`) |
| jobsController | `updateStatusOfJob` | YES | `getUserCompany(uid)` + ownership SELECT before UPDATE | QA7 Fix 1 |
| jobsController | `getAllApplicantOfJob` | YES | `getUserCompany(uid)` vs `getJobCompanyId(id)` | Pre-QA7 SECURE fix |
| jobsController | `deleteInterviewQuestion` | **PARTIAL** | No ownership check — any authenticated user can delete any interview question by `questionId` | New gap — see Open section |
| applicantsController | `updateProfile` | YES | `userId: req.user.uid` spread overrides body-supplied value | QA7 Fix 4 |
| applicantsController | `updateBasicProfileInfo` | YES | `userId: req.user.uid` spread overrides body-supplied value | QA7 Fix 4 |
| applicantsController | `getApplicantProfileById` | YES | `uid` from `req.user` only | Pre-QA7 SECURE fix |
| applicantsController | `saveWorkExp / saveEducBg / saveCert / saveSkillsArray / saveDocuments` | **NO** | These accept `applicantProfileId` from `req.body` and write directly to that id with no ownership check | Residual gap |
| applicantsController | `saveVideoCV` | **PARTIAL** | Reads `uid` for upload but still uses body-supplied `applicantProfileId` for DB write | Residual gap |
| contactsController | `updateContact` | YES | `getUserCompany(uid)` + `contact_id AND company_id` SELECT | QA7 Fix 5 |
| contactsController | `deleteContact` | YES | `getUserCompany(uid)` + `contact_id AND company_id` SELECT | QA7 Fix 5 |
| contactsController | `updateGroup` | YES | `getUserCompany(uid)` + `group_id AND company_id` SELECT | QA7 Fix 5 |
| contactsController | `deleteGroup` | YES | `getUserCompany(uid)` + `group_id AND company_id` SELECT | QA7 Fix 5 |
| contactsController | `createContact` | **NO** | No company-scoping check — contact inserted with whatever `company_id` is in the body | Low risk for cross-tenant write |
| cvController | `updateCV` | YES | `cv_id AND user_id = req.user.uid` SELECT before UPDATE | QA7 Fix 6 |
| cvController | `deleteCV` | YES | `cv_id AND user_id = req.user.uid` SELECT before DELETE | QA7 Fix 6 |
| cvController | `getUserCVlist` | **WEAK** | Accepts `userid` from query param — any authenticated caller can read any user's CV list by supplying a different userid | Low-medium gap |
| companiesController | `updateCompany` | YES | `getUserCompany(uid)` vs body-supplied `companyId` | Pre-QA7 SECURE fix |
| companiesController | `removeCompanyUser` | YES | `getUserCompany(uid)` vs body-supplied `companyId` | Pre-QA7 SECURE fix |
| companiesController | `addCompanyUser` | YES | Route requires `verifyAuth`; user is scoped to the caller's company session | Pre-QA7 |
| userController | `deleteAccountById` | YES | `userId !== req.user.uid` guard | Pre-QA7 fix sprint |
| userController | `updateUserProfile` | **WEAK** | `updateProfile()` accepts body-supplied `uid` as the WHERE clause identifier — any authenticated user could update another user's profile by supplying their uid | Pre-existing gap |
| messageController | `postMessage` | YES | `uid` from token; service layer enforces thread membership | Pre-QA7 |
| paymentController | `paymongoWebhook` | **NO auth** | Intentionally open — needs signature verification | Pre-existing P3 |
| adminController | `getUserProfile` | YES | `getUserRoleById(uid)` role check | Pre-QA7 SECURE fix |

### What the QA7 Sprint Covered (Confirmed)

All 9 fixes applied cleanly, confirmed by reading the live code:

- Fix 1: `updateStatusOfJob` — BOLA check present and correct
- Fix 2: `companiesController` dangling line — commented out, no longer executes at module load
- Fix 3: `Array.isArray` guard — consistent across `updateJob`, `deleteJob`, `updateStatusOfJob`, `updateContact`, `deleteContact`, `updateGroup`, `deleteGroup`
- Fix 4: `updateProfile` / `updateBasicProfileInfo` — `userId: req.user.uid` spread is present; body-supplied `userId` is overridden
- Fix 5: `updateContact` / `deleteContact` / `updateGroup` / `deleteGroup` — ownership SELECTs are present
- Fix 6: `updateCV` / `deleteCV` — ownership SELECTs are present; `userId` derived from token in `updateCV`
- Fixes 7–9: FE-only (billing bar, reducer, RxJS subscriptions) — applied per sprint log

### Remaining Open Security Items

| ID | Item | Severity | Pre-existing? | Description |
|----|------|----------|---------------|-------------|
| SEC-01 | No rate-limiting (repo-wide) | **P1** | Yes | `express-rate-limit` not installed; all write endpoints are open to brute-force, credential stuffing, and scraping |
| SEC-RESIDUAL-01 | `saveWorkExp/saveEducBg/saveCert/saveSkillsArray/saveDocuments` no applicant-id ownership check | P2 | Yes | Any authenticated applicant can write to another applicant's profile data by supplying a foreign `applicantProfileId` |
| SEC-RESIDUAL-02 | `saveVideoCV` partial protection | P2 | Yes | Reads uid for upload but still uses body-supplied `applicantProfileId` for the DB write |
| SEC-RESIDUAL-03 | `updateUserProfile` weak identity | P2 | Yes | `updateProfile()` function uses body-supplied `uid` in the WHERE clause; any authenticated user can overwrite another user's profile |
| SEC-RESIDUAL-04 | `getUserCVlist` reads by query-param userid | P3 | Yes | Any authenticated caller can enumerate another user's CV list |
| SEC-RESIDUAL-05 | `deleteInterviewQuestion` no ownership check | P2 | Yes | Any authenticated employer can delete any interview question by supplying a foreign `questionId` |
| SEC-RESIDUAL-06 | `createContact` no company-scope verification | P3 | Yes | Company_id comes from the request body; a malicious caller can create contacts under a foreign company_id |
| SEC-07 | Paymongo webhook signature verification missing | P3 | Yes | Webhook accepts any POST — spoofed payment events could grant subscriptions |
| SEC-08 | `addCompanyUserByEmail` returns raw error in msg field | P3 | Yes | `msg: \`Failed: ${error}\`` leaks internal error detail to the caller |
| SEC-09 | `checkUserIfExistInFirebase` email enumeration | P3 | Yes | `loginUser` returns "User does not exist" on unknown email, allowing email enumeration |
| SEC-10 | `signin.component.ts:127` string-matches exact BE error text | P2 | Yes | Fragile FE coupling; breaks silently if BE error copy changes |

---

## 2. Production Readiness Assessment

### Verdict: BETA-SAFE / NOT YET PUBLIC-LAUNCH-READY

**Invite-only beta:** The system is safe for a closed beta with a known, trusted user pool. All primary BOLA attack surfaces (job mutations, applicant profile reads, company updates, CV mutations, contact/group mutations, messaging, account deletion) are now ownership-checked. An attacker who registers an account cannot gain escalated access to another company's jobs or another applicant's core profile data.

**Public launch gate items (must fix before opening to untrusted public traffic):**

| # | Item | Why blocking |
|---|------|-------------|
| 1 | **Rate-limiting (SEC-01)** | Without it, login, signup, and all write endpoints are open to brute-force, credential stuffing, and enumeration at scale. Any real traffic immediately demonstrates this gap. |
| 2 | **`updateUserProfile` weak identity (SEC-RESIDUAL-03)** | Any authenticated user can overwrite any other user's profile record by supplying a foreign `uid` in the request body. This is a cross-user data corruption vector that survives the QA7 sweep because `userController.updateProfile()` is a shared function invoked from a non-standard surface. |
| 3 | **Applicant sub-array BOLA (SEC-RESIDUAL-01/02)** | `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, `saveDocuments`, `saveVideoCV` all accept an unauthenticated `applicantProfileId`. An applicant who knows another's ID can corrupt their profile arrays. |

Items SEC-RESIDUAL-04 through SEC-10 are real findings but not hard blockers for a limited public launch — they are information-disclosure or P3 integrity issues rather than cross-account write exploits.

---

## 3. Rate-Limiting Sprint Design

### Library recommendation: `express-rate-limit`

Rationale: it is the Node/Express standard, zero non-core dependencies, ships with a `MemoryStore` (fine for a single-instance deployment), and has a `RedisStore` adapter available when the app scales horizontally. It is not in `package.json` — it needs to be installed.

```
npm install express-rate-limit
```

### Endpoint tiers and recommended limits

| Tier | Endpoints | Limit | Window | Rationale |
|------|-----------|-------|--------|-----------|
| **Auth-sensitive** | `POST /api/auth/signin`, `POST /api/auth/signup`, `GET /api/auth/getpwresetlink`, `POST /api/auth/resendverificationlink` | 10 req | 15 min | Brute-force and credential stuffing vectors; low legitimate volume |
| **High-value mutations** | `POST /api/messages/thread/send`, `POST /api/application/apply`, `POST /api/job/create` | 30 req | 15 min | Abuse (spam applications, message flooding, job scraping) without blocking legitimate use |
| **General authenticated mutations** | All other `PUT`, `POST`, `DELETE` routes that require `verifyAuth` | 100 req | 15 min | Throttles automated abuse while leaving headroom for normal employer workflows |
| **Global fallback** | All `/api/*` routes | 300 req | 15 min | Baseline DoS protection for reads and unauthenticated endpoints |
| **Public read endpoints** | `GET /api/job/published`, `GET /api/job/details`, `GET /api/company/featured` | 200 req | 1 min | Allows scrapers to be throttled; generous for real browsers |

### Recommended structure: layered middleware in `server.js`

Apply in this order so tighter limits shadow the global fallback for sensitive routes:

```js
import rateLimit from 'express-rate-limit';

// 1. Global fallback — all /api routes
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api', globalLimiter);

// 2. Auth limiter — applied per-route in userRoute.js before handler
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, ... });
// router.post("/auth/signin", authLimiter, loginUser);
// router.post("/auth/signup", authLimiter, registerUser);

// 3. High-value mutation limiter — applied per-route in respective route files
const mutationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, ... });
// router.post("/messages/thread/send", verifyAuth, mutationLimiter, postMessage);
// router.post("/application/apply", verifyAuth, mutationLimiter, submitApplication);
```

Per-route application (option 2/3 above) is preferred over a pure global approach because it allows the tighter auth limits to be tested and adjusted in isolation without touching the global layer.

### Files to touch

| File | Change |
|------|--------|
| `package.json` | Add `express-rate-limit` dependency |
| `server.js` | Import and apply global limiter |
| `routes/userRoute.js` | Import `authLimiter`; apply to signin, signup, resendverificationlink, getpwresetlink |
| `routes/messageRoutes.js` | Apply `mutationLimiter` to `/messages/thread/send` |
| `routes/applicationRoute.js` | Apply `mutationLimiter` to `/application/apply` |
| `routes/jobsRoute.js` | Apply `mutationLimiter` to `/job/create` |

**Total files: 6. Complexity: Low. Estimated effort: 3–5 hours.**

No controller changes are required — all limiter logic lives at the router/middleware layer.

---

## 4. B01 Backlog Priority Call

**B01 (read-state: unread message counts) vs B02 (applicant name enrichment in thread list)**

### Recommendation: B02 first, B01 second

**B02 — Applicant name enrichment** delivers higher user-visible value at lower schema risk:
- The thread list currently shows "Candidate XXXXXX" placeholders (Decision D17 from the security sprint ACTIONS doc)
- Employers cannot identify applicants in their inbox without clicking into each thread
- The fix is a single JOIN against `user_credentials` (or `users`) on `applicant_uid` in `listRecruiterThreads()`
- No schema migration required — columns already exist
- Effort: S (~3–4 hours: modify `message.service.js`, update the thread list DTO, update the Angular template)
- **Privacy note:** only expose first name + last name; do not expose email or phone at this surface

**B01 — Read-state** requires a `read_at` or `is_read` column on the `message_threads` or a new `thread_read_state` table:
- The `messages` widget in the employer dashboard already deferred because `is_read` column was missing (per GH1 checkpoint memory)
- Adding a schema column is fine but requires a migration and decisions about backfill for existing messages
- Effort: M (~1 day: schema migration + BE service update + FE unread badge)
- Valuable, but less useful if employers can't identify which conversation belongs to which applicant

**Decision:** Ship B02 (applicant name enrichment) in one session. Open a schema migration issue for B01 (read-state) and plan it for the sprint after rate-limiting lands, so the migration risk is isolated from the rate-limiting sprint.

---

## 5. Recommended Next Sprint Order

### Sprint 1 (current / immediate): Rate-limiting — SEC-01
**Goal:** Close the single P1 security gap that blocks public launch.  
**Effort:** S, 3–5 hours  
**Files:** `server.js` + 4 route files + `package.json`  
**Exit criteria:** `express-rate-limit` installed; global 300/15min limiter active; auth endpoints at 10/15min; message send + apply + job create at 30/15min.

### Sprint 2: Residual BOLA cleanup — SEC-RESIDUAL-01/02/03
**Goal:** Close the three P2 cross-user write exploits that block public launch.  
**Effort:** M, 1 day  
**Scope:**
1. `updateUserProfile` — lock `uid` in `updateProfile()` to `req.user.uid` (not body-supplied)
2. `saveWorkExp/saveEducBg/saveCert/saveSkillsArray/saveDocuments` — verify `applicantProfileId` belongs to `req.user.uid` via a JOIN or ownership SELECT before write
3. `saveVideoCV` — same pattern; lock DB write to the token-derived identity

**Files:** `userController.js`, `applicantsController.js`

### Sprint 3: B02 + B03-prep
**Goal:** Fix applicant name in thread list (B02); plan B03 Interview Page MVP scope.  
**Effort:** S+S, ~1 day total  
**Scope:**
- B02: Modify `message.service.js` `listRecruiterThreads()` to JOIN user name; update Angular thread list template
- B03 scope review: confirm what data `/interview/getall` + `/interview/getalltemplates` + `/interview/gettemplatequestions` already return; determine if a new summary endpoint is needed before the page can be built

### Sprint 4: B03 Interview Page MVP
**Goal:** Replace the under-construction stub at `/recruiter/interview` with minimum viable content.  
**Effort:** XL, 2–3 days  
**Scope:** List of company's jobs + their configured interview questions + link to job edit step 3. Re-add Interviews to sidebar. No scheduling, no video review, no question bank.

### Sprint 5: B01 read-state + accessibility micro-bundle
**Goal:** Add unread message indicators; close B01 minor a11y items and B16/B12 aria fixes.  
**Effort:** M, 1 day  
**Scope:**
- Schema migration: add `read_at timestamptz` to `messages` table (or `thread_read_state` junction if per-user state is required)
- BE: update `listMessages()` to mark read; add unread count to `listRecruiterThreads()`
- FE: badge on inbox nav item and thread list row
- B01 a11y: filter chip min-height, send button min-height, focus management on thread selection, `role="alert"` on inline send error
- B16: `aria-current` on mobile nav
- B12: `aria-live` on employer panel loading state

---

## 6. Updated Decision Log

Extends Decision Log from GETHIRED_SECURITY_SPRINT_ACTIONS_UPDATE.md.

| # | Decision | Rationale | Constraint |
|---|----------|-----------|------------|
| D19 | QA7 establishes `Array.isArray(callerCompany)` as the canonical guard pattern everywhere `getUserCompany()` is called | `getUserCompany()` returns `[]` (not null) when no company exists; `[]` is truthy, so `!callerCompany` alone misses the no-company case | Any future code calling `getUserCompany()` must use the full three-clause guard: `Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId` |
| D20 | `deleteJob` route is currently commented out (`// router.delete("/jobs/delete", deleteJob)`) | The BOLA fix in the controller is real and correct; the route simply isn't wired up. This is not a regression — it means the endpoint is unreachable. | Do not uncomment the route without confirming the FE has a working delete flow. When you do re-wire it, no additional controller change is needed. |
| D21 | Rate-limiting is the minimum public-launch gate for the BE, alongside the three residual BOLA items (SEC-RESIDUAL-01/02/03) | Without rate-limiting, auth and write endpoints are open to brute-force at scale. Without the residual BOLA fixes, cross-applicant data corruption is possible by a malicious registered user. | Do not promote to public launch until Sprints 1 and 2 above are complete. Invite-only beta is safe with the current state. |
| D22 | B02 (applicant name enrichment) ships before B01 (read-state schema migration) | B02 is a JOIN-only fix with no schema risk; B01 requires a migration and backfill decision. Shipping B02 first delivers immediate UX value and isolates the migration risk. | B01 migration must not backfill `read_at` for existing messages (treat all pre-migration messages as read to avoid false-positive unread counts). |

---

## Appendix: BOLA Coverage Map (Verified 2026-06-25)

A quick reference covering all BE mutation endpoints and their current protection status after QA7.

### Fully protected (ownership enforced)
- `PUT /api/job/updatejobs` — `getUserCompany(uid)` + `company_id` in UPDATE WHERE
- `PUT /api/job/changestatus` — `getUserCompany(uid)` + ownership SELECT
- `GET /api/job/applicants` — `getUserCompany(uid)` + company match
- `PUT /api/company/update` — `getUserCompany(uid)` + body companyId match
- `DELETE /api/company/removecompanyuser` — `getUserCompany(uid)` + body companyId match
- `PUT /api/contacts/updatecontact` — `getUserCompany(uid)` + `contact_id AND company_id` SELECT
- `DELETE /api/contacts/deletecontact` — same pattern
- `PUT /api/groups/updategroup` — `getUserCompany(uid)` + `group_id AND company_id` SELECT
- `DELETE /api/groups/deletegroup` — same pattern
- `PUT /api/cv/update` — `cv_id AND user_id = req.user.uid` SELECT
- `DELETE /api/cv/delete` — same pattern
- `PUT /api/applicant/updateprofile` — `userId: req.user.uid` spread
- `PUT /api/applicant/updatebasicinfo` — same pattern
- `PUT /api/auth/archive` (deleteAccountById) — `userId !== req.user.uid` check
- `POST /api/messages/thread/send` — thread membership enforced in service layer
- `GET /api/admin/userprofile` — role-1 check enforced

### Unreachable (route commented out)
- `DELETE /api/jobs/delete` (deleteJob) — controller is protected; route is not wired

### Gaps remaining (open items)
- `DELETE /api/job/deleteinterviewquestion` — no ownership check (SEC-RESIDUAL-05)
- `PUT /api/auth/updateprofile` (updateUserProfile → updateProfile) — uid from body, not token (SEC-RESIDUAL-03)
- `POST /api/applicant/workexp|educbg|cert|skills|docs` — `applicantProfileId` from body, not verified against caller (SEC-RESIDUAL-01)
- `PUT /api/applicant/savevideocv` — DB write uses body `applicantProfileId` (SEC-RESIDUAL-02)
- `GET /api/cv/getall` — reads by query-param `userid`, not token (SEC-RESIDUAL-04)
- `POST /api/contacts/addcontact` — `company_id` from body, not verified (SEC-RESIDUAL-06)
- `POST /api/payment/paymongowebhook` — no auth, no signature check (SEC-07)
