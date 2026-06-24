# GETHIRED QA7 Fix Sprint — STITCH Integration Audit Report

**Date:** 2026-06-25
**Scope:** QA7 fix sprint changed files only
**BE files:** jobsController.js, companiesController.js, applicantsController.js, contactsController.js, cvController.js
**FE files:** employer-panel.component.scss, job.reducer.ts, job-create.component.ts

---

## 1. updateStatusOfJob API Contract

### What does the FE send?

`job.service.ts` calls:
```
PUT /job/changestatus  { status: number, jobId: string }
```

The payload is built in `job.facade.ts → changeJobStatus(status, jobId)`, dispatched to the effect, which calls `jobService.changeJobStatus(action.status, action.jobId)`. The only caller of `changeJobStatus` is `job-list.component.ts`, which passes `status=4` (archive) or an explicit status int from the table-control modal.

### Does the FE handle a 403 from this endpoint?

**Partially, with a silent failure.** The effect's `catchError` block in `job.effects.ts` line 167-170 is:
```ts
catchError((err) => {
  const { error } = err.error;
  return of(JobActions.changeJobStatusFail({ payload: error }))
})
```

When the BE returns `403 { message: "..." }` (not `{ error: "..." }`), the destructuring `const { error } = err.error` yields `undefined`. `changeJobStatusFail({ payload: undefined })` is dispatched. The reducer sets `error: undefined` and `succesMsg: null` — the store does not throw, but the UI shows nothing to the user. `job-list.component.ts`'s `afterChange` handler only reacts to `event == 'archived'` and ignores the fail action entirely. **Result: a 403 on changestatus produces a silent no-op from the user's perspective.**

Compare with `saveJob$` (job.effects.ts line 83-102) which was fixed in this sprint to normalise `body.error || body.message` — that fix was NOT applied to `changeJobStatus$`.

### Is there any FE path that changes job status without going through this endpoint?

No. The only place that triggers a status change is `job-list.component.ts → deleteRow()`, which dispatches `changeJobStatus(4, jobId)` through the facade → effect → service → `PUT /job/changestatus`. The job-create component's `saveAsDraft()` and `publishJobPost()` both go through `PUT /job/updatejobs` (status embedded in the job body, not through changestatus). No other component calls `changeJobStatus`.

### Finding: GAP-1

The `changeJobStatus$` effect does not normalise `{ message }` responses from the BE's new 403 format. A BOLA 403 on this endpoint silently swallows the error — no toast, no dialog. The fix pattern is already in the same file (see `job$` effect). This gap existed before QA7 but is now reachable because the BE actually enforces the ownership check and will return 403 for cross-company attempts.

---

## 2. Applicant Profile BOLA Fix Contract

### What does the FE send to updateProfile?

Two separate FE paths hit two separate BE endpoints:

**Path A — applicant.service.ts `saveApplicant(profile)`**
- If `profile.applicantProfileId` exists: `PUT /applicant/updateprofile` → BE `updateProfile`
- Body: full applicant profile object. The service passes `profile` as-is from the store action payload.

**Path B — applicant.service.ts `saveApplicantBasicProfile(basicProfile)`**
- If `basicProfile.applicantProfileId` exists: `PUT /applicant/updatebasicinfo` → BE `updateBasicProfileInfo`
- Body: BasicProfileInfo object.

Callers of Path A: `applicant-settings.component.ts` (auth settings update, firstName/lastName only). Callers of Path B: the applicant profile form panels.

### Was userId ever intentionally in the request body from the FE?

Reading `applicant.service.ts`: neither `saveApplicant()` nor `saveApplicantBasicProfile()` explicitly add `userId` to the body. However, both spread the full profile/basicProfile object from the store, and the store model almost certainly contains a `userId` field populated from localStorage/token at login. The FE did not intentionally send `userId` to overwrite server-side identity — it was incidentally included as part of the stored profile shape.

**The QA7 fix (`{ ...req.body, userId: req.user.uid }`) is correct:** any `userId` in `req.body` gets overwritten by the JWT-derived uid. Legitimate callers (who always send their own uid anyway) are unaffected. There is no intended design where `userId` in the body should differ from the authenticated caller.

