# GETHIRED STITCH REPORT — RECENT DEPLOYMENT — V1 (UPDATED 2026-06-25)

**Date:** 2026-06-25
**Scope:** 7 targeted integration seams — deleteJob, NgRx chain, PayMongo webhook, CORS, F-08, P2-01 basiclist/expiredlist, job_interview_template schema.
**Result:** 6 PASS / 1 FAIL (P0 schema gap on job_interview_template)

---

## Seam 1 — deleteJob: FE DELETE /job/delete with { jobId }

### Request shape
- **FE:** `this.baseService.delete(\`${jobUrl}/delete\`, { body: { jobId } })`
  - `BaseService.delete(url, options)` passes options directly to `HttpClient.delete(url, options)` — the `{ body: { jobId } }` option is the correct Angular pattern for attaching a body to a DELETE request.
- **BE route:** `router.delete("/job/delete", verifyAuth, deleteJob)` at `DELETE /api/job/delete` — protected by verifyAuth.
- **BE controller:** `const { jobId } = req.body;` — reads `jobId` only; `companyId` is never read from body.

### Response shape
| Outcome | Status | Body |
|---|---|---|
| Success | 200 | `{ status: "success", data: BasicList[] }` — refreshed list scoped to caller's company |
| Job not found / wrong company | 404 | `{ error: "Job not found or you do not have access." }` |
| No company for caller | 403 | `{ message: "Job not found or you do not have access." }` |
| Server error | 500 | `{ error: "Operation not successful. Please try again." }` |

### Error contract
FE effect normalises both `body.error` and `body.message`: `body.error || body.message || fallback` — handles all three BE error shapes without crash. MATCH.

### BOLA
`companyId` derived exclusively from Firebase JWT via `getUserCompany(req.user.uid)`. No attacker-supplied `companyId` accepted. DELETE WHERE `job_id=$1 AND company_id=$2` — ownership enforced at SQL level.

### Verdict: PASS

---

## Seam 2 — NgRx deleteJob chain contract

### Full chain
1. **UI:** `job-list.component.ts` calls `this.jobFacade.deleteJobPost(jobId)` after confirmation modal closes with result `1`.
2. **Facade:** `JobFacade.deleteJobPost(jobId)` dispatches `JobActions.deleteJob({ jobId })`.
3. **Effect:** `deleteJob$` catches `JobActions.deleteJob`, calls `JobService.deleteJobPost(action.jobId)`.
4. **Service:** `JobService.deleteJobPost(jobId)` sends `DELETE /api/job/delete` with `{ body: { jobId } }`.
5. **BE:** Returns 200 with `{ status: "success", data: BasicList[] }`.
6. **Effect (success):** Dispatches `deleteJobSuccess({ basicList: res.data || [] })` — `|| []` guards against null data.
7. **Effect (fail):** Normalises `body.error || body.message || fallback` → dispatches `deleteJobFail({ payload: string })`.
8. **Reducer (success):** Sets `loading: false`, `list: action.basicList`, `succesMsg: 'deleted'`, `error: null`.
9. **Reducer (fail):** Sets `loading: false`, `error: action.payload`, `succesMsg: null`.
10. **UI (success):** `afterChange('deleted')` branch shows confirmation toast; list reflects BE-returned refreshed data.
11. **UI (fail):** `jobError$` selector surfaces error to snackbar (from QA8 BRAND FIX-B).

### Verdict: PASS
All 11 links in the chain are wired and shapes agree at every boundary.

---

## Seam 3 — PayMongo webhook: header, HMAC, rawBody, timing, replay

### Header name
`req.headers["paymongo-signature"]` — Express lowercases all headers, PayMongo sends `paymongo-signature`. MATCH.

### Header format parsed
`t={timestamp},li={live_sig},te={test_sig}` — split on `,`, split on first `=`. Extracts `t`, `li` (live), `te` (test). Prefers `li` over `te`. Correct.

### HMAC computation
`crypto.createHmac("sha256", secret).update(\`${timestamp}.${rawBody}\`, "utf8").digest("hex")` — matches PayMongo docs exactly.

