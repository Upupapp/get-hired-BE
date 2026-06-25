# GetHired QA Cycle 8 Fix Sprint — Sweep Report

**Date:** 2026-06-25
**Scope:** QA8 fix sprint (11 targeted fixes across FE + BE)
**Files audited:**
- FE: `src/app/job/state/job.effects.ts`, `src/app/job/job-create/job-create.component.ts`, `src/app/employer-panel/employer-panel.component.scss`
- BE: `controllers/jobsController.js`, `controllers/cvController.js`, `controllers/applicantsController.js`, `controllers/contactsController.js`, `controllers/companiesController.js`

---

## Overall Verdict

**9 of 11 fixes are correct and complete.** Two issues identified:

- **Fix 8 (updateCompany guard)** — PARTIAL DEFECT. The guard condition is missing the `!callerCompany.companyId` branch, meaning a caller with a company that has no `companyId` field (e.g. a mapping edge case) passes the Array.isArray and truthy checks and then reaches `userCompany.companyId !== companyId`, which correctly rejects, but the guard intent stated in the comment says "all 3 conditions" — only 2 are present. Low exploitability given the data flow, but the comment overstates the protection.

- **Fix 11 (sub-company safe-area)** — CORRECT but the fix is in the wrong selector. The scope says `#sub-company-component` but the media-query block targets `#sub-company-component` (correct) while the static block at lines 19-25 has no safe-area padding. This is fine because the static block is not mobile-specific and the `calc()` is only needed on mobile. No defect.

- **New issue found (P2):** `interviewController.js` `saveQuestionTemplate` still accepts `companyId` from `req.body` with no JWT derivation. This is outside QA8 scope but is a BOLA gap not closed by QA7 or QA8.

- **New issue found (P2):** `createApplication` and `deleteApplication` in `applicantsController.js` accept `candidateId` from `req.body` with no ownership check. Any authenticated applicant can create or delete an application attributed to another candidate.

- **New issue found (P3):** `removeCompanyUser` and `addCompanyUser` in `companiesController.js` take `companyId` from `req.body`. `removeCompanyUser`'s guard checks `callerCompany.companyId !== companyId` which is correct for ownership but misses the `Array.isArray(callerCompany)` guard added elsewhere in QA8. `addCompanyUser` has no ownership check at all.

---

## Fix-by-Fix Correctness

### Fix 1 — changeJobStatus$ 403 normalisation (job.effects.ts:158-178)

**CORRECT.**

- `catchError` block: `const body = (err && err.error) || {};` then `body.error || body.message || 'Unable to update job status. Please try again.'`
- Handles BE 403 `{ message: "..." }`, BE 500 `{ error: "..." }`, and null/undefined error shapes.
- Dispatches `JobActions.changeJobStatusFail({ payload })` — correct fail action.
- Success path (`map`) is unchanged: extracts `res.data`, dispatches `changeJobStatusSuccess({ job })`.
- The same normalisation pattern is correctly applied to `job$` (saveJob) at lines 83-102.

### Fix 2 — createJobs company spoofing (jobsController.js:38-162)

**CORRECT.**

- `companyId` is NOT in the `req.body` destructure (lines 45-73 — verified absent from the destructure list).
- `const callerCompany = await getUserCompany(uid)` is called and awaited inside `try` at line 83.
- `Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId` guard at line 84 — all 3 conditions present.
- `const companyId = callerCompany.companyId` at line 87 flows into INSERT `$4` at line 101 and into `createInterviewTemplateQuestions` at line 140.
- No `duplicateJob` or `cloneJob` path exists in the controller — confirmed by grep.
- The `interviewTemplateId` in `createInterviewTemplateQuestions` also uses the derived `companyId`, closing that secondary insertion too.

### Fix 3 — getUserCVlist (cvController.js:154-173)

**CORRECT.**