### Does the admin panel call updateProfile via the same endpoint?

**No.** The admin panel (`adminController.js`) has no reference to `updateProfile` or `updatebasicinfo`. The admin does not edit applicant profiles through these endpoints. The admin's only relevant capability is reading profiles by ID, which is separate. The fix does not break any admin flows.

### Is there a different controller/endpoint for admin profile editing?

The admin panel has no profile-edit flow for applicant profiles in the current codebase. Admin-side profile mutation, if it ever existed, would need its own endpoint with appropriate admin-role verification. There is no such endpoint in any route file.

### Finding: PASS — no issue.

The BOLA fix is safe. No caller legitimately passes a different userId than their own, and the admin panel does not use this endpoint.

---

## 3. Contacts/Groups API Contract

### What FE components call updateContact / deleteContact / updateGroup / deleteGroup?

- **updateContact (PUT /contacts/updatecontact):** `contact.effect.ts → editContact effect` calls `contactService.editContact(data?.payload)`. This is dispatched from `contact-list.component.ts → editContact()` → which opens `ImportAddContactComponent` dialog. The dialog presumably dispatches `ContactActionTypes.EDIT_CONTACT` with a contact payload on close.

- **deleteContact (DELETE /contacts/deletecontact?contactId=...):** `contact.effect.ts → deleteContact effect` calls `contactService.deleteContact(data?.payload)`. Dispatched from `contact-list.component.ts → deleteRow()` → dispatches `ContactActionTypes.DELETE_CONTACT` with `data?.data` as payload.

- **updateGroup (PUT /groups/updategroup):** `group.effect.ts → editGroup effect` calls `groupService.editGroup(data?.payload)`. Dispatched from `contact-group.component.ts` (confirmed by file existence in grep results).

- **deleteGroup (DELETE /groups/deletegroup?groupId=...):** `group.effect.ts → deleteGroup effect` calls `groupService.deleteGroup(data?.payload)`. Dispatched from `contact-group.component.ts`.

### Do they pass IDs in params or body?

- **deleteContact:** ID is in the query string: `DELETE /contacts/deletecontact?contactId=${data.contact_id}` (contacts.service.ts line 50-52). The BE reads it from `req.query.contactId`. Match confirmed.
- **updateContact:** ID is in the body: `PUT /contacts/updatecontact` with `data` (the contact object). The BE reads `contact.contactId` from `req.body`. Match confirmed.
- **deleteGroup:** ID is in the query string: `DELETE /groups/deletegroup?groupId=${data.group_id}` (groups.service.ts line 33-36). The BE reads `req.query.groupId`. Match confirmed.
- **updateGroup:** ID is in the body: `PUT /groups/updategroup` with `data`. The BE reads `groupId` from `req.body`. Match confirmed.

### Does the FE handle 403 from these endpoints?

**No.** Both `contact.effect.ts` and `group.effect.ts` use a generic `catchError` that dispatches `*_FAIL` action types. `contact-list.component.ts` subscribes to the contact store and only handles `contact.error` (truthy check) by showing "Something went wrong please try again later." That message will appear on 403, so the user does get feedback. However:

1. The error message is generic — it does not distinguish "you don't have permission" from "network error."
2. The effects' `catchError` blocks re-throw the raw error via `handleError` in the services, which calls `throw error` — this passes the full Angular `HttpErrorResponse` object. The FAIL action payload is the whole HttpErrorResponse, not just the message string. The UI checking `contact.error` is truthy will work, but the message shown is hardcoded, not derived from `err.error.message`.

### Finding: GAP-2

403 on contact/group mutations surfaces a generic snackbar (not silent). The error shape from the BE's new 403 format (`{ message: "..." }`) is not surfaced to the user. This is a UX issue but not a breakage — the operation visibly fails.

---

## 4. CV Ownership Contract

### What FE components call updateCV / deleteCV?

There is **no FE component in the current codebase that calls `/cv/update` or `/cv/delete`.**

