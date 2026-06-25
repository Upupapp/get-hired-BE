# GETHIRED QA8 Fix Sprint — STITCH Integration Audit Report

**Date:** 2026-06-25
**Scope:** QA Cycle 8 fix sprint changed files only
**FE files:** job.effects.ts, job-create.component.ts, employer-panel.component.scss
**BE files:** jobsController.js, cvController.js, applicantsController.js, contactsController.js, companiesController.js

---

## SUMMARY

All seven integration contracts audited. **No P1 regressions found.**
The CV endpoint fix (getUserCVlist / getCvById) is safe — confirmed zero employer-facing FE callers.
One P2 warning (changeJobStatus UI state gap) and two P3 notes below.

---

## 1. changeJobStatus$ FE↔BE Contract

### What the FE sends

`JobService.changeJobStatus(status, jobId)` issues:
```
PUT /job/changestatus  { status, jobId }
```
Both values come from the NgRx action `changeJobStatus({ status, jobId })`.

The action is dispatched in `job-list.component.ts` line 206:
```
this.jobFacade.changeJobStatus(4, event.hasOwnProperty('data') ? event.data.jobId : event.jobId);
```
`event.jobId` is taken from the job object in the store's `basicList` — it is the row's own `jobId` from the BE response, not a user-typed input. There is no spoofing risk here.

### BE ownership check

`updateStatusOfJob` in `jobsController.js` (lines 374–390):
- Calls `getUserCompany(req.user.uid)` to derive the caller's company from the JWT.
- Passes `callerCompany.companyId` as `$3` in the `UPDATE WHERE job_id=$2 AND company_id=$3` query.
- Zero rows → throws `"FORBIDDEN"` → 403 JSON `{ message: "..." }`.

### FE error normalisation (QA8 fix)

`job.effects.ts` lines 167–173 now normalises the 403 body correctly:
```typescript
const body = (err && err.error) || {};
const payload: string = body.error || body.message || 'Unable to update job status. Please try again.';
```
Before this fix, a 403 with `{ message: "..." }` (no `error` key) would have caused a destructure crash (`const { error } = err.error`) and dispatched `undefined` as the error payload. The fix is correct.

`changeJobStatusFail` stores `action.payload` on `state.error` (reducer line 86). **The reducer does not surface `state.error` as a snackbar or UI message.** The FE consumer (`job-list.component.ts`) only listens on `success$` (which maps to `succesMsg`). There is no `error$` subscriber that would show the error string to the user after a 403.

> **P2 Warning:** A `changeJobStatusFail` (including a 403 "you don't own this job") is silently swallowed — the user sees no error feedback. This is a pre-existing gap, not introduced by QA8, but worth noting.

### Post-success UI state

On `changeJobStatusSuccess`, the reducer sets:
- `state.selected = action.job` (updated job object)
- `state.succesMsg = action.job.jobStatusId == 4 ? 'archived' : 'expired'`

`job-list.component.ts` `afterChange()` at line 212 reacts to `'archived'` by calling `this.jobFacade.getBasicList(this.user.companyId)`, which re-fetches the active job list. The archived job will be absent from the new list because `getBasicJobList` with `statusId=0` excludes `job_status_id IN (3,4)`. The UI correctly removes the archived job from the active list.

**Verdict: contract is intact.**

---

## 2. createJobs FE↔BE Contract

### What the FE sends

`job-create.component.ts` `formatJob()` (lines 422–437) builds the POST body:
```typescript
{
  ...initialData.value,   // jobTitle, jobTypeId, jobLevelId, jobAddress, jobCity, jobCountry,
                           // jobDescription, jobDuties, jobCategoryId, workSetupId, jobBanner,
                           // bannerFile, badges, requirements, goodToHave, educationalBackground,
                           // certificationRequirements
  ...jobInfo.value,        // industryId, jobRoleId, skills, tags, rate, salaryMinimum,
                           // salaryMaximum, salaryCurrency
  badges: formatBadgesGetId(...),
  interviewQuestions,
  interviewTemplateId,
  companyId: this.companyId,   // <-- FE still sends companyId
  jobStatusId: status,
  jobId: this.jobId
}
```

