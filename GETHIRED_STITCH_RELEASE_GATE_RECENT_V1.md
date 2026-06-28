# GETHIRED STITCH RELEASE GATE — RECENT DEPLOYMENT — V1 (UPDATED 2026-06-25)

**Date:** 2026-06-25
**Scope:** 7 integration seams from the recent deployment cycle

---

## Gate Summary

| Gate | Check | Status | Severity |
|---|---|---|---|
| G1 | deleteJob route+method+body contract | PASS | — |
| G2 | deleteJob BOLA guard | PASS | — |
| G3 | NgRx deleteJob chain (all 11 links) | PASS | — |
| G4 | PayMongo webhook header format | PASS | — |
| G5 | PayMongo HMAC algorithm + rawBody | PASS | — |
| G6 | PayMongo constant-time compare + replay | PASS | — |
| G7 | CORS origin (production) | PASS | — |
| G8 | CORS origin (staging) | FAIL | LOW (staging only) |
| G9 | F-08 callerCompanyId 4-layer threading | PASS | — |
| G10 | P2-01 basiclist/expiredlist harmless mismatch | PASS | — |
| G11 | job_interview_template company_id column | FAIL | P0 |
| G12 | job_interview_template created_by column | FAIL | P0 |

---

## Detailed Verdicts

### G1 — deleteJob route+method+body: PASS

FE sends `DELETE /api/job/delete` with JSON body `{ jobId }` via Angular's `HttpClient.delete(url, { body: { jobId } })`.
BE registers `router.delete("/job/delete", verifyAuth, deleteJob)` and reads `const { jobId } = req.body`.
Method, path, and body field name all match. Response shapes (200/404/403/500) all covered by FE error normalisation.

---

### G2 — deleteJob BOLA guard: PASS

BE never reads `companyId` from the request body. It uses `getUserCompany(req.user.uid)` (JWT-derived) and scopes the DELETE: `WHERE job_id=$1 AND company_id=$2`. An attacker supplying a different `jobId` in the body with a different company's ID in the body has no effect — the body `companyId` is simply ignored.

---

### G3 — NgRx deleteJob chain: PASS

Action dispatched → effect triggered → service call made with correct body → success/fail dispatched with correct props → reducer handles both → UI reacts. All 11 links verified. Fallback `res.data || []` in the effect guards against null data.

---

### G4 — PayMongo header format: PASS

Header name `paymongo-signature` is correct (Express lowercases all headers). The `t=`, `li=`, `te=` parsing is correct. Live sig (`li`) is preferred over test sig (`te`) — correct.

---

### G5 — PayMongo HMAC + rawBody: PASS

Algorithm is `HMAC-SHA256(secret, "${timestamp}.${rawBody}")` — matches PayMongo docs. `rawBody` is captured as a Buffer before JSON parsing via `express.json({ verify: ... })` in `server.js`. No timing or ordering risk.

---

### G6 — PayMongo constant-time compare + replay: PASS

`crypto.timingSafeEqual` used. 5-minute replay window enforced. The `padEnd` normalization is non-standard but safe (see DEFER-S2 in fix log for the idiomatic alternative).

---

### G7 — CORS origin (production): PASS

`app.use(cors({ origin: env.app_url }))` with `env.app_url` reading from `process.env.APP_URL`. If that env var is set to `https://gethiredonline.app` on the production server (which it should be), CORS allows exactly the correct FE origin and nothing else.

---

### G8 — CORS origin (staging): FAIL (LOW severity)

**Blocked for staging deployments only.** The staging branch of `env.js` has:
```javascript
app_url: process.env.APP_URL_DEV ? process.env.APP_URL : 'http://localhost:4200'
```
Should be `process.env.APP_URL_DEV` (not `process.env.APP_URL`) as the value. This is a typo that causes staging CORS to point to the wrong origin when `APP_URL_DEV` is set but `APP_URL` is not.

**Production is NOT affected** (it uses the `is_staging == "false"` branch which correctly reads `APP_URL`).

One-line fix in `env.js` line 58 — see DEFER-S1 in fix log.

---

### G9 — F-08 callerCompanyId threading: PASS

`callerCompanyId` is threaded from the controller through `interviewQuestionsUpdate` through `updateQuestionById` into the SQL WHERE clause as a subquery constraint on `job_interview_template.company_id`. Defence-in-depth verified at all 4 layers. Primary ownership gate is the parent `updateJob` WHERE `company_id=$20`; the child-level scope is additive.

---

### G10 — P2-01 basiclist/expiredlist ?id= param: PASS

FE sends `?id=companyId` — a harmless leftover from before the BOLA fix. BE handlers `getJobBasicListOfCompany` and `getExpiredJobListOfCompany` do not read `req.query` at all; they derive the scope entirely from the JWT. No data-exposure or data-integrity risk. No code change needed.

---

### G11/G12 — job_interview_template schema: FAIL (P0)

**This gate is blocking for any job creation that includes interview questions.**

The `createInterviewTemplateQuestions` function inserts 6 columns including `company_id` and `created_by`. The tracked DDL files (`db/job_ddl.sql`, `db/complete_ddl.sql`) define only 5 columns — neither `company_id` nor `created_by` is present. No migration SQL file adds them.

If the production DB was built from these DDL files without a separate console migration:
- `POST /api/job/create` with interview questions → 500 error (Postgres column error)
- `POST /api/interview/create` → 500 error

**Required before marking ready:**
1. Run `\d gethired.job_interview_template` on production Postgres
2. If columns are absent, run the migration SQL in `GETHIRED_STITCH_FIX_LOG_RECENT_V1.md`
3. Update `db/job_ddl.sql` to include the two columns

---

## Overall Release Verdict

| Area | Status |
|---|---|
| deleteJob (FE/BE, NgRx) | READY |
| PayMongo webhook | READY |
| CORS (production) | READY — verify APP_URL env var |
| F-08 callerCompanyId threading | READY |
| P2-01 basiclist/expiredlist | READY |
| job_interview_template schema | BLOCKED — verify live DB columns |

**Single P0 blocker:** Verify that `company_id` and `created_by` columns exist on the live `gethired.job_interview_template` table. If they do not, apply the ALTER TABLE migration before the next job-creation flow is used in production.
