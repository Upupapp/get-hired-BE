# GETHIRED QA8 FIX SPRINT — TEST REPORT

**Date:** 2026-06-25
**Auditor:** Claude Code (automated static analysis + build verification)
**Scope:** FE job.effects.ts, job-create.component.ts, employer-panel.component.scss | BE jobsController.js, cvController.js, applicantsController.js, contactsController.js, companiesController.js

---

## 1. BUILD VERIFICATION

**Result: PASS**

Command: `node node_modules/@angular/cli/bin/ng build --configuration production`
Node: v14.21.3
Build time: ~20s

No compilation errors. Zero new errors introduced by QA8 changes.

### Pre-existing warnings (not introduced by QA8)
| File | Warning |
|---|---|
| `add-contact-group.component.scss` | autoprefixer: `start` value — use `flex-start` (2 instances) |
| `excel-downloader.service.ts` | CommonJS dependency `xlsx` causes optimization bailout |
| `legend+* CSS selector` | `Cannot read property 'type' of undefined` (postcss) |

All three warnings are pre-existing. No action required from QA8 sprint.

---

## 2. `changeJobStatus$` EFFECT — ANALYSIS

**File:** `src/app/job/state/job.effects.ts` lines 158–178

### Dispatch on success
YES. `map((res: any) => { const job: Model.Job = res.data; return JobActions.changeJobStatusSuccess({ job }); })` — dispatches `changeJobStatusSuccess` carrying the updated job on every 2xx response.

### Error handling (403 / 500)
PASS. The `catchError` block uses a safe normalisation pattern:
```ts
const body = (err && err.error) || {};
const payload: string = body.error || body.message || 'Unable to update job status. Please try again.';
return of(JobActions.changeJobStatusFail({ payload }))
```
- `body.error` handles BE's `{ error: "..." }` shape (generic 500).
- `body.message` handles BE's `{ message: "..." }` shape (403 JSON from QA8 fix).
- Fallback string ensures the reducer always receives a string even if `err.error` is null/undefined.
- `(err && err.error) || {}` guards against null `err` — no destructure crash possible.

### Assessment
CORRECT. Pattern is identical to the already-reviewed `job$` effect. No issues.

---

## 3. `createJobs` — LOGIC CORRECTNESS

**File:** `controllers/jobsController.js` lines 38–162

### getUserCompany usage
CORRECT. `callerCompany = await getUserCompany(uid)` where `uid = req.user.uid` (line 43). The returned `callerCompany.companyId` is passed as `$4` in the INSERT (line 101). `req.body.companyId` is never read at all — the body destructure does not include `companyId`.

### No-company path (getUserCompany returns [])
HANDLED. Line 84:
```js
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
```
`Array.isArray` guard correctly catches the `[]` return shape. Returns JSON 403. Safe.

### getUserCompany throws
HANDLED. The `await getUserCompany(uid)` call is inside the outer `try {}` block. If it throws, the `catch (error)` at line 157 catches it and returns `res.status(status.error).send(errorMessage)` (500). Safe.

### INSERT field coverage
CONFIRMED COMPLETE. INSERT includes:
`job_id, job_banner, job_title, company_id, industry_id, job_role_id, job_type_id, job_level_id, job_description, job_duties, work_setup_id, salary_minimum, salary_maximum, rate, job_address, created_at (current_timestamp), job_status_id, job_city, job_category_id, job_country, salary_currency`
That is 20 value params ($1–$20) plus `current_timestamp`. All required fields are present.

---

## 4. CV OWNERSHIP — CORRECTNESS

**File:** `controllers/cvController.js`

### getUserCVlist — WHERE clause
PASS. Line 162:
```js
const userId = req.user.uid;
const searchQuery = `SELECT * from ${dbSchema}.cv where user_id = $1;`;
const { rows } = await dbQuery.query(searchQuery, [userId]);
```
Returns ONLY the caller's CVs. The prior caller-supplied `userid` query param is ignored entirely. No BOLA exposure.

### getCvById — exact query
```sql
SELECT * from <schema>.cv where cv_id = $1 AND user_id = $2
```
`$1 = req.query.id`, `$2 = req.user.uid` (line 186). Ownership check is in the WHERE clause — no separate SELECT.

### HTTP status on 0 rows (getCvById)
Returns **403** with JSON body `{ message: "You don't have permission to view this CV." }` (line 189).