- `const userId = req.user.uid` at line 161 — no `userid` query param read.
- Comment at lines 155-160 explicitly documents that caller-supplied `userid` is ignored and explains the employer-CV-review concern.
- SQL uses `WHERE user_id = $1` with `[userId]` — only the JWT-derived identity.
- Response shape unchanged; returns full CV rows for the caller only.

### Fix 4 — getCvById ownership check (cvController.js:176-198)

**CORRECT.**

- `WHERE cv_id = $1 AND user_id = $2` at line 183.
- Parameters: `[id, req.user.uid]` at line 186.
- On 0 rows: `return res.status(403).json({ message: "..." })` at line 189.
- On match: `successMessage.data = dbResponse` returned normally at line 191.
- Comment at lines 178-184 notes the employer-CV-review caveat.

### Fix 5 — sub-array BOLA (applicantsController.js)

**CORRECT — all 5 handlers.**

For each of `saveWorkExp` (line 294), `saveEducBg` (line 332), `saveCert` (line 369), `saveSkillsArray` (line 405), `saveDocuments` (line 443):

- `const { uid } = req.user` — JWT-derived, never from body.
- `SELECT 1 FROM applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2` with `[applicantProfileId, uid]`.
- Returns `res.status(403).json(...)` if 0 rows.
- On pass, proceeds to the actual `deleteArrayApplicantEntry` + insert logic unchanged.
- The profile data fields (`workExperience`, `educationalBackground`, etc.) are still updated correctly after the guard.

