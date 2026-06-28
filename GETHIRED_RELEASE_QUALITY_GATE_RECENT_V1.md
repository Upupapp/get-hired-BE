# GETHIRED RELEASE QUALITY GATE — RECENT DEPLOYMENT
**Scope:** B04, B05, B09, B13 + Domain migration + 6 targeted security/stability changes  
**Date:** 2026-06-25  
**Method:** Static code inspection + `ng build --configuration production`

---

## Gate Results — Original B04/B05/B09/B13

| # | Gate | Result | Evidence |
|---|------|--------|----------|
| G1 | Production build passes (0 errors) | **PASS** | `ng build --configuration production` succeeded in 22.8s, 0 errors, 2 pre-existing CSS warnings |
| G2 | B04 optional rule preserved: interview/video questions do NOT block publish | **PASS** | `publishJobPost()` gate has no interview check; interview statusChanges subscription is commented out |
| G3 | B13 no forbidden copy (AI / guaranteed / top ranked / matched / video evaluated / shown to all / perfect) in user-facing output | **PASS** | Full grep across service + both component templates; no forbidden terms in user-visible copy |
| G4 | B13 `readinessPercent` is deterministic (no random, no HTTP, no external call) | **PASS** | `evaluate()` is a pure synchronous function; `Math.round((totalDone/totalWeight)*100)` only |
| G5 | B09 Brand/Benefits tabs use only real store data — no fake counts, no invented text | **PASS** | Brand uses `company.companyLogoUrl` + `company.companyDetails`; Benefits uses `workSetupId` + `numberOfEmployee`; backlogged sections say "Coming soon" |
| G6 | B05 `/recruiter/jobs/dashboard` route registered in `employer-jobs.module.ts` | **PASS** | `{ path: 'dashboard', component: EmployerJobDashboardComponent }` confirmed |
| G7 | B13 animations respect `prefers-reduced-motion` | **PASS** | All SCSS animations use `@include motion-safe` or `@include ambient-motion-safe` from `_motion.scss` |
| G8 | B13 chips have ARIA labels | **PASS** | All 4 chip types have `[attr.aria-label]` on each chip element |
| G9 | B13 progressbar has `aria-valuemin/max/now` | **PASS** | `job-readiness-bar.component.html` line 41-44 |
| G10 | B05 null jobId fallback navigates safely (no crash) | **PASS** | Falls back to `/recruiter/jobs/list` when no jobId found in store |
| G11 | `EmployerJobDashboardComponent` declared in module | **PASS** | `employer-jobs.module.ts` `declarations[]` |
| G12 | `JobReadinessBarComponent` + `JobReadinessChipsComponent` declared in `job.module.ts` | **PASS** | Lines 28-29, 52-53 in `job.module.ts` |
| G13 | B13 service makes no HTTP calls (pure function contract) | **PASS** | No `HttpClient` import; no `Observable` or `Promise` in `evaluate()` |
| G14 | B13 interview questions are NEVER in `blockingItems` | **PASS** | Interview uses `pushRec()` only; section status has `blocking: false` with explicit B04 comment |
| G15 | Domain migration: `app_url` in `environment.prod.ts` = `gethiredonline.app` | **PASS** | `app_url: 'https://gethiredonline.app'` |
| G16 | Domain migration: `api_url` still points to App Engine (not `api.gethiredonline.app`) | **PASS** | `api_url: 'https://api-dot-get-hired-363107.et.r.appspot.com/api'` — intentional per spec |
| G17 | Domain migration: `index.html` OG/Twitter URL tags updated to `gethiredonline.app` | **PASS** | `og:url` and `twitter:url` both set to `https://gethiredonline.app` |
| G18 | B13 service does not expose applicant private data | **PASS** | Input interface contains only job-post fields; no applicant resume/email/phone/salary fields |

---

## Gate Results — 6 Targeted Recent Changes (P2, P2-01, CORS, PayMongo, F-08, DB column)