The FE **does** send `companyId` in the body. `this.companyId` is sourced from `localStorage.getItem('user').companyId` at ngOnInit (line 124).

### BE handling of body companyId (QA8 FIX-2)

`createJobs` in `jobsController.js` (lines 79–88) now **ignores** `req.body.companyId` entirely and derives it from the JWT:
```javascript
const callerCompany = await getUserCompany(uid);
const companyId = callerCompany.companyId;
```

The FE's `companyId` field in the body is harmlessly ignored. The fix is correct and the job will be attributed to the authenticated caller's company regardless of what `companyId` the client sends.

### Does job creation still work end-to-end?

The BE INSERT uses the JWT-derived `companyId` for `$4` (the `company_id` column). On success, `mappedJob(rows[0])` returns the created job and `saveJobSuccess` stores it in `state.selected`. The `job-create.component.ts` `afterSubmit()` navigates to `/recruiter/jobs/applicants?id=<jobId>` after publish. The job will appear in `getBasicJobList` because it queries `WHERE company_id = $1` using the same JWT-derived company. **End-to-end intact.**

> **P3 Note (future clean-up):** The FE still sends `companyId` in the body even though the BE now ignores it. The `publishJobPost()` validation at line 373 still checks `job.companyId` as a required field for publish gating. This is harmless — the BE ignores it, the localStorage value is always the correct company for the logged-in employer — but the check is now redundant. Low priority.

### saveJob error normalisation (QA8 fix, same as changeJobStatus$)

`job.effects.ts` lines 94–98 now use the same `body.error || body.message` normalisation for `saveJobFail`. Correct.

---

## 3. getUserCVlist / getCvById — Employer CV Review Flow

### FE search result

Searched the entire FE `src/` tree for all of:
- `getUserCVlist`, `getCvById`, `getCVList`, `getUserCV`, `getCV`, `CvService`, `cvService`

**Result: zero matches in any FE file.**

The CV endpoints are not called by any FE component. There is no employer-facing candidate review component that uses these routes.

### CV route callers confirmed

The only FE CV interaction found is `applicant.service.ts`, which does not reference any CV read endpoint at all. The CV module (`createCV`, `updateCV`, `deleteCV`, `getUserCVlist`, `getCvById`) appears to be a legacy data layer that the current Angular FE does not actively consume.

### Fix verdict

**SAFE. Not a P1 regression.**

The QA8 fix locking `getUserCVlist` (FIX-3) and `getCvById` (FIX-4) to `req.user.uid` cannot break any employer workflow because no employer-facing FE code calls these endpoints. The BE comment in cvController.js is accurate: "if an employer ever needs to view an applicant's CV in a job-application context, that must go through a separate scoped endpoint."

---

## 4. Applicant Sub-Array BOLA Fix — FE Contract

### What the FE sends

`applicant.service.ts` lines 46–72:
```typescript
saveWorkExperience(workExp, profileId) {
  return this.baseService.post('.../applicant/workexp',
    { workExperience: workExp, applicantProfileId: profileId });
}
saveEducationalBackground(educBg, profileId) { ... applicantProfileId: profileId }
saveCertifications(cert, profileId)          { ... applicantProfileId: profileId }
saveDocuments(docs, profileId)               { ... applicantProfileId: profileId }
```

All sub-array endpoints send `{ <data>, applicantProfileId }` in the body.

### Where does applicantProfileId come from?

