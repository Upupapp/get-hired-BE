# GETHIRED QA9 Fix Sprint — Test Report
**Date:** 2026-06-25
**Scope:** QA Cycle 9 fix sprint changed files
**BE:** applicantsController.js, applicant.service.js, companiesController.js, interviewController.js, jobsController.js, candidateController.js, contactsController.js
**FE:** package.json (xlsx 0.18.5), job-list.component.ts

---

## 1. Build Verification

**Result: PASS**

Command: `ng build --configuration production`
Duration: ~17 seconds

Output (clean, no errors):
- Browser application bundle generation: complete
- Assets copy: complete
- Index HTML generation: complete (1 non-blocking CSS warning from autoprefixer — `start` value in `add-contact-group.component.scss` line 344-345; pre-existing, unrelated to QA9 changes)

Bundle sizes:
- main.js: 1.41 MB raw / 331.94 kB transfer
- styles.css: 485.10 kB raw / 41.60 kB transfer

**No new errors or warnings introduced by QA9 changes.**

---

## 2. createApplication / deleteApplication — Logic

### createApplication
**File:** `controllers/applicantsController.js` lines 30-63

**INSERT fields:**
```sql
INSERT INTO {schema}.application
  (job_id, candidate_id, applicationdate, status)
  VALUES ($1, $2, now(), $3)
```
Parameters bound as: `[jobId, candidateId, status]`

**Is candidate_id = req.user.uid?** YES.
Line 34: `const candidateId = req.user.uid;`
Comment at line 32-33 explicitly documents the QA9 FIX-1 BOLA fix — candidateId is derived from JWT, never from `req.body`.

**Does the FE send candidateId in the body?**
The FE application service (`src/app/application/application.service.ts`) posts to `/application/apply` with a `Model.Application` object. The `Application` interface (`application.model.ts`) includes a `candidateId: string` field. So the FE does send `candidateId` in the body — but the BE now ignores it entirely (reads `req.user.uid` only). This is correct and safe.

**Status: PASS** — BOLA fixed, FE body field is ignored server-side.

---

### deleteApplication
**File:** `controllers/applicantsController.js` lines 65-83

**DELETE WHERE clause:**
```sql
DELETE FROM {schema}.application
  WHERE application_id=$1 AND candidate_id=$2
```
Parameters: `[applicationId, candidateId]` where `candidateId = req.user.uid` (line 69).

**Is it candidate_id=$1 AND req.user.uid?** YES. The `candidateId` variable is JWT-derived (line 69), used as `$2`. The `application_id` is the row to delete (`$1`). The WHERE clause correctly scopes the delete to the authenticated caller's own applications.

**Status: PASS** — ownership enforced in DELETE WHERE.

---

## 3. saveVideoCV — Logic

### Controller ownership check
**File:** `controllers/applicantsController.js` lines 500-529

The ownership check queries `applicants_profile`, NOT `applicants`:
```sql
SELECT 1 FROM {schema}.applicants_profile
  WHERE applicant_profile_id=$1 AND user_id=$2
```
Parameters: `[applicantProfileId, uid]`

**Does it query the right table?** YES — `applicants_profile`, which is the correct table for this ownership check (the same table that all other profile array save handlers use: saveWorkExp, saveEducBg, saveCert, saveSkillsArray, saveDocuments — all use the identical query on `applicants_profile`).

**Does the video upload proceed after ownership check passes?**
YES — on lines 517-521, after the ownership check passes, `updateProfileSaveVideoCV(video, applicantProfileId, uid)` is called and awaited correctly. No code path skips the upload after a passing check.

### Service error throw
**File:** `services/applicant.service.js` lines 542-579

**Is `throw new Error('...')` now in the service instead of `throw error`?**
YES — line 567:
```javascript
throw new Error('Failed to save video CV');
```
Comment at lines 564-567 documents the QA9 FIX-2b: was `throw error` (ReferenceError — `error` is not defined in the try block at that point). Now uses a safe static message. The outer `catch` at line 576 correctly re-throws as `throw error`, which is valid there because `error` is in scope.

**Status: PASS** — correct table, upload proceeds after check, ReferenceError fixed.

---

## 4. Interview Controller Ownership Checks

### saveQuestionTemplate
**File:** `controllers/interviewController.js` lines 110-158

**Is getUserCompany called and awaited?** YES.
Line 117: `const callerCompany = await getUserCompany(uid);`

Guard at lines 118-120 checks `Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId` before any write. Returns 403 if any condition is true. **Ownership check returns BEFORE createInterviewTemplateQuestions is called (line 125).**

### updateJobInterviewQuestion
**File:** `controllers/interviewController.js` lines 160-190

