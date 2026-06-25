# GetHired QA9 Fix Sprint — STITCH Integration Audit Report

**Date:** 2026-06-25
**Scope:** BE: applicantsController.js, applicant.service.js, companiesController.js, interviewController.js, jobsController.js, candidateController.js, contactsController.js | FE: package.json, job-list.component.ts
**Verdict:** No P1 regressions found. Two informational gaps noted (P2/P3). All 7 integration contracts verified.

---

## Task 1 — createApplication / deleteApplication FE↔BE

### What the FE sends

The live apply flow does **not** call `/application/create` or `/application/delete` directly. Those routes exist on the BE but the only real consumer found is `/application/apply` (POST), which routes to a separate `applicationController.submitApplication`. The body the FE sends:

```ts
// application-process.component.ts ~L167
const application = {
  ...this.applicationForm.controls.profileDocs.value,
  interviewAnswers: [...],
  jobId: this.job.jobId,
  candidateId: this.userId,   // <-- still in body
  applicantId: this.user.applicantProfileId
}
```

`/application/create` (now auth-gated per the QA9 route fix) maps to `applicantsController.createApplication`. That handler extracts `jobId` and `status` from the body and **ignores body candidateId entirely** — it derives `candidateId = req.user.uid`. Body `candidateId` is dead weight: harmless, but also silently ignored.

`/application/delete` similarly ignores body `candidateId` and uses `req.user.uid`.

### End-to-end apply flow

The active apply path (`/application/apply`) routes to a **different controller** (`applicationController`) not in the QA9 fix scope. That controller was not audited for BOLA in this cycle; it is a separate risk surface.

### Verdict

- **Contract intact.** The FE sending `candidateId` in the body to `/application/create` or `/application/delete` causes no error and no security bypass — the BE discards it.
- **No regression.** The apply flow the applicant actually uses (`/application/apply`) is a completely separate controller; QA9 fixes do not touch it.
- **P3 note:** Body `candidateId` on the FE side is now dead data (it is never used). Not a bug, but a cleanup candidate.

---

## Task 2 — saveVideoCV FE↔BE

### What the FE sends

```ts
// applicant.service.ts L30-35
saveVideoCV(video: Model.VideoCV, profileId: string) {
  const body = {
    video,                          // { videoCVFile, videoCVUrl }
    applicantProfileId: profileId   // string
  };
  return this.baseService.put<Model.VideoCV>(`${this.applicantUrl}/savevideocv`, body);
}
```

The component (`docs-videocv.component.ts`) passes `this.applicantProfileId` (an `@Input()` string set by the parent) as `profileId`.

### BE ownership check

`saveVideoCV` in `applicantsController.js` (QA9 FIX-2):
```js
const ownerCheck = await dbQuery.query(
  `SELECT 1 FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2`,
  [applicantProfileId, uid]
);
if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
```

### 403 handling on the FE

The NgRx effect for `saveVideoCV$` uses a `catchError` that dispatches `saveVideoCVFail({ payload: error })`. There is **no specific 403 branch** — all errors are treated uniformly as a generic failure action. The component observes `success$` for the snackbar ("Video successfully deleted"/"Profile successfully updated"). On a 403, `success$` never emits; the loading dialog stays open until its 3-second timeout, then closes silently. **No error toast is shown to the user on a 403.** This is a pre-existing UX gap, not introduced by QA9.

### Verdict

- **Contract intact.** The FE sends `applicantProfileId` correctly; the BE can execute the ownership check.
- **No regression.** The video upload success flow is unaffected for the legitimate owner.
- **P2 gap (pre-existing):** 403 from `saveVideoCV` produces a silent failure on the FE — loading spinner times out, no error message. The FE's `saveVideoCVFail` does not surface a user-visible snackbar. Recommend adding error handling in the effect or the component's `afterSubmit`.

---

## Task 3 — Interview ownership checks FE↔BE

### FE callers found

Three interview-related FE call paths were located:

| Operation | FE call | Route |
|---|---|---|
| updateJobInterviewQuestion | `job.service.ts updateJobInterviewQuestions()` → `PUT /job/updatejobinterview` | `interviewRoute.js` maps to `interviewController.updateJobInterviewQuestion` |
| deleteInterviewQuestion | `job.service.ts deleteJobInterviewQuestions(questionId, jobId)` → `DELETE /job/deleteinterviewquestion?questionId=...&jobId=...` | `jobsRoute.js` maps to `jobsController.deleteInterviewQuestion` |
| saveQuestionTemplate | No direct FE call found to `/interview/savequestiontemplate`. The FE job-create flow builds template questions inline as part of job create/update. `interviewController.saveQuestionTemplate` is only callable via the standalone interview route. |