Trace:
1. `profile-forms.component.ts` line 58: `this.applicantFacade.getApplicantById(this.user._id)` — fetches the logged-in user's own profile.
2. `getBasicInfo()` at line 63: `this.applicantProfileId = data.applicantProfileId` — takes the profile ID from the fetched profile response, not from any user input.
3. `skills-experience.component.ts` receives `applicantProfileId` as an `@Input()` from the parent form (line 23).
4. The facade dispatches `saveWorkExperience(action.workExperience, action.profileId)` (applicant.effects.ts line 70), which passes the profile ID sourced from the store.

The `applicantProfileId` is always derived from the server response for the logged-in user's own profile. It is not a user-editable field.

### BE ownership check (QA8 FIX-5)

`saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, `saveDocuments` in `applicantsController.js` all now perform:
```javascript
const { uid } = req.user;
const ownerCheck = await dbQuery.query(
  `SELECT 1 FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2`,
  [applicantProfileId, uid]
);
if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
```

Because the FE always sends the logged-in user's own `applicantProfileId`, this ownership check will always pass for legitimate requests. The fix is additive and correct.

**Applicant profile editing still works end-to-end.**

> **P3 Note:** The FE error handlers for all applicant sub-array effects use `const { error } = err.error`. If the BE now returns `{ message: "..." }` on a 403, the destructure will yield `undefined` (not a crash, but the error payload stored in state will be `undefined`). This is a minor inconsistency — only triggered for the adversarial case (caller sending a spoofed `applicantProfileId`), not the normal case.

---

## 5. createContact / createGroup / multipleContact — FE Contract

### What the FE sends for createContact

`import-add-contact.component.ts` `saveOnboard()` (lines 198–223):
```typescript
let data = {
  ...this.contactForm.value,     // firstName, lastName, email, mobileNumber, address, jobId, groupName, groupId
  userId: this.localData._id,
  companyId: this.localData.companyId   // <-- FE sends companyId from localStorage
}
this.contactState.dispatch({ type: ContactActionTypes.SAVE_CONTACT, payload: data });
```

For CSV bulk upload (`uploadFile`, line 324):
```typescript
element.userId = this.localData._id;
element.companyId = this.localData.companyId;   // set per record
```

### BE handling (QA8 FIX-7)

`createContact` and `multipleContact` in `contactsController.js` (lines 9–82):
```javascript
const callerCompany = await getUserCompany(req.user.uid);
const companyId = callerCompany.companyId;
const add = await addContact({ ...contact, companyId })  // JWT-derived companyId overrides body
```

The spread `{ ...contact, companyId }` uses the JWT-derived `companyId` as the last property, which **overrides** any `companyId` in the contact body. This is correct.

`createGroup` follows the same pattern (lines 201–252).

### Is the FE's companyId causing any conflict?

No. The FE's body `companyId` is overridden by the JWT-derived value. In the normal case (legitimate employer using their own account), localStorage `companyId` matches the JWT-derived value anyway, so the effective behaviour is identical to before the fix.

**Verdict: contract is intact and the fix is transparent to the FE.**

---

## 6. updateCompany Contract

### What the FE sends

`company-details-form.component.ts` `onSubmit()` (lines 192–218):
```typescript
this.companyFacade.updateCompany({
  ...this.companyDetailsForm.value,
  companyId: this.company.companyId,   // <-- from store: getUserCompany() response
  workSetupId: parseInt(...),
  industryId: parseInt(...)
});
```

`this.company` is populated from `companyFacade.companyDetails$`, which is populated by `getUserCompany()` on the BE — the same JWT-scoped query. So `this.company.companyId` is always the same value that the BE's `getUserCompany(req.user.uid)` would return.

### BE ownership check (SECURE fix, QA8 FIX-8)

`updateCompany` in `companiesController.js` (lines 140–143):
```javascript
const userCompany = await getUserCompany(req.user.uid);
if (Array.isArray(userCompany) || !userCompany || userCompany.companyId !== companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
```

This checks that the body's `companyId` matches the JWT-derived company. Since both sides derive from the same source (`getUserCompany` on BE, which was used to populate the store on FE), they will always match for a legitimate update.

**QA8 FIX-8 specifically added the `Array.isArray(userCompany)` guard**, fixing the case where `getUserCompany` returns `[]` (no company row). Without this guard, `![]` is `false` (arrays are truthy), so a user with no company could reach the UPDATE. With the guard, they get 403.

**Verdict: contract is intact and FIX-8 is correct.**

---

## 7. Anti-Corruption — Response Shapes and Imports

### getUserCompany import correctness

| File | Import | Correct? |
|------|--------|---------|
| jobsController.js | `import { getUserCompany } from "./companiesController"` | Yes |
| contactsController.js | `import { getUserCompany } from "./companiesController"` | Yes |
| companiesController.js | Defines `getUserCompany`, used internally | Yes |
| applicantsController.js | Does not import getUserCompany (uses direct DB query for ownership check) | Correct — QA8 FIX-5 uses applicants_profile table, not company lookup |

All imports are correct.

### HTTP response codes for successful operations

| Endpoint | Success code | Correct? |
|----------|-------------|---------|
| createJobs | `status.success` (200) | Yes — pre-existing, not changed |
| updateStatusOfJob | `status.success` (200) | Yes |
| createContact | `status.success` (200) | Yes |
| createGroup | `status.success` (200) | Yes |
| saveWorkExp / saveEducBg / saveCert / saveSkillsArray / saveDocuments | `status.success` (200) | Yes |
| getUserCVlist | `status.success` (200) | Yes |
| getCvById | `status.success` (200) | Yes |
| updateCompany | `status.success` (200) | Yes |

All changed endpoints return 200 on success. No 201 for POST endpoints (pre-existing convention in this codebase — not introduced by QA8).

### Forbidden response shape consistency

All QA8-fixed 403s use `res.status(403).json({ message: "..." })`. The FE's QA8 error normalisation (`body.error || body.message`) handles this shape correctly for `changeJobStatus$` and `saveJob$`. The remaining endpoints (applicant sub-array, contacts, company update) use `const { error } = err.error` in their FE effects, which will yield `undefined` on a 403 (body has `message`, not `error`). This is a low-severity inconsistency that existed before QA8 for the applicant/contacts/company effects and is not newly broken.

---

## Findings Summary

| # | Contract | Status | Priority |
|---|----------|--------|----------|
| 1 | changeJobStatus$ FE↔BE | Intact | — |
| 1a | changeJobStatusFail error not shown to user | Gap (pre-existing) | P2 |
| 2 | createJobs FE↔BE | Intact | — |
| 2a | FE still validates `job.companyId` for publish gate (now redundant) | Note | P3 |
| 3 | getUserCVlist / getCvById employer regression | NOT a regression — zero FE callers | — |
| 4 | Applicant sub-array BOLA fix FE↔BE | Intact | — |
| 4a | Sub-array 403 body.message not surfaced in FE error state | Minor gap | P3 |
| 5 | createContact / createGroup FE↔BE | Intact | — |
| 6 | updateCompany FE↔BE | Intact | — |
| 7 | Anti-corruption (imports, response codes) | All correct | — |

---

## P1 Regression Check

**No P1 regressions.** The CV endpoint locking is confirmed safe.

---

## Recommended Follow-Ups (post QA8, non-blocking)

1. **(P2)** Wire `changeJobStatusFail` to a user-visible error — either a snackbar in `job-list.component.ts` subscribing to `error$`, or normalise in the facade. Currently a 403 or network error is silently dropped.
2. **(P3)** Remove the `job.companyId` field from the publish-gate check in `publishJobPost()` since the BE now ignores it — or keep it as a belt-and-suspenders UX check (it doesn't cause incorrect behaviour either way).
3. **(P3)** Normalise applicant sub-array and contacts FE effects to use `body.error || body.message` pattern (same as the QA8 fix applied to job effects) so 403 errors surface correctly in error state.