**Exact join for ownership:**
```sql
SELECT itq.template_question_id
  FROM {schema}.interview_template_question itq
  JOIN {schema}.job_interview_template jit
    ON jit.job_interview_template_id = itq.job_interview_template_id
  WHERE itq.template_question_id=$1 AND jit.company_id=$2
```
Tables: `interview_template_question` (alias `itq`) joined to `job_interview_template` (alias `jit`).

getUserCompany called (line 166) and awaited. 403 returned before `updateQuestionById` (line 182) if guard or ownership check fails.

### deleteInterviewQuestion
**File:** `controllers/jobsController.js` lines 692-727

Uses **identical join** to `updateJobInterviewQuestion`:
```sql
SELECT itq.template_question_id
  FROM {schema}.interview_template_question itq
  JOIN {schema}.job_interview_template jit
    ON jit.job_interview_template_id = itq.job_interview_template_id
  WHERE itq.template_question_id=$1 AND jit.company_id=$2
```
getUserCompany called (line 698) and awaited. 403 returned before `dbQuery.query(deleteQuery, ...)` (line 714) if any check fails.

**All three handlers return 403 BEFORE any write?** YES — confirmed for all three.

**Status: PASS** — all three handlers have correct ownership checks in place before writes.

---

## 5. deleteCandidate — Logic

**File:** `controllers/candidateController.js` lines 63-98

### What is company_id in the candidates table?
Per the comment at line 65-67: `company_id` is set **at import time** (when a candidate is added to the system by a company, e.g., via bulk CSV import or manual add). The `addCandidates` service populates it from the employer's company at creation time.

### Does DELETE WHERE candidate_id=$1 AND company_id=$2 correctly scope to the employer's company?
YES. The DELETE query (lines 82-85):
```sql
DELETE FROM {schema}.candidates
  WHERE candidate_id=$1 AND company_id=$2
```
`company_id` is `callerCompany.companyId` — JWT-derived (line 75). Zero `rowCount` (either not found or company mismatch) returns 403 (line 86-88). This correctly prevents cross-company candidate deletion.

### What happens if a candidate was imported by two different companies?
This is a data model concern. If the `candidates` table stores a single `company_id` per row (not a junction table), then a candidate imported by company A would have `company_id = A`. If company B tries to delete them, the WHERE clause fails and returns 403 — correct behavior. However, if the business requirement is for a candidate to genuinely belong to two companies simultaneously, the current schema cannot express that and each company would need its own row. **This is a pre-existing schema design question, not a regression introduced by QA9.**

**Status: PASS** — ownership check correctly scoped. Cross-company import scenario is a pre-existing design question.

---

## 6. Contacts list / grouplist — Logic

**File:** `controllers/contactsController.js`

### list (lines 155-182)
**Before QA9:** Was reading `companyId` from `req.query.companyId` (not present in the new code).
**After QA9 FIX-12:** Calls `getUserCompany(req.user.uid)` (line 161, awaited), derives `companyId` from the result. Returns 403 if caller has no company. The `req.query.companyId` is **no longer read**.

### grouplist (lines 184-210)
Same pattern: `getUserCompany(req.user.uid)` (line 190, awaited), `companyId` from result. Returns 403 if no company. Query param ignored.

### Does the FE still send companyId as a query param?
YES — `contacts.service.ts` line 16:
```typescript
this.http.get(`${this.server}/contacts/list?companyId=${data.payload}`)
```
And `groups.service.ts` line 16:
```typescript
this.http.get(`${this.server}/groups/list?companyId=${data.payload}`)
```

**Is this a problem?** NO. The BE now ignores the query param entirely and uses JWT-derived companyId instead. The FE sending `?companyId=X` is harmless — the BE reads from JWT. The FE param is silently ignored. This is the intended behavior for the BOLA fix.

**Side effect to note:** The FE sends a stale/user-sourced companyId that will never be used server-side. This is safe but slightly misleading. No behavioral regression — the BE determines the correct company from the token.

**Status: PASS** — BOLA fixed. FE query param is sent but ignored by BE.

---

## 7. xlsx 0.18.5 — Compatibility

**package.json confirmed version:** `"xlsx": "^0.18.5"` (line 60 of FE `package.json`).

**XLSX API usage in FE codebase:**
File: `src/app/shared/services/excel/excel-downloader.service.ts`
```typescript
import * as XLSX from 'xlsx';
// Usage:
XLSX.utils.json_to_sheet(json)       // line 16
XLSX.WorkBook / XLSX.WorkSheet types // lines 16-17
XLSX.write(myworkbook, { bookType: 'csv', type: 'array' })  // line 18
```

**Is this API compatible with 0.18.5?**
YES. `XLSX.utils.json_to_sheet`, `XLSX.write` with `bookType: 'csv'` and `type: 'array'`, and the `WorkSheet`/`WorkBook` type interfaces are all stable APIs present in xlsx 0.18.x. There are no breaking API changes between 0.17.x and 0.18.5 for these three specific calls.