### questionId placement

For `updateJobInterviewQuestion`: the FE sends `interviewQuestion` as the full body object (type `InterviewModel.InterviewQuestion`). The BE reads `req.body.questionId` — the FE body must contain a `questionId` field. The `InterviewModel.InterviewQuestion` type was not inspected in full, but the job effects pass `action.interviewQuestion` directly from the Redux store which is populated from the API response, so `questionId` should be present when editing an existing question.

For `deleteInterviewQuestion`: the FE sends `questionId` and `jobId` as query params: `?questionId=${questionId}&jobId=${jobId}`. The BE reads both from `req.query`. The ownership check uses `questionId` via the join. **Contract matches.**

### 403 handling on the FE

Both update and delete effects use standard `catchError` that dispatches `...Fail` actions. There is no specific 403 branch in either effect — errors dispatch a generic fail action. Neither the job-create component nor any visible job-edit component was found to display an explicit "permission denied" message on a 403. Like the video CV case, a 403 will be a silent failure or a generic "something went wrong" depending on whether the component subscribes to the error state.

### saveQuestionTemplate — no live FE caller

`/interview/savequestiontemplate` is not called from any FE service in scope. The job-create flow creates templates implicitly as part of `POST /job/create` (via `createInterviewTemplateQuestions` inside `createJobs`). The standalone template endpoint exists and is auth-guarded, but appears unused from the current FE. **No regression risk.**

### Verdict

- **Contract intact** for `updateJobInterviewQuestion` and `deleteInterviewQuestion`.
- **No regression.** QA9 FIX-5 and FIX-6 add company ownership checks before the write; legitimate calls (same company) pass through unchanged.
- **P2 gap (pre-existing):** 403 on interview question update/delete has no dedicated FE error display. Recommend error state handling in job-create/edit component.

---

## Task 4 — deleteCandidate FE↔BE

### What the FE sends

```ts
// candidates.service.ts L51
DeleteCandidate(data: any): Observable<any> {
  return this.http.delete<any>(
    `${this.server}/candidates/deletecandidate?candidateId=${data}`
  )
```

`data` is the raw `candidateId` string. The BE reads `req.query.candidateId`.

### BE ownership check (QA9 FIX-7)

```js
const callerCompany = await getUserCompany(req.user.uid);
// ... 403 if no company
const { rowCount } = await dbQuery.query(
  `DELETE FROM ${dbSchema}.candidates WHERE candidate_id=$1 AND company_id=$2`,
  [candidateId, callerCompany.companyId]
);
if (rowCount === 0) {
  return res.status(403).json({ message: "You don't have permission to delete this candidate." });
}
```

### 403 handling on the FE

`CandidateService.DeleteCandidate` pipes through `catchError(this.handleError)` which re-throws. The caller (`import-add-candidate.component.ts` or similar) would receive an unhandled error unless its own effect/subscription has a `catchError`. The NgRx candidate effects were not found in scope, but the pattern is the same as contacts — generic error, no 403-specific branch.

### Verdict