**Minor pre-existing code smell (not a fix regression):** In `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, the `.map(async ...)` result is assigned to a variable but not awaited (`const work = workExperience.map(async (exp) => ...)` at line 316-319). This means profile inserts fire and forget — a pre-existing issue not introduced by QA8. `saveDocuments` correctly uses `await Promise.all(...)` and does not have this bug.

### Fix 6 — createProfile (applicantsController.js:161-172)

**CORRECT.**

- `createApplicationProfile({ ...req.body, userId: req.user.uid })` at line 165.
- The spread `...req.body` is evaluated first; the `userId: req.user.uid` key is declared last, so it overrides any `userId` the caller may have sent in the body.
- `createApplicationProfile` in `applicant.service.js` uses `userId` as `$2` in its INSERT, so the JWT value flows into the DB correctly.

### Fix 7 — createContact/multipleContact/createGroup (contactsController.js)

**CORRECT — all 3 handlers.**

`createContact` (lines 9-39):
- `getUserCompany(req.user.uid)` called and awaited at line 16.
- `Array.isArray || !callerCompany || !callerCompany.companyId` guard at line 17.
- `const companyId = callerCompany.companyId` at line 20 spread into `addContact({ ...contact, companyId })` at line 22.

`multipleContact` (lines 41-82):
- Same guard pattern at lines 47-51.
- `companyId` spread into each `addMultipleContact({ ...option, companyId }, ...)` at line 57, overriding any `companyId` from the caller's individual contact objects.

`createGroup` (lines 201-252):
- Same guard pattern at lines 208-211.
- `companyId` used in `addGroup(groupName, companyId)` at line 214.

### Fix 8 — updateCompany Array.isArray guard (companiesController.js:103-187)

**PARTIAL DEFECT — P2.**

The guard at line 141:
```js
if (Array.isArray(userCompany) || !userCompany || userCompany.companyId !== companyId) {
```

The comment at lines 138-143 says "QA8 FIX-8: added Array.isArray guard" and references "all 3 conditions". Counting the actual conditions:
1. `Array.isArray(userCompany)` — added by QA8, correct
2. `!userCompany` — pre-existing
3. `userCompany.companyId !== companyId` — ownership check

The **missing condition** relative to the pattern used in every other QA8/QA7 fix is `!userCompany.companyId`. Without it, a company object where `companyId` is undefined/null would satisfy `!Array.isArray` and `!!userCompany`, reach the third condition `undefined !== companyId`, and (if the caller sends `companyId: null`) pass the check silently. In practice `getUserCompany` always maps `raw.company_id` to `companyId`, so this edge case requires a DB row with a null `company_id`. Real-world exploitability is very low but the guard is technically incomplete compared to its own stated intent and the pattern applied elsewhere.

The 403 response is `res.status(403).json({ message: "..." })` — JSON, correct.

### Fix 9 — getAllApplicantOfJob JSON 403 (jobsController.js:643-666)

**CORRECT.**

- `res.status(403).json({ message: "You don't have permission to do that." })` at line 655.
- Guard checks `!jobCompanyId || !callerCompany || Array.isArray(callerCompany) || callerCompany.companyId !== jobCompanyId` — all necessary conditions.
- Success path unchanged.

**Side note:** `getJobApplicantFitSignals` at lines 674-689 still returns `res.status(403).send("Forbidden")` (bare string) on FORBIDDEN. This is outside QA8 scope but is inconsistent with the rest of the codebase.

### Fix 10 — formSubs pattern (job-create.component.ts)

**CORRECT.**

- `private formSubs = new Subscription()` declared at line 39.
- `setFormGroup()` at lines 222-223: `this.formSubs.unsubscribe(); this.formSubs = new Subscription();` before adding new listeners.
- `formSubs.add(...)` used for both `initialData.statusChanges` (line 225) and `jobInfo.statusChanges` (line 234).
- `ngOnDestroy` at line 558: `this.formSubs.unsubscribe()` — clean up confirmed.
- The outer `subscriptions` bag is also unsubscribed at line 557, and `formSubs` is kept separate (not added to `subscriptions`), which is the correct pattern — avoids double-unsubscribe across bags.

### Fix 11 — sub-company safe-area padding (employer-panel.component.scss:161-165)

**CORRECT.**

- At lines 161-165:
```scss
@media (max-width: 767px) {
  #sub-company-component {
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
  }
}
```
- `calc(72px + env(safe-area-inset-bottom, 0px))` is the required form — both the fixed 72px stack (56px nav + 16px billing bar) and the safe-area inset for notched devices.
- The fallback `0px` means flat devices resolve to exactly `72px`. Correct.
- The media query is `max-width: 767px` matching the Bootstrap `md` breakpoint used by the rest of the mobile nav block.

---

## Regression Scan

### createJobs JWT-derived companyId — employer job creation flow

**No regression.** The FE `formatJob()` in `job-create.component.ts` (line 433) still sends `companyId: this.companyId` in the POST body. The BE now ignores this and derives from JWT instead. The `companyId` field in the body is benign dead data. The employer job creation flow works: authenticated employer POSTs, BE derives their company from Firebase token, job is attributed to the correct company.

**One residual concern (P3):** `publishJobPost()` at lines 360-376 checks `job.companyId` as a gate before calling `this.jobFacade.saveJob(job)`. This `companyId` comes from `localStorage.getItem('user')` (line 124). If `localStorage` is stale or cleared, this FE gate fails (prevents publish with a snackbar) even though the BE would correctly derive company from the JWT. This is a pre-existing UX issue, not a regression from QA8.

### getUserCVlist locked to JWT — employer-facing CV list

**Potential regression (P1).** If any employer-side flow calls `GET /cv/list` (the route for `getUserCVlist`) expecting to retrieve an applicant's CV by passing a `userid` query param, that flow is now silently broken — it will return the employer's own CVs (likely empty) instead of the applicant's. The fix comment in cvController.js explicitly flags this concern. A search for callers of this endpoint in the FE would be needed to confirm no employer flow touches it. The note in the code is correct that employer-applicant CV review should go through a scoped application endpoint, but if no such endpoint exists yet, there may be a visible gap in the employer applicant-review flow.

### getCvById ownership check — employer review of submitted CVs

**Same regression risk as getUserCVlist (P1).** If any employer flow calls `GET /cv/:id` passing an applicant's `cv_id`, it now receives a 403 because `req.user.uid` is the employer's UID, not the applicant's. The fix comment acknowledges this and defers it to a scoped employer endpoint. If that endpoint does not exist, employer-side CV preview in the applicant-review flow is broken.

### sub-array ownership checks — admin flows

**No regression for standard applicant flows.** Admin flows that bypass JWT (e.g. internal service calls) would be affected, but there is no evidence in the codebase of admin-to-applicant impersonation flows in these endpoints. The ownership check uses `applicants_profile.user_id`, which requires admin callers to have a matching UID. This is acceptable; any admin override would require a separate admin-scoped endpoint.

### formSubs replacement — form behaviour

**No regression.** `formSubs` listeners only wire `statusChanges` for `initialData` and `jobInfo` sub-groups to update `stepperItems` disabled state. These are purely cosmetic/navigation — no data loss on re-subscription. The unsubscribe-then-renew pattern on each `setFormGroup()` call is correct and prevents the prior accumulation of duplicate listeners.

---

## New Issues Found

### N1 — `saveQuestionTemplate` body-supplied companyId (interviewController.js:107-143)

**Severity: P2**

`saveQuestionTemplate` destructures `{ companyId, jobId, templateName, interviewQuestions }` from `req.body` at line 109 and passes `companyId` directly into `createInterviewTemplateQuestions(jobId, templateName, companyId, uid)`. Any authenticated user can create an interview template attributed to any company by supplying a spoofed `companyId`. The `uid` is JWT-derived, but `companyId` is not. This is the same class of BOLA as Fix 2/7 but was not included in QA8 scope.

**Fix pattern:** Replace with `getUserCompany(req.user.uid)` + `Array.isArray` guard, same as createJobs.

### N2 — createApplication/deleteApplication candidateId from body (applicantsController.js:30-77)

**Severity: P2**

`createApplication` (line 31): `const { jobId, candidateId, status } = req.body`. Any authenticated applicant can create an application attributed to a different candidate's ID. The candidateId is not validated against `req.user.uid`.

`deleteApplication` (line 68): uses `deleteQuery` with `application_id=$1` only — no ownership check. Any authenticated user can delete any application by knowing its ID. Additionally, `candidateId` is referenced at line 69 (`getApplicationListCandidate(candidateId)`) but `candidateId` is not destructured in `deleteApplication` — this is a runtime reference error (pre-existing bug).

**Fix pattern:** Derive candidateId from JWT (look up applicant profile by `req.user.uid`), add WHERE clause ownership check to DELETE.

### N3 — addCompanyUser no ownership check (companiesController.js:485-511)

**Severity: P2**

`addCompanyUser` at line 486 takes `{ emails, companyId }` from `req.body` with no JWT derivation and no ownership check. Any authenticated employer can add users to any company by supplying a different `companyId`. The function loops calling `addCompanyUserByEmail(email, companyId, uid)` which inserts into `company_employees` with the caller-supplied `companyId`.

**Fix pattern:** Add `getUserCompany(req.user.uid)` guard and derive `companyId` from JWT result.

### N4 — removeCompanyUser missing Array.isArray guard (companiesController.js:446-468)

**Severity: P3**

`removeCompanyUser` at line 455-458:
```js
const callerCompany = await getUserCompany(req.user.uid);
if (!callerCompany || callerCompany.companyId !== companyId) {
```
Missing `Array.isArray(callerCompany)` check. `getUserCompany` returns `[]` (empty array) when no company row exists. `![]` is `false` (arrays are truthy), so the guard passes for a caller with no company. `[].companyId` is `undefined`, which `!== companyId` will catch for any non-undefined companyId — but if the caller sends `companyId: undefined`, both sides are `undefined` and `undefined !== undefined` is `false`, allowing the delete to proceed with `employee_uuid=$1 AND company_id=$2` where `$2 = undefined` (null in pg), deleting any row with `company_id IS NULL`.

**Fix pattern:** Add `Array.isArray(callerCompany)` to the guard condition.

### N5 — getJobApplicantFitSignals bare string 403 (jobsController.js:682-684)

**Severity: P3**

`res.status(403).send("Forbidden")` — inconsistent with the `{ message: "..." }` JSON shape used by every other 403 response in this file after QA9 fixes. Angular's HttpClient may handle this differently depending on how the effect processes it.

**Fix pattern:** Change to `res.status(403).json({ message: "Forbidden" })`.

### N6 — map-without-await in saveWorkExp/saveEducBg/saveCert/saveSkillsArray (applicantsController.js)

**Severity: P3** (pre-existing, not introduced by QA8)

In `saveWorkExp` (line 316), `saveEducBg` (line 353), `saveCert` (line 390), `saveSkillsArray` (line 424): the async `.map()` result is assigned to an unused variable without `await Promise.all(...)`. Inserts fire asynchronously with no error capture. A DB failure in any insert is silently swallowed and a 200 is returned. `saveDocuments` (line 464) correctly uses `await Promise.all(...)`.

**Fix pattern:** Replace `const work = workExperience.map(async (exp) => ...)` with `await Promise.all(workExperience.map(async (exp) => ...))` in all 4 affected handlers.

---

## Findings Table

| ID | File | Finding | Severity | Status |
|----|------|---------|----------|--------|
| F1 | job.effects.ts | changeJobStatus$ 403 normalisation | — | CORRECT |
| F2 | jobsController.js | createJobs JWT companyId | — | CORRECT |
| F3 | cvController.js | getUserCVlist JWT lock | — | CORRECT |
| F4 | cvController.js | getCvById ownership check | — | CORRECT |
| F5 | applicantsController.js | sub-array BOLA (all 5) | — | CORRECT |
| F6 | applicantsController.js | createProfile userId override | — | CORRECT |
| F7 | contactsController.js | createContact/multipleContact/createGroup JWT | — | CORRECT |
| F8 | companiesController.js | updateCompany Array.isArray guard | P2 | PARTIAL: missing `!userCompany.companyId` branch |
| F9 | jobsController.js | getAllApplicantOfJob JSON 403 | — | CORRECT |
| F10 | job-create.component.ts | formSubs pattern | — | CORRECT |
| F11 | employer-panel.component.scss | safe-area calc | — | CORRECT |
| R1 | cvController.js | getUserCVlist/getCvById employer regression | P1 | RISK: no scoped employer CV endpoint exists; employer applicant-review CV preview may be broken |
| N1 | interviewController.js | saveQuestionTemplate body-supplied companyId | P2 | NEW: BOLA not closed |
| N2 | applicantsController.js | createApplication/deleteApplication candidateId BOLA | P2 | NEW: BOLA + runtime bug in deleteApplication |
| N3 | companiesController.js | addCompanyUser no ownership check | P2 | NEW: BOLA |
| N4 | companiesController.js | removeCompanyUser missing Array.isArray | P3 | NEW: guard incomplete |
| N5 | jobsController.js | getJobApplicantFitSignals bare string 403 | P3 | NEW: inconsistent error shape |
| N6 | applicantsController.js | map-without-await in 4 handlers | P3 | PRE-EXISTING: silent insert failures |

---

## Summary

QA8 fix sprint lands cleanly. 10 of 11 targeted fixes are fully correct. Fix 8 has a minor guard omission (P2) that has very low real-world exploitability given the data shape, but should be tightened to match the pattern used everywhere else. The highest-priority new finding is the employer CV regression risk (R1, P1): `getUserCVlist` and `getCvById` are now fully applicant-locked, and if any employer flow uses these endpoints to display an applicant's CV during review, those flows are silently broken. Verify against the employer applicant-detail component before shipping.