The grep for `updateCV|deleteCV|updatecv|deletecv` across all FE source files returned no matches. The grep for `/cv` found only:
- `job-applicants.component.ts` — reads a CV URL for display (no mutation)
- `profile-readiness-panel.component.ts` — reads CV completeness (no mutation)
- `cv-builder-shell.component.ts` — calls `/cv-builder/upload` (the NEW cvBuilder endpoint, not `/cv/update`)
- `cv-builder.service.ts` — only has `uploadCv()` calling `/cv-builder/upload`
- `applicant-profile.module.ts` — module definition (no mutation calls)

The legacy CV CRUD endpoints (`/cv/add`, `/cv/update`, `/cv/delete`, `/cv/getall`, `/cv/get`) appear to have no active FE consumers in the current Angular codebase. They exist in `cvRoutes.js` and `cvController.js` but no FE service or component calls them.

### Is deleteCV called from the employer panel?

**No.** There is no employer-panel component that calls any CV endpoint. The employer panel reads applicant CVs for display (via job applicant detail) but never calls `/cv/delete`.

### Does the new user_id check break any flow?

Since no FE component currently calls `updateCV` or `deleteCV`, the QA7 ownership fix introduces no regression in active flows. The fix is defensive — it protects the endpoints for future use and prevents any direct API caller from deleting another user's CV.

### Finding: INFO — endpoints are dead code in the FE.

The CV ownership fix is correct but the endpoints are effectively orphaned. If the legacy CV CRUD is ever re-wired (e.g., CVCOACH v2 expansion), the ownership check will be in place. Recommend a code comment noting the FE no longer calls these routes.

---

## 5. job.reducer.ts — succesMsg: null on getJobSuccess

### What FE components subscribe to succesMsg from the job store?

`job.facade.ts` exposes `success$ = this.store.pipe(select(fromfeature.success))` where `fromfeature.success` selects `state.succesMsg`.

Components subscribing to `success$`:
1. **job-list.component.ts** (line 66-68): subscribes directly, calls `afterChange(event)` which checks `event == 'archived'`.
2. **job-create.component.ts** (line 127-129): subscribes via subscriptions bag, calls `afterSubmit(event)` which checks `event == 'asDraft'` and `event == 'published'`.
3. **create-interview.component.ts** (line 30-31): subscribes directly, calls `afterSubmit(event)` which checks `event == 'updated'`.

### Do any subscribers check for specific string values that could be triggered by a job load?

- `job-list`: checks `'archived'`
- `job-create`: checks `'asDraft'` and `'published'`
- `create-interview`: checks `'updated'`

Before QA7 FIX-8, `getJobSuccess` did not set `succesMsg`. The reducer case for `getJob` (loading action) already set `succesMsg: null`. The problem was that `getJobSuccess` was not explicitly setting `succesMsg`, leaving the previous value in state. If a user had just saved a job (succesMsg='published') and then the component called `getJobById`, the success string would persist in the store.

### Does setting null on getJobSuccess break any toast/notification triggered on job load?

No. None of the three subscriber components trigger any toast/dialog/navigation when `succesMsg` is `null`. All checks are positive equality (`== 'archived'`, `== 'asDraft'`, etc.). Setting `null` means no handler fires — this is the correct, safe behavior.

**The fix is correct.** Without it, a job load following a publish could re-trigger the 'published' dialog or the 'archived' refresh in job-list. The fix prevents stale succesMsg from being acted upon.

### Finding: PASS — fix is correct and safe.

---

## 6. job-create.component.ts Subscription Management

### loading$ and editJob$ added to subscriptions bag

**Before QA7 FIX-9:**
- `loading$` was defined as a class field: `loading$: any` (no subscription stored). The facade's `getJobLoading$` observable was consumed ad-hoc in `onLoad()` but never tracked.
- `editJob$` was defined as a class field pipe but subscribed only transiently.

**After QA7 FIX-9:**
Both are added to `this.subscriptions` (a `Subscription` instance). `ngOnDestroy` calls `this.subscriptions.unsubscribe()`, which tears down all tracked subscriptions.

### Does adding loading$ to subscriptions change timing behavior?

`loading$` selects `state.loading` from the job store — this is a synchronous BehaviorSubject-like selector that emits the current value immediately on subscription. Tracking it in `subscriptions` does not change when it emits or what it emits. The only change is that on destroy, the subscription is properly cleaned up. No timing regression.