### rawBody capture
`server.js` line 90-93: `express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } })` — Buffer is captured before JSON parse mutates the body. `req.rawBody.toString("utf8")` used in webhook handler. CORRECT.

Fallback: if `req.rawBody` is absent (should not happen in production), falls back to `JSON.stringify(req.body)` which would produce an incorrect HMAC for non-trivial payloads (key ordering may differ). This is a degraded dev path only; production always has `rawBody`.

### Constant-time compare
`crypto.timingSafeEqual(a, b)` used. Correct.

**Low-severity note:** Signature is zero-padded via `sig.padEnd(expected.length, "0")` before converting to a Buffer. If `sig` is shorter than `expected` (64 hex chars), padding makes them equal-length before `timingSafeEqual`. If `sig` is longer, `padEnd` is a no-op and the `a.length !== b.length` guard correctly rejects. Safe, but non-idiomatic — standard practice is to compare two freshly-computed hex strings of the same known length.

### Replay protection
5-minute window: `Math.abs(Date.now()/1000 - parseInt(timestamp)) > 300 → false`. CORRECT.

### Webhook secret
`env.paymongo_webhook_secret` from `PAYMONGO_WEBHOOK_SECRET` env var in non-staging production. Staging configs omit it → falsy check at top of `verifyPaymongoSignature` returns `false` → 400 rejection. Acceptable for non-prod.

### Verdict: PASS (with low-severity padEnd note)

---

## Seam 4 — CORS: env.app_url vs production FE origin

### Production path (IS the one that matters)
`server.js` line 89: `app.use(cors({ origin: env.app_url }))`

`env.js` `is_staging == "false"` path:
```javascript
app_url: process.env.APP_URL ? process.env.APP_URL : 'http://localhost:4200'
```
If `APP_URL=https://gethiredonline.app` is set on the production Linode server, CORS allows exactly the FE production origin.

FE `environment.prod.ts` line 7: `app_url: 'https://gethiredonline.app'` (informational — FE origin to match).

### PASS condition
`APP_URL=https://gethiredonline.app` in production `.env` → CORS allows the correct origin. Cannot be verified from source files alone but the plumbing is correct.

### Staging env.js bug (does NOT affect production)
In the staging `else` branch:
```javascript
app_url: process.env.APP_URL_DEV ? process.env.APP_URL : 'http://localhost:4200'
```
Checks `APP_URL_DEV` for truthiness but reads `APP_URL` (not `APP_URL_DEV`) as the value. If `APP_URL_DEV` is set but `APP_URL` is unset/wrong, staging CORS uses the wrong origin. Logged as deferred item DEFER-S1.

### Verdict: PASS for production — BUG in staging path (deferred)

---

## Seam 5 — F-08: interviewQuestionsUpdate callerCompanyId threading

### Call chain traced
1. `jobsController.js updateJob`: `getUserCompany(req.user.uid)` → `callerCompany.companyId`
2. `interviewQuestionsUpdate(jobId, interviewQuestions, interviewTemplateId, callerCompany.companyId)` — 4th arg is the threaded companyId
3. `job.service.js interviewQuestionsUpdate(jobId, qs, templateId, companyId = null)` — receives it and calls `updateQuestionById(question, companyId)` per question
4. `interview.service.js updateQuestionById(interviewQuestion, companyId = null)`:
   - If `companyId` supplied: SQL uses subquery `WHERE itq.job_interview_template_id IN (SELECT ... WHERE company_id=$7)` — ownership scope at question level
   - If `companyId` is null (legacy callers): falls back to question_id-only WHERE — acceptable because those callers are behind the parent ownership gate

### Verdict: PASS
`callerCompanyId` threaded through all 4 layers: controller → `interviewQuestionsUpdate` → `updateQuestionById` → SQL subquery. Defence-in-depth confirmed.

---

## Seam 6 — P2-01: basiclist/expiredlist — FE ?id=companyId vs BE ignoring it