The FE will receive a 403 error in the HTTP error path. The FE's `catchError` in effect handling would need to handle this. **See edge case note in Section 8 below** — this is a functional concern, not a correctness bug in the BE itself.

---

## 5. APPLICANT SUB-ARRAY — CORRECTNESS (`saveWorkExp`)

**File:** `controllers/applicantsController.js` lines 294–330

### Ownership verification query
```sql
SELECT 1 FROM <schema>.applicants_profile
WHERE applicant_profile_id=$1 AND user_id=$2
```
`$1 = applicantProfileId` (from req.body), `$2 = uid` (from `req.user.uid`). Both columns are checked — mismatch on either returns 0 rows.

### Mismatch response
Returns **403** JSON `{ message: "You don't have permission to do that." }` (line 305). CORRECT.

### Mutation after check
Line 309: `deleteArrayApplicantEntry(applicantProfileId, ...)` and line 317: `saveApplicantWorkExperience(exp, applicantProfileId)`. Both use the caller-supplied `applicantProfileId` — **but** by this point it has been verified against `req.user.uid` in the ownership check above. The verified `applicantProfileId` is safe to use. CORRECT.

---

## 6. `createProfile` — CORRECTNESS

**File:** `controllers/applicantsController.js` lines 161–173

### Identity source
Line 165:
```js
const profile = await createApplicationProfile({ ...req.body, userId: req.user.uid });
```
The spread puts `req.body` fields first, then `userId: req.user.uid` **overwrites** any `userId` supplied in the body. JWT-derived uid always wins.

### Body poisoning test
If the body contains `userId: 'victim-uid'`, the spread `{ ...req.body, userId: req.user.uid }` overwrites it. The victim's UID is discarded. CORRECT — the fix works as intended.

### createApplicationProfile INSERT
`applicant.service.js` line 76: INSERT uses `$2 = userId` which is the overwritten, JWT-derived value. CORRECT.

---

## 7. `updateCompany` GUARD — CORRECTNESS

**File:** `controllers/companiesController.js` lines 103–186

### Array.isArray guard
YES. Line 141:
```js
if (Array.isArray(userCompany) || !userCompany || userCompany.companyId !== companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
```
`Array.isArray` is checked first (short-circuit). This correctly handles the case where `getUserCompany` returns `[]` (no company row) — without it, `!userCompany` would not catch `[]` since `[]` is truthy.

### JSON 403 response
YES. Returns `res.status(403).json(...)` — consistent JSON shape. CORRECT.

### Guard order
The check is: Array → falsy → companyId mismatch. All three failure paths correctly return 403 before any DB write occurs.

---

## 8. EDGE CASES

### createJobs: employer with two companies
`getUserCompany` joins `company_employees` on `employee_uuid = $1` and returns only `rows[0]` (line 210). If an employer is assigned to two companies, only the first DB row is returned — which company that is depends on DB insertion order (no ORDER BY in the query).

**Risk:** Medium. In the current product flow, an employer typically belongs to one company. However, multi-company membership is architecturally possible (the schema has no unique constraint enforcing one-to-one). If it occurs, the job is attributed to whichever company the DB returns first — silent data integrity issue, no security breach (the employer belongs to both).

**Recommendation:** Either add `ORDER BY ce.assigned_at ASC LIMIT 1` to `getUserCompany` for determinism, or add a constraint at the schema level, or accept the current behaviour as per-product-decision.

### getCvById: employer viewing applicant's submitted CV
BROKEN by QA8 FIX-4. `getCvById` now requires `user_id = req.user.uid`. An employer calling this endpoint with an applicant's `cv_id` will receive a 403 regardless of whether the employer owns the job application.

This is the intended scope boundary — the fix comment in cvController.js (lines 177–182) explicitly flags this:
> "NOTE: if an employer ever needs to view an applicant's CV in a job-application context, that must go through a separate scoped endpoint that verifies the employer's company owns the application — not through this applicant-facing route."

**Current state:** No such employer-scoped CV endpoint exists. If any employer-side UI currently calls `getCvById`, that flow is now broken.

**Action required (P2):** Audit whether any employer-panel component calls the `getCvById` route. If so, a separate endpoint `GET /cv/application?cvId=&applicationId=` with employer ownership check is needed before shipping that flow to employers.

### saveWorkExp: applicant_profile does not exist
If `applicantProfileId` does not exist in `applicants_profile` at all, the ownership SELECT returns 0 rows. The guard at line 304:
```js
if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
  return res.status(403).json(...);
}
```
Returns 403. CORRECT. There is no information leak distinguishing "profile doesn't exist" from "profile belongs to someone else."