### Does adding editJob$ to subscriptions change timing behavior?

`editJob$` is:
```ts
editJob$ = this.jobFacade.jobDetails$.pipe(map(job => job));
```
Previously this was subscribed manually inside `ngOnInit`. Moving it into `subscriptions` makes the teardown explicit. There is a subtlety: the subscription is added to `subscriptions` in `ngOnInit` (line 141-147), which means it runs alongside the existing `if (this.jobId) this.getJobById()` call. The order is: subscribe → if jobId, dispatch getJob → when job arrives, setFormGroup. This order is unchanged from before — only the cleanup is now guaranteed.

### Could ngOnDestroy unsubscribing loading$ prevent any required cleanup elsewhere?

No. `loading$` is a pure read-only selector. Unsubscribing it only stops this component receiving future loading state updates. No other component depends on this component's subscription to `loading$`.

### Finding: PASS — no timing regression.

The fix correctly migrates two previously unmanaged subscriptions into the bag. The `cancel()` method calls `resetFormState()` before navigating — this remains correct.

---

## 7. Anti-Corruption Checks

### Do all changed BE controllers return correct 200 responses for legitimate operations?

**jobsController.js — updateStatusOfJob:**
- Happy path: `getUserCompany` returns a valid company, `ownerCheck.rows.length > 0`, `updateJobStatus` succeeds → `res.status(status.success).send(successMessage)` with the updated job. PASS.
- The `updateJobStatus` inner function returns a `mappedJob` object. The FE effect expects `res.data` to be a `Model.Job`. `mappedJob` returns the same shape as before. PASS.

**applicantsController.js — updateProfile / updateBasicProfileInfo:**
- Happy path: `{ ...req.body, userId: req.user.uid }` is passed to the service. If the body already had `userId` matching the caller, nothing changes. If it was missing, it's now populated. Service returns updated profile → `successMessage.data = profile` → 200. PASS.

**contactsController.js — updateContact / deleteContact / updateGroup / deleteGroup:**
- Happy path for updateContact: `getUserCompany` finds a company, `ownerCheck.rows.length > 0`, `editContact(contact)` called, returns contactUpdate → 200. PASS.
- Happy path for deleteContact: same pattern, `dbQuery.query(deleteQuery, [contactId])` runs, returns success message → 200. PASS.
- Same pattern for group operations. PASS.

**cvController.js — updateCV / deleteCV:**
- Happy path for updateCV: `ownerCheck.rows.length > 0`, update runs with `userId = req.user.uid` (JWT-derived), returns updated row → 200. PASS.
- Happy path for deleteCV: ownership check passes, delete runs → 200. PASS.

### Do any changed controllers now use getUserCompany — confirm it's properly imported where it wasn't before?

- **jobsController.js:** `getUserCompany` was already imported (`import { getUserCompany } from "./companiesController"` at line 27) from a prior fix sprint. The QA7 use in `updateStatusOfJob` reuses the existing import. PASS.
- **contactsController.js:** `getUserCompany` is imported at line 6: `import { getUserCompany } from "./companiesController"`. This import was added for the QA7 BOLA fixes. All four contact/group mutation handlers call it correctly. PASS.
- **companiesController.js:** `getUserCompany` is defined here (it is the source). No import needed. PASS.
- **applicantsController.js:** Does NOT call `getUserCompany`. The applicant BOLA fix uses `req.user.uid` directly without needing company context (profiles are user-scoped, not company-scoped). Correct by design. PASS.
- **cvController.js:** Does NOT call `getUserCompany`. CVs are user-scoped (user_id column). Uses `req.user.uid` directly. Correct by design. PASS.

---

## Summary Table