### FE calls
```
GET /api/job/basiclist?id={companyId}    ← JobService.getJobBasicList(companyId)
GET /api/job/expiredlist?id={companyId}  ← JobService.getJobExpiredList(companyId)
```

### BE handlers
- `getJobBasicListOfCompany`: does NOT read `req.query` at all. Calls `getUserCompany(req.user.uid)` and uses the JWT-derived `callerCompany.companyId`. The `?id=` param is silently ignored.
- `getExpiredJobListOfCompany`: same pattern.

### Contract status
- FE still sends `?id=companyId` — harmless. No BE code path reads it. The extra query string parameter is dropped.
- FE still receives `companyId` from the store and dispatches it (e.g., `getBasicJobList({ companyId })`), but the value is never used by the BE. The BE is authoritative.
- No breakage: FE-supplied `companyId` being wrong/stale has no effect on the BE response.

### Verdict: PASS (benign mismatch — BE correctly ignores; security-correct behavior)

---

## Seam 7 — job_interview_template INSERT: company_id + created_by columns

### INSERT statement in interview.service.js (lines 48-50)
```sql
INSERT INTO ${dbSchema}.job_interview_template
  (job_interview_template_id, job_interview_template_name, created_at, job_id, company_id, created_by)
  VALUES($1, $2, $3, $4, $5, $6)
```

### DDL files (source of truth for schema)
**db/job_ddl.sql** (lines 165-173) — `gethired.job_interview_template`:
```
job_interview_template_id, job_interview_template_name, created_at, updated_at, job_id
```
**NO `company_id` column. NO `created_by` column.**

**db/complete_ddl.sql** (lines 312-319) — `jobhunt.job_interview_template`:
```
job_interview_template_id, job_interview_template_name, created_at, updated_at, job_id
```
**Same — NO `company_id`, NO `created_by`.**

No migration file found in `db/` directory that adds these columns via ALTER TABLE.

### Callers that pass non-null companyId
1. `jobsController.js createJobs` (line 137-142): `createInterviewTemplateQuestions(jobId, "default", companyId, uid)` — companyId = `callerCompany.companyId` (non-null)
2. `interviewController.js` (line 136-141): `createInterviewTemplateQuestions(jobId, templateName, companyId, uid)` — companyId = `callerCompany.companyId` (non-null)

### Risk
**P0 BLOCKER.** If the production database was created from `job_ddl.sql` or `complete_ddl.sql` without a separate column-add migration, then `company_id` and `created_by` do not exist on the live table. Every call to `createInterviewTemplateQuestions` with a non-null `companyId` will throw:
```
PostgreSQL ERROR: column "company_id" of relation "job_interview_template" does not exist
```
This blocks:
- Job creation when interview questions are provided
- Creating a new interview template via `interviewController.js`

### Mitigation
The columns may have been added directly to the production DB via a psql console session (outside the tracked DDL files). If so, the code is correct and only the DDL files are stale. **Verification is required.**

### Required action
Run on the production Postgres instance:
```sql
\d gethired.job_interview_template
```
Confirm `company_id` and `created_by` columns exist. If they do not, apply the migration in `GETHIRED_STITCH_FIX_LOG_RECENT_V1.md`.

### Verdict: FAIL — schema gap unverified (P0 if columns absent from live DB)

---

## Summary Table

| # | Seam | Status | Notes |
|---|---|---|---|
| 1 | deleteJob FE→BE contract | PASS | Route, method, body, response, error shape all match |
| 2 | NgRx deleteJob chain | PASS | All 11 links wired; shapes agree at every boundary |
| 3 | PayMongo webhook | PASS | Header, HMAC, rawBody, timing-safe compare, replay all correct |
| 4 | CORS origin | PASS (prod) | Staging env.js has APP_URL_DEV bug (deferred DEFER-S1) |
| 5 | F-08 callerCompanyId threading | PASS | 4-layer threading confirmed; SQL subquery ownership scope |
| 6 | P2-01 basiclist/expiredlist ?id= | PASS | FE sends it, BE ignores safely — security-correct |
| 7 | job_interview_template schema | FAIL (P0) | DDL missing company_id + created_by; verify live DB |