---

## 9. ADDITIONAL FINDINGS

### job-create.component.ts — companyId still read from localStorage
`ngOnInit` line 123–125:
```ts
this.asyncLocalStorage.getItem('user')
  .then(user => { this.companyId = JSON.parse(user).companyId; });
```
`this.companyId` is used in `formatJob()` (line 433: `companyId: this.companyId`) and sent to the BE in the job create/update payload. The BE's QA8 FIX-2 now **ignores** `req.body.companyId` in `createJobs` and derives it from the JWT instead — so the FE's localStorage-sourced `companyId` cannot cause a BOLA. However `this.companyId` is also used in `publishJobPost()` (line 374: `job.companyId` in the readiness check) for local UI validation only. The BE fix makes this FE-side value harmless for security, but the local readiness check still gates publish on `companyId` being truthy — localStorage must be set for publish to be enabled. This is a pre-existing design dependency, not introduced by QA8.

### contactsController.js — `list` and `grouplist` endpoints not guarded
`list` (line 155) and `grouplist` (line 178) still accept `companyId` from `req.query` and pass it directly to service functions with no ownership verification. Any authenticated user who knows a companyId can enumerate that company's contacts and groups.

**Risk:** Medium BOLA. Not in QA8 scope, but should be added to backlog.

### applicantsController.js — saveVideoCV missing ownership check
`saveVideoCV` (lines 486–502) calls `updateProfileSaveVideoCV(video, applicantProfileId, uid)` passing `uid`, but there is no prior ownership guard SELECT — unlike `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, and `saveDocuments` which all received the QA8 FIX-5 ownership check. If `updateProfileSaveVideoCV` internally enforces `user_id = uid`, the gap is covered in the service layer; if not, this is a missed BOLA.

**Recommendation:** Verify `updateProfileSaveVideoCV` in `applicant.service.js` enforces ownership, or add the same guard pattern as the other sub-array endpoints.

---

## SUMMARY TABLE

| Task | Finding | Status |
|---|---|---|
| 1. Build | PASS — no errors, 3 pre-existing warnings | PASS |
| 2. changeJobStatus$ | Success dispatch correct; 403/500 error normalisation correct; safe body read | PASS |
| 3. createJobs companyId | JWT-derived, not body-derived; correct INSERT param order | PASS |
| 3. createJobs no-company path | Array.isArray guard present; 403 JSON returned | PASS |
| 3. createJobs throws | Outer catch handles getUserCompany throw | PASS |
| 3. createJobs INSERT fields | All 20 required fields present | PASS |
| 4. getUserCVlist | WHERE user_id=$1 from req.user.uid; no param leakage | PASS |
| 4. getCvById query | cv_id=$1 AND user_id=$2; ownership in WHERE | PASS |
| 4. getCvById 0-rows status | Returns 403 JSON | PASS |
| 5. saveWorkExp ownership | SELECT on applicant_profile_id AND user_id; 403 on mismatch | PASS |
| 5. saveWorkExp mutation | Uses verified applicantProfileId | PASS |
| 6. createProfile body poisoning | req.user.uid overwrites body userId via spread order | PASS |
| 7. updateCompany Array.isArray | Guard present and checked first | PASS |
| 7. updateCompany JSON 403 | Returns res.status(403).json(...) | PASS |
| 8. Two-company edge case | Non-deterministic (no ORDER BY); medium risk; no fix in scope | FINDING |
| 8. Employer CV view | Broken by design; no employer-scoped CV endpoint exists | FINDING (P2) |
| 8. saveWorkExp non-existent profile | 0 rows → 403; no info leak | PASS |
| Extra. saveVideoCV missing guard | No ownership SELECT before mutation | FINDING (P2) |
| Extra. list/grouplist no auth | companyId from query param, unauthenticated BOLA | FINDING (backlog) |

### Overall verdict
**QA8 fix sprint: PASS with findings.**
All QA8-targeted fixes are logically correct. Three findings require follow-up actions outside this sprint:
1. **(P2)** Employer-scoped CV endpoint needed before any employer UI reads applicant CVs.
2. **(P2)** `saveVideoCV` missing QA8 FIX-5 ownership guard — verify service layer or add guard.
3. **(Backlog)** `list` and `grouplist` contact endpoints accept unauthenticated `companyId` from query params.