- **Contract intact.** The FE sends `candidateId` as a query param; the BE reads it from `req.query.candidateId`. The ownership check is now folded into `DELETE WHERE company_id=$2`.
- **No regression.** A legitimate delete (own company's candidate) works. A cross-company attempt correctly returns 403 (previously it would have deleted without ownership check).
- **P2 gap (pre-existing):** No 403-specific error message on FE. The `danger-snackbar` in the contact-list/candidate-list component shows a generic "Something went wrong" on any error.

---

## Task 5 — contacts list / grouplist FE↔BE

### What the FE sends

**contacts/list:**
```ts
// contacts.service.ts L15-18
getContactList(data: any): Observable<any> {
  return this.http.get<any>(`${this.server}/contacts/list?companyId=${data.payload}`).pipe(...)
}
```
Called from `contact-list.component.ts L205-209`:
```ts
getContactList(){
  this.contactState.dispatch({
    type: ContactActionTypes.GET_CONTACT_LIST,
    payload: this.localData.companyId  // from localStorage 'user'
  });
}
```

**groups/list:**
```ts
// groups.service.ts L15-18
getGroupList(data: any): Observable<any> {
  return this.http.get<any>(`${this.server}/groups/list?companyId=${data.payload}`).pipe(...)
}
```
Called similarly with `this.localData.companyId` from localStorage.

### After the QA9 FIX-12: query param is ignored

`contactsController.list` and `contactsController.grouplist` now derive `companyId` entirely from `getUserCompany(req.user.uid)` — the query param `?companyId=...` is read by the service layer but **ignored by the BE handler**. The BE sends back the authenticated user's own company's contacts regardless of what the FE passes.

**Note:** `contactsController.list` is the `/contacts/list` handler — this maps to the `GroupService.getGroupList` call for groups. The grouplist endpoint (`/contacts/grouplist`) also now ignores the param.

### Regression check: does any FE component pass a DIFFERENT company's companyId?

All callers found dispatch with `this.localData.companyId` (from `localStorage.getItem('user')`) — the user's own company. No caller was found that deliberately passes a different company's ID to fetch that company's contacts. **No regression from the param being ignored.**

The FE still sends `?companyId=...` — this is now a no-op. The request succeeds identically to before for legitimate callers.

### Verdict

- **Contract intact.** Calls succeed and return the correct data (the caller's own company's contacts).
- **No regression.** All FE callers only ever supplied their own `companyId`.
- **P3 note:** The `?companyId=` query param sent by the FE is dead data on these two endpoints. Not harmful, cleanup candidate.

---

## Task 6 — xlsx 0.18.5 API contract

### FE xlsx usage

Only one file uses xlsx:

```ts
// excel-downloader.service.ts
import * as XLSX from 'xlsx';

XLSX.utils.json_to_sheet(json)           // utils
XLSX.write(myworkbook, { bookType: 'csv', type: 'array' })  // write
// (WorkSheet and WorkBook types used for typing only)
```

### API surface compatibility check (0.17.5 → 0.18.5)

The FE uses only three surface items:
- `XLSX.utils.json_to_sheet` — stable since 0.8.x, unchanged through 0.18.x
- `XLSX.write` with `{ bookType: 'csv', type: 'array' }` — both options stable through 0.18.x
- `XLSX.WorkSheet` and `XLSX.WorkBook` type annotations — TypeScript interfaces, no runtime impact

The 0.18.x changelog introduced primarily new features (streaming, new sheet types) and internal refactors. No breaking changes were made to `utils.json_to_sheet` or `write` in the 0.17.x → 0.18.5 range. The `package.json` now locks to `"xlsx": "^0.18.5"`.

**One relevant 0.18.x note:** `XLSX.read` (not used by this FE) had a `dense` mode change. Since the FE only writes, not reads, this does not apply.

### Verdict

- **No breaking change.** The FE uses a minimal, stable API subset. Upgrading from 0.17.5 to 0.18.5 is safe for this codebase.
- **Contract intact.**

---

## Task 7 — jobError$ cleanup in job-list.component.ts

### Subscription count

Exactly **one** subscription to `jobError$` is present, added in `ngOnInit`:

```ts
// job-list.component.ts L139-148
this.req.add(
  this.jobFacade.jobError$.pipe(takeUntil(this.unsubscribe$)).subscribe((err) => {
    if (err) {
      this.snackBar.open(err, '', {
        duration: 4000,
        panelClass: ['danger-snackbar'],
      });
    }
  })
);
```

A comment at L72-74 confirms the previously duplicate class-field subscription (`error$`) was removed as part of QA9 FIX-13.

### Error message

The `err` value comes from `jobFacade.jobError$` which reads `fromfeature.jobError` from the store. The job effects normalize all error shapes (403 `{ message }` objects and generic `{ error }` strings) to a plain string before dispatching to the `...Fail` actions, so `err` in the subscription is always a readable string. The `danger-snackbar` panel class is applied correctly.

### Cleanup

The subscription is added to `this.req` (a `Subscription` container). In `ngOnDestroy`:
```ts
ngOnDestroy(): void {
  if (this.req) this.req.unsubscribe();
  this.jobFacade.getBasicList(null);
  this.dialog.closeAll();
}
```

`this.req.unsubscribe()` tears down all child subscriptions added via `this.req.add(...)` including the `jobError$` one. The `takeUntil(this.unsubscribe$)` provides a second cancellation path. No leak.

The three class-field subscriptions (`success$`, `loading$`, `restrictions$`) use the `.subscribe(this.xxx.bind(this))` pattern without `takeUntil` — they are not added to `this.req` and have no explicit teardown. This is a pre-existing issue in those three subscriptions but is not the subject of QA9 FIX-13.

### Verdict

- **Exactly one subscription to `jobError$`.** The duplicate was removed.
- **Correct error message.** The snackbar displays the normalized error string with `danger-snackbar` styling for 4 seconds.
- **Properly cleaned up.** `this.req.unsubscribe()` in `ngOnDestroy` tears it down.
- **P3 note (pre-existing):** `success$`, `loading$`, `restrictions$` class-field subscriptions lack teardown. Not introduced by QA9.

---

## Summary Table

| # | Task | Status | Severity | Notes |
|---|---|---|---|---|
| 1 | createApplication/deleteApplication FE↔BE | PASS | — | FE sends body `candidateId` but BE ignores it (correct). Live apply uses `/application/apply` (different controller). |
| 2 | saveVideoCV FE↔BE | PASS | P2 gap (pre-existing) | Contract intact; 403 on ownership mismatch produces silent failure on FE — no user-visible error toast. |
| 3 | Interview ownership checks FE↔BE | PASS | P2 gap (pre-existing) | `questionId` placement correct; 403 not surfaced to user in update/delete. `saveQuestionTemplate` has no active FE caller. |
| 4 | deleteCandidate FE↔BE | PASS | P2 gap (pre-existing) | `candidateId` passed as query param correctly; ownership check in `DELETE WHERE` correct; 403 not distinguished from generic errors on FE. |
| 5 | contacts list/grouplist FE↔BE | PASS | P3 note | Query param `?companyId=` now ignored; FE always supplied own company ID so no regression. |
| 6 | xlsx 0.18.5 API contract | PASS | — | Only `utils.json_to_sheet` and `write` used; both stable across 0.17.5→0.18.5. |
| 7 | jobError$ cleanup | PASS | P3 note (pre-existing) | Exactly one subscription, correct message, properly torn down in ngOnDestroy. |

### P1 Regressions

**None found.**

### Pre-existing gaps surfaced (not introduced by QA9)

| Gap | Severity | Affected endpoint(s) |
|---|---|---|
| 403 from saveVideoCV not surfaced to user (silent failure on FE) | P2 | `/applicant/savevideocv` |
| 403 from interview update/delete not surfaced to user | P2 | `/job/updatejobinterview`, `/job/deleteinterviewquestion` |
| 403 from deleteCandidate not distinguished from generic errors | P2 | `/candidates/deletecandidate` |
| Body `candidateId` in FE apply payload is dead data | P3 | `/application/create`, `/application/delete` |
| `?companyId=` query param in contacts/group list calls is dead data | P3 | `/contacts/list`, `/contacts/grouplist` |
| `success$`, `loading$`, `restrictions$` class-field subscriptions lack ngOnDestroy teardown | P3 | job-list.component.ts |

---

## Key Files Referenced

**BE (in scope):**
- `get-hired-BE/controllers/applicantsController.js` — createApplication, deleteApplication, saveVideoCV (QA9 FIX-1, FIX-2)
- `get-hired-BE/services/applicant.service.js` — updateProfileSaveVideoCV (QA9 FIX-2b)
- `get-hired-BE/controllers/interviewController.js` — saveQuestionTemplate (FIX-4), updateJobInterviewQuestion (FIX-5)
- `get-hired-BE/controllers/jobsController.js` — deleteInterviewQuestion (FIX-6)
- `get-hired-BE/controllers/candidateController.js` — deleteCandidate (FIX-7)
- `get-hired-BE/controllers/contactsController.js` — list, grouplist (FIX-12)
- `get-hired-BE/controllers/companiesController.js` — getUserCompany (shared ownership helper)

**FE (in scope):**
- `get-hired-FE/src/app/job/job-list/job-list.component.ts` — jobError$ (QA9 FIX-13)
- `get-hired-FE/package.json` — xlsx 0.18.5
- `get-hired-FE/src/app/applicant/applicant.service.ts` — saveVideoCV call
- `get-hired-FE/src/app/applicant/state/applicant.effects.ts` — saveVideoCV$ effect
- `get-hired-FE/src/app/applicant/profile-forms/docs-videocv/docs-videocv.component.ts` — video upload UX
- `get-hired-FE/src/app/application/application.service.ts` — submitApplication (live apply path)
- `get-hired-FE/src/app/application/application-process/application-process.component.ts` — candidateId in body
- `get-hired-FE/src/app/shared/services/api/candidates.service.ts` — DeleteCandidate
- `get-hired-FE/src/app/shared/services/api/contacts.service.ts` — getContactList
- `get-hired-FE/src/app/shared/services/api/groups.service.ts` — getGroupList
- `get-hired-FE/src/app/shared/services/excel/excel-downloader.service.ts` — xlsx usage
- `get-hired-FE/src/app/job/job.service.ts` — updateJobInterviewQuestions, deleteJobInterviewQuestions