| # | Gate | Result | Evidence / Curl Scenario |
|---|------|--------|---------|
| G19 | P2: DELETE /job/delete route registered with verifyAuth | **PASS** | `jobsRoute.js` line 33: `router.delete("/job/delete", verifyAuth, deleteJob)` |
| G20 | P2: DELETE query scopes to caller's company_id from JWT | **PASS** | `WHERE job_id=$1 AND company_id=$2` where `$2 = callerCompany.companyId` from `getUserCompany(req.user.uid)` |
| G21 | P2: 0-row DELETE returns 404 (not 200, not 403) | **PASS** | `if (!rowCount \|\| rowCount === 0) return res.status(status.notfound)` — both "not found" and "wrong company" map to 404 |
| G22 | P2: NgRx chain wired end-to-end (action→effect→service→reducer) | **PASS** | `deleteJob` action dispatched from facade; effect calls `DELETE /job/delete` with `{ body: { jobId } }`; reducer handles all 3 states |
| G23 | P2-01: basiclist ignores req.query companyId; derives from JWT | **PASS** | `getJobBasicListOfCompany` reads `req.user.uid` only; never reads `req.query` |
| G24 | P2-01: expiredlist ignores req.query companyId; derives from JWT | **PASS** | `getExpiredJobListOfCompany` reads `req.user.uid` only; never reads `req.query` |
| G25 | CORS: single-origin allowlist (`env.app_url`) | **PASS** | `app.use(cors({ origin: env.app_url }))` where `env.app_url` reads `process.env.APP_URL` |
| G26 | PayMongo webhook: HMAC-SHA256 verification present | **PASS** | `verifyPaymongoSignature` uses `crypto.createHmac("sha256", secret).update(timestamp.rawBody)` |
| G27 | PayMongo webhook: timing-safe comparison | **PASS** | `crypto.timingSafeEqual(a, b)` used; no string `===` comparison |
| G28 | PayMongo webhook: replay attack window (5 min) | **PASS** | `Math.abs(now - timestamp) > 300` check present |
| G29 | PayMongo webhook: fail-closed when secret absent | **PASS** | `if (!secret) return false` — all requests rejected if env var missing |
| G30 | PayMongo webhook: `rawBody` available for sig verification | **PASS** | `server.js` line 92 sets `verify: (req, _res, buf) => { req.rawBody = buf; }` |
| G31 | F-08: `updateQuestionById` has company-scoped subquery when companyId provided | **PASS** | `WHERE company_id=$7` subquery through `job_interview_template` confirmed in `interview.service.js` |
| G32 | F-08: `interviewQuestionsUpdate` uses `await Promise.all(...)` (no fire-and-forget) | **PASS** | Line 354: `await Promise.all(interviewQuestions.map(async (question) => { ... }))` |
| G33 | F-08: companyId threaded from controller to service to updateQuestionById | **PASS** | `jobsController.js` line 374-379 passes `callerCompany.companyId` as 4th arg; `job.service.js` line 356 passes it to `updateQuestionById` |
| G34 | `PAYMONGO_WEBHOOK_SECRET` present in production .env | **NEEDS-MANUAL-VERIFY** | Absent from local `.env`; must verify on production server |
| G35 | `job_interview_template.company_id` column exists in production DB | **NEEDS-MANUAL-VERIFY** | No migration file found; query `information_schema.columns` on prod DB to confirm |

---

## Manual Verification Checklist (NEEDS-MANUAL-VERIFY items)

The following require access to a live environment and cannot be verified by static inspection:

**G34 — PayMongo webhook secret:**
```bash
# SSH to production server and run:
grep PAYMONGO_WEBHOOK_SECRET /path/to/.env
```
Expected: `PAYMONGO_WEBHOOK_SECRET=whsec_...`

**G35 — DB column existence:**
```sql
-- Run on production Postgres:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'gethired'
  AND table_name = 'job_interview_template'
ORDER BY ordinal_position;
```
Expected: `company_id` appears in result.

**G23b — basiclist null-company edge case:**
```bash
# Create a Firebase token for a user with no company record, then:
curl -X GET https://api.../api/job/basiclist \
  -H "Authorization: Bearer <token-for-no-company-user>"
# Expected: HTTP 200, data: []  (not 500)
```

**G19b — DELETE /job/delete BOLA test:**
```bash
# With token for company A, attempt to delete a job owned by company B:
curl -X DELETE https://api.../api/job/delete \
  -H "Authorization: Bearer <company-A-token>" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "<job-owned-by-company-B>"}'
# Expected: HTTP 404, { error: "Job not found or you do not have access." }
# NOT: 200 OK with deleted=true
```

**G20b — PayMongo webhook rejection without secret:**
```bash
# With empty/missing PAYMONGO_WEBHOOK_SECRET env var:
curl -X POST https://api.../api/payment/paymongowebhook \
  -H "Content-Type: application/json" \
  -d '{"data": {"attributes": {"type": "link.payment.paid"}}}'
# Expected: HTTP 400, { message: "Invalid webhook signature" }
```

---

## Overall Verdict

**ORIGINAL GATES (G1-G18): ALL PASS**

**NEW CHANGE GATES (G19-G35):**
- **PASS: G19-G33** (14 gates)
- **NEEDS-MANUAL-VERIFY: G34, G35** (2 gates — production env checks)

**Deployment approved from a code quality + static analysis standpoint.**
The 2 NEEDS-MANUAL-VERIFY items are production environment checks that cannot block code merge but must be confirmed before the payment webhook and interview question update features are considered fully operational.

---

## Non-Blocking Issues to Track

| ID | Severity | Issue |
|----|----------|-------|
| ISSUE-01 | Low | `jobTitle` is a blocking item in `JobReadinessService` but not explicitly checked in `publishJobPost()` — service is conservative (safer), not a regression |
| ISSUE-02 | Low | No unit test specs for B13/B05 new components; service is pure and highly testable |
| ISSUE-03 | Low | Child routes in `employer-jobs.module.ts` lack per-route `canActivate` guards (pre-existing) |
| ISSUE-04 | Info | `isInterviewRequired: false` hardcoded in preview step — aligns with B04 intent |
| ISSUE-05 | Low | `getJobBasicListOfCompany` and `getExpiredJobListOfCompany` missing `Array.isArray(callerCompany)` guard — inconsistent with `deleteJob` hardening pattern |
| ISSUE-06 | Info | FE `job.service.ts` sends redundant `?id=${companyId}` param to basiclist/expiredlist; BE ignores it completely |
| ISSUE-07 | Low | Pre-existing bug: `createQuestion` passes `rows` (array) instead of `rows[0]` to `mappedQuestion` — INSERT succeeds but return value is all-undefined; non-blocking since caller ignores return |

---

*This gate was generated by static code inspection. The production build was executed locally against the current working tree.*