**Build verification (Task 1) confirms no runtime import error:** The production bundle compiled successfully with xlsx 0.18.5 installed.

**Status: PASS** — version confirmed, API compatible, build clean.

---

## 8. jobError$ Subscription

**File:** `src/app/job/job-list/job-list.component.ts`

### Is there exactly one subscription to jobError$?
YES — **one subscription** in `ngOnInit` (lines 139-148):
```typescript
this.req.add(
  this.jobFacade.jobError$.pipe(takeUntil(this.unsubscribe$)).subscribe((err) => {
    if (err) {
      this.snackBar.open(err, '', { duration: 4000, panelClass: ['danger-snackbar'] });
    }
  })
);
```

The comment at lines 72-76 documents the QA9 FIX-13 that **removed a duplicate class-field subscription** (previously there was a second `error$` or direct subscription at field initialization level). The current code has only the one subscription above.

### Is it properly cleaned up?
YES — dual cleanup mechanism:
1. `takeUntil(this.unsubscribe$)` operator — completes the inner observable when `unsubscribe$` emits.
2. `this.req.add(...)` — adds it to the composite `Subscription` object.
3. `ngOnDestroy` (line 284): `if (this.req) this.req.unsubscribe();` — unsubscribes the entire `req` composite on destroy.

Both `takeUntil` and `req.unsubscribe()` will fire on component destroy, which is correct and safe (not harmful to double-cleanup).

**Status: PASS** — exactly one subscription, properly cleaned up.

---

## 9. Edge Cases

### 9a. createApplication: duplicate application
**What if the same applicant applies twice?**

The INSERT query (line 37-39):
```sql
INSERT INTO {schema}.application (job_id, candidate_id, applicationdate, status)
  VALUES ($1, $2, now(), $3) returning *;
```

There is no explicit `ON CONFLICT DO NOTHING` or unique constraint guard in the controller code. Whether this creates a duplicate or fails depends on whether the `application` table has a `UNIQUE(job_id, candidate_id)` constraint in the database schema.

- If the DB has a unique constraint: the INSERT will throw a `unique_violation` error (PostgreSQL code `23505`). The `catch` block (lines 58-62) will catch it and return a generic 500 error message — **the constraint is enforced, but the error response is not user-friendly** (returns "Operation not successful" rather than "You have already applied to this job").
- If the DB has no unique constraint: duplicate applications will silently be created.

**The QA9 fix does not change this behavior** — it only changes *where* `candidateId` comes from. The uniqueness question is a pre-existing design gap not introduced by QA9.

**Finding: NEUTRAL** — unchanged by QA9. DB-level constraint behavior is pre-existing.

---

### 9b. saveVideoCV: null applicantProfileId
**What if `applicantProfileId` is null/undefined in req.body?**

The ownership check query (lines 509-514):
```sql
SELECT 1 FROM {schema}.applicants_profile
  WHERE applicant_profile_id=$1 AND user_id=$2
```
If `applicantProfileId` is `null` or `undefined`, PostgreSQL receives `$1 = NULL`. A WHERE clause `applicant_profile_id = NULL` always evaluates to false (NULL equality requires `IS NULL`, not `=`). So `ownerCheck.rows` will be an empty array `[]`.

The guard check (line 513): `ownerCheck.rows.length === 0` will be `true`, and the handler returns 403.

**Result: safe** — a null `applicantProfileId` causes a 403 (not a crash or a privilege escalation). The query itself does not crash because the driver handles `null` as a SQL NULL parameter.

**Status: PASS** — null applicantProfileId safely rejected with 403.

---

### 9c. contacts list with JWT: caller has no company
**What if the caller has no company?**

`getUserCompany` (`companiesController.js` lines 189-215) returns `[]` (empty array, not null) when no row is found (line 202-204):
```javascript
if (!rows || rows.length == 0) {
  return [];
}
```

Both `list` and `grouplist` guards check `Array.isArray(callerCompany)` first:
```javascript
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
```

`Array.isArray([])` is `true`, so a caller with no company hits the 403 immediately. **This is correct.**

**Status: PASS** — no-company caller correctly returns 403 via Array.isArray guard.

---

## Summary Table