| # | Contract Area | Verdict | Finding |
|---|---------------|---------|---------|
| 1 | updateStatusOfJob 403 handling | FAIL | GAP-1: changeJobStatus$ effect does not normalise `{ message }` from BE 403 — silent failure on cross-company status change attempt |
| 2 | Applicant profile BOLA contract | PASS | Fix is correct; no admin bypass path exists |
| 3 | Contacts/Groups 403 handling | PARTIAL | GAP-2: Generic error snackbar shown on 403 (not silent), but message is not permission-specific |
| 4 | CV ownership contract | INFO | Fix correct; updateCV/deleteCV endpoints have no active FE callers |
| 5 | succesMsg null on getJobSuccess | PASS | Fix correct; no toast triggered by null; stale string regression closed |
| 6 | Subscription bag timing | PASS | No timing change; cleanup correctly added |
| 7 | Anti-corruption (200s + imports) | PASS | All happy paths return correct 200s; getUserCompany properly imported everywhere it is used |

---

## Actionable Items

### P1 — Should fix before merge

**GAP-1: Normalise 403 error shape in changeJobStatus$ effect**

File: `get-hired-FE/src/app/job/state/job.effects.ts`

The existing fix pattern is already in the same file (lines 93-96, `saveJob$` effect):
```ts
const body = (err && err.error) || {};
const payload: string = body.error || body.message || 'Unable to save your job. Please try again.';
```

Apply the same normalisation to `changeJobStatus$` (lines 167-170):
```ts
catchError((err) => {
  const body = (err && err.error) || {};
  const payload: string = body.error || body.message || 'Unable to update job status. Please try again.';
  return of(JobActions.changeJobStatusFail({ payload }))
})
```

Additionally, `job-list.component.ts`'s `afterChange` handler should handle the fail case to show a user-visible error when `event` is not `'archived'` and the error store has a value.

### P2 — Nice to have

**GAP-2: Permission-specific error copy for contacts/groups 403**

The contacts/groups effects rethrow the full `HttpErrorResponse`. Extract `err.error?.message` in the effect's FAIL action and surface it in the component. Low risk — does not affect business logic.

**CV endpoint comment:**
Add a comment to `cvRoutes.js` noting that `/cv/update` and `/cv/delete` have no current FE consumers and are reserved for CVCOACH v2 expansion.

---

## Files Read

- `get-hired-BE/controllers/jobsController.js`
- `get-hired-BE/controllers/companiesController.js`
- `get-hired-BE/controllers/applicantsController.js`
- `get-hired-BE/controllers/contactsController.js`
- `get-hired-BE/controllers/cvController.js`
- `get-hired-BE/routes/applicationRoute.js` (line grep)
- `get-hired-BE/routes/contactRoutes.js`
- `get-hired-BE/routes/cvRoutes.js` (line grep)
- `get-hired-FE/src/app/employer-panel/employer-panel.component.scss`
- `get-hired-FE/src/app/job/state/job.reducer.ts`
- `get-hired-FE/src/app/job/job-create/job-create.component.ts`
- `get-hired-FE/src/app/job/state/job.facade.ts`
- `get-hired-FE/src/app/job/state/job.effects.ts`
- `get-hired-FE/src/app/job/state/job.selector.ts`
- `get-hired-FE/src/app/job/job.service.ts`
- `get-hired-FE/src/app/job/job-list/job-list.component.ts`
- `get-hired-FE/src/app/job/job-create/components/create-interview/create-interview.component.ts`
- `get-hired-FE/src/app/applicant/applicant.service.ts`
- `get-hired-FE/src/app/applicant/state/applicant.effects.ts`
- `get-hired-FE/src/app/auth/state/auth.facade.ts`
- `get-hired-FE/src/app/auth/auth.service.ts` (grep)
- `get-hired-FE/src/app/applicant-panel/applicant-settings/applicant-settings.component.ts`
- `get-hired-FE/src/app/shared/services/api/contacts.service.ts`
- `get-hired-FE/src/app/shared/services/api/groups.service.ts`
- `get-hired-FE/src/app/shared/store/effects/contact.effect.ts`
- `get-hired-FE/src/app/shared/store/effects/group.effect.ts`
- `get-hired-FE/src/app/employer-panel/employer-contacts/contact-list/contact-list.component.ts`
- `get-hired-FE/src/app/applicant/cv-builder/cv-builder.service.ts`
- `get-hired-FE/src/app/applicant/cv-builder/cv-builder-shell.component.ts`
- `get-hired-BE/controllers/adminController.js` (grep)