| # | Test | File(s) | Result | Notes |
|---|------|---------|--------|-------|
| 1 | Build (production) | FE package.json | PASS | No errors; 2 pre-existing autoprefixer CSS warnings |
| 2a | createApplication — fields & candidateId | applicantsController.js | PASS | JWT-derived; FE body candidateId ignored |
| 2b | deleteApplication — WHERE clause | applicantsController.js | PASS | application_id=$1 AND candidate_id=$2 (JWT) |
| 3a | saveVideoCV — correct table in ownership check | applicantsController.js | PASS | Uses applicants_profile, not applicants |
| 3b | saveVideoCV — upload proceeds after check | applicantsController.js | PASS | No skip path |
| 3c | saveVideoCV — throw new Error vs throw error | applicant.service.js | PASS | ReferenceError eliminated |
| 4a | saveQuestionTemplate — getUserCompany awaited | interviewController.js | PASS | Awaited; 403 before any write |
| 4b | updateJobInterviewQuestion — join | interviewController.js | PASS | itq JOIN jit ON template_id; company_id=$2 |
| 4c | deleteInterviewQuestion — join | jobsController.js | PASS | Identical join; 403 before DELETE |
| 5 | deleteCandidate — company_id scope | candidateController.js | PASS | DELETE WHERE candidate_id=$1 AND company_id=$2 (JWT) |
| 6a | contacts list — JWT-derived companyId | contactsController.js | PASS | getUserCompany used; query param ignored |
| 6b | grouplist — JWT-derived companyId | contactsController.js | PASS | Same pattern |
| 6c | FE contacts param now ignored | contacts.service.ts / groups.service.ts | PASS | Harmless; BE ignores it |
| 7 | xlsx 0.18.5 — version + API compat | package.json, excel-downloader.service.ts | PASS | API stable, build clean |
| 8a | jobError$ — exactly one subscription | job-list.component.ts | PASS | Duplicate removed (FIX-13) |
| 8b | jobError$ — cleanup | job-list.component.ts | PASS | takeUntil + req.unsubscribe() |
| 9a | Edge: duplicate application | applicantsController.js | NEUTRAL | Pre-existing; DB constraint determines behavior |
| 9b | Edge: null applicantProfileId | applicantsController.js | PASS | NULL param → empty rows → 403 |
| 9c | Edge: contacts list, no company | contactsController.js, companiesController.js | PASS | Array.isArray([]) → 403 |

---

## Issues Found (Non-Blocking)

### ISSUE-1: FE contacts/groups services still send stale companyId query param
**Severity:** Low (cosmetic / dead code)
**Files:** `contacts.service.ts` line 16, `groups.service.ts` line 16
**Detail:** Both services send `?companyId=${data.payload}` to `/contacts/list` and `/groups/list` respectively. After QA9 FIX-12, the BE ignores these params entirely. The param is harmless but misleading — it suggests the FE controls which company's data is returned, which is no longer true. No security risk. Future cleanup: remove the unused query params from the FE service calls.

### ISSUE-2: getApplicationWithJobDetails — pre-existing SQL syntax error
**Severity:** Low (pre-existing, out of QA9 scope)
**File:** `controllers/applicantsController.js` line 145
**Detail:** `on a.candidate_id = c a.candidate_id` — this is a malformed SQL join condition (space before `a.candidate_id`). This function is only called by `updateApplication` (line 100), which itself uses unscoped `candidateId` from req.body without a BOLA fix. Both issues pre-date QA9 and are called out by a code comment at lines 136-140. Not a regression.

### ISSUE-3: createApplication — duplicate application error message not user-friendly
**Severity:** Low (UX gap, pre-existing)
**Detail:** If a unique constraint exists on `(job_id, candidate_id)` in the application table, a duplicate INSERT will return a generic "Operation not successful" error. A more helpful "You have already applied to this job" message is not returned. Pre-existing; unchanged by QA9.

### ISSUE-4: employer-contacts job-list.component — not implementing OnDestroy
**Severity:** Low
**File:** `src/app/employer-panel/employer-contacts/job-list/job-list.component.ts`
**Detail:** This component (different from the employer-jobs job-list) declares `private req: Subscription` and `private unsubscribe$ = new Subject<void>()` but implements only `OnInit` (not `OnDestroy`). The `req` subscription (line 78-101) is never unsubscribed. This is a separate component from the QA9-fixed job-list; the QA9 fix was applied to `src/app/job/job-list/job-list.component.ts`. Pre-existing leak, not introduced by QA9.

---

## Overall Verdict

**QA9 Fix Sprint: PASS**

All 7 BE files and 2 FE files pass their targeted test tasks. The production build is clean. All BOLA fixes are correctly implemented (JWT-derived IDs in place of body/query params). The saveVideoCV ownership check uses the correct table. Interview question ownership joins are correct and consistent across interviewController and jobsController. The contacts BOLA fix works and the no-company edge case is safe. xlsx 0.18.5 is compatible with existing FE usage. The jobError$ duplicate subscription is resolved and cleanup is correct.

Four low-severity non-blocking issues found — all pre-existing except the cosmetic FE dead-param issue (ISSUE-1), which is a harmless byproduct of the BOLA fix that can be cleaned up in a future sprint.
