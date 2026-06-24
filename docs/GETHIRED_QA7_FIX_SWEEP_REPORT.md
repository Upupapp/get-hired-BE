# GETHIRED QA7 FIX SWEEP REPORT

**Date:** 2026-06-25  
**Scope:** QA Cycle 7 fix sprint — 9 targeted fixes across 5 BE controllers + 3 FE files  
**Method:** Full read of every changed file; targeted grep passes for regression and new-issue detection

---

## Overall Verdict: CONDITIONAL PASS

All 9 fixes are correctly implemented and represent meaningful security hardening. No fix introduces a regression that would break legitimate callers. Two findings are elevated for awareness: one structural gap in Fix 1 (ownership check uses a separate SELECT rather than folding into the UPDATE, leaving a narrow TOCTOU window — low practical risk but inconsistent with the updateJob/deleteJob pattern), and one pre-existing unmanaged mutation in applicantsController (saveWorkExp, saveEducBg, saveCert, saveSkillsArray, saveDocuments) that was explicitly out of QA7 scope but is now the most conspicuous remaining BOLA surface. No P0 findings.

---

## Fix-by-Fix Assessment

### Fix 1 — updateStatusOfJob ownership check (jobsController.js:355–385)

**PASS with note**

- Ownership check is present and fires at lines 363–374, before any write.
- Uses `getUserCompany(req.user.uid)` — token-derived, correct.
- Array.isArray guard is applied at line 364: `if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId)` — consistent with updateJob and deleteJob.
- Ownership SELECT queries `WHERE job_id = $1 AND company_id = $2` — correct.
- The 403 fires at line 373 before the `updateJobStatus()` call at line 376.

**Note:** The ownership check uses a two-step approach (separate SELECT for ownership, then a separate UPDATE at line 388 that has no `company_id` constraint in the WHERE clause). This is slightly inconsistent with updateJob and deleteJob, where the ownership constraint is folded into the UPDATE/DELETE WHERE clause itself. The window between the SELECT check and the UPDATE is negligible in practice, but it means a concurrent rename of the job to another company would slip through. This is a structural inconsistency, not an acute bug. Recommend backlog ticket to fold `company_id = $3` into the `updateJobStatus` UPDATE WHERE clause in a follow-up.

**What statuses does updateStatusOfJob cover?** The `statusId` comes from `req.body.status` and is passed verbatim to `updateJobStatus` which runs `SET job_status_id=$1`. The allowed values depend on the caller — this endpoint can set any integer status (active=1, draft=2, archived=4, expired=3, or any other value). The ownership check protects all of them equally since it gates on the job identity, not the status value.

**Are there other job status-change paths?** The `updateJob` handler (line 229) also sets `job_status_id` via `$17` in the UPDATE query and is already protected by its own ownership check (line 283). No other unprotected status-change path was found.

---

### Fix 2 — companiesController.js dangling line (lines 404–414)

**PASS**

- The previously-live `getSetupListCompany` function body is correctly commented out at lines 404–414 (the comment block starts with `// const getSetupListCompany = async (req, res) => {` and closes with `// };`).
- The export at line 733 is also commented out: `// getSetupListCompany,`.
- The surrounding code is syntactically consistent — no orphaned braces, no uncommonly closed blocks.
- Module still parses cleanly (no unclosed function or export issues).

---

### Fix 3 — Array.isArray guards (jobsController.js)

**PASS**

All three handlers use the same guard pattern:

| Handler | Line | Guard |
|---|---|---|
| updateJob | 284 | `Array.isArray(callerCompany) \|\| !callerCompany \|\| !callerCompany.companyId` |
| deleteJob | 207 | same |
| updateStatusOfJob | 364 | same |

The pattern is consistent. `getUserCompany` returns `[]` (empty array) when no company row exists (see companiesController.js:199–200), so the `Array.isArray` branch is the correct sentinel for the no-company case. All three guards are equivalent and all fire before any write.

---

### Fix 4 — Applicant profile BOLA (applicantsController.js)

**PASS**

- `updateProfile` (line 193): `updateApplicationProfile({ ...req.body, userId: req.user.uid })` — the spread then overwrite pattern correctly replaces any caller-supplied `userId` in req.body with the JWT-derived one.
- `updateBasicProfileInfo` (line 178): same pattern.
- Both services (`updateApplicationProfile` at service line 422 and `updateProfileBasicInfo` at service line 314) use `WHERE user_id=$14 / $13` with the `userId` from the applicant object — so the JWT-bound value flows through to the WHERE clause correctly.
- Profile fields (name, bio, skills, photo, etc.) are still updatable — only the identity anchor changes from body-supplied to token-derived.
- No other path in applicantsController reads `userId` from req.body for identity in an update context. The `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, `saveDocuments` handlers use `applicantProfileId` from the body (not userId), which is a separate surface addressed in the new-issues scan below.

---

### Fix 5 — Contacts/Groups ownership checks (contactsController.js)

**PASS with note**

- `updateContact` (lines 110–121): getUserCompany called, Array.isArray guard applied, ownership SELECT on `${dbSchema}.contact WHERE contact_id = $1 AND company_id = $2` — correct. 403 fires before `editContact()` at line 123.
- `deleteContact` (lines 82–93): same pattern. Ownership check is at lines 82–93, before the parameterized DELETE at line 94.
- `updateGroup` (lines 236–245): queries `${dbSchema}."group"` — quoted identifier is correct for a reserved-word table name. 403 fires before `editGroup()` at line 248.
- `deleteGroup` (lines 327–337): same pattern, queries `${dbSchema}."group"` with double-quoted identifier. 403 fires before the DELETE at line 339.
- All four handlers return 403 before any DB write.

**Note on ordering in deleteContact:** The `checkContactIfExist` call at line 75 runs outside the try block, which means a DB error there would be uncaught. The ownership check at line 82 is inside the try block. This is a pre-existing structure not introduced by QA7 — not a regression, but noted.

**Missed mutation handlers:** `createContact` and `createGroup` do not have ownership checks — they accept `companyId` from the request body. These are creation endpoints (not mutations of existing records), so the impact is scope-limited: a caller can create contacts/groups under any company ID. This is a pre-existing gap, not introduced by QA7. Flagged as P2 in the findings table.

---

### Fix 6 — CV ownership checks (cvController.js)

**PASS**

- `updateCV` (lines 87–97): `userId = req.user.uid` at line 87 — no longer reads userId from req.body. Ownership SELECT at lines 91–96 queries `WHERE cv_id = $1 AND user_id = $2`. 403 fires at line 96 before the UPDATE at line 99.
- `deleteCV` (lines 141–147): ownership SELECT at lines 141–146 queries `WHERE cv_id = $1 AND user_id = $2` with `req.user.uid`. 403 fires at line 146 before the DELETE at line 149.
- `userId` was removed from the `updateCV` body destructure (lines 72–84 show the destructure with no userId field).
- `createCV` still reads `userId` from req.body (line 10) — this is by design for creation; Fix 6 only addressed mutation. Flagged as a separate P2 concern below.
- `getUserCVlist` and `getCvById` are read-only and unchanged — not a concern.

---

### Fix 7 — Safe-area billing bar (employer-panel.component.scss)

**PASS**

- `bottom: calc(56px + env(safe-area-inset-bottom, 0px))` is present at line 172.
- The 56px base matches the mobile nav height used in the same file (`padding-bottom: 72px` in the media query at line 160 accounts for nav + some breathing room).
- The `0px` fallback is correct — non-notched devices receive a zero inset, resulting in `bottom: calc(56px + 0px)` = 56px, exactly above the nav bar.
- The `.gh-billing-bar` class is also `position: fixed` with `z-index: 999`, matching the mobile nav's z-index — no layering conflict.

---

### Fix 8 — getJobSuccess succesMsg (job.reducer.ts)

**PASS**

- Line 438: `succesMsg: null` is present with the fix comment.
- The reducer case still correctly spreads state, sets `job: action.job`, sets `jobLoading: false`, and clears `succesMsg`.
- `getJob` (the loading action at line 430) also already sets `succesMsg: null` — so the field is cleared on both the start and success of a job fetch. Correct.
- No UI consumer of `job.selector.ts:success` (which maps to `succesMsg`) was found that depends on `getJobSuccess` producing a non-null `succesMsg`. The `afterSubmit` method in `job-create.component.ts` only reacts to `'asDraft'` and `'published'` strings, which come from `saveJobSuccess`, not `getJobSuccess` — so this fix is safe.

---

### Fix 9 — Unmanaged subscriptions (job-create.component.ts)

**PASS**

- `loading$` (tracked as `this.jobFacade.getJobLoading$`) is wrapped in `this.subscriptions.add(...)` at lines 132–134.
- `editJob$` is wrapped in `this.subscriptions.add(...)` at lines 140–147.
- `ngOnDestroy` at line 546 calls `this.subscriptions.unsubscribe()` — confirmed present, unchanged.
- `success$` subscription was already added in a prior fix (line 126–129, `this.subscriptions.add(...)`).
- Form control subscriptions inside `setFormGroup` (lines 215–244) are also added to `this.subscriptions`.
- `this.route.queryParams.subscribe(...)` at line 111 (constructor) is the one remaining unmanaged subscription in the file, but it completes automatically when the router destroys the component — low risk, pre-existing, not in Fix 9's scope.

---

## Regression Scan

### Do ownership checks in jobsController break legitimate employer operations?

No. `getUserCompany(req.user.uid)` returns the calling employer's own company. The `company_id` constraint in the WHERE clause means a legitimate employer updating or deleting their own job will always find a matching row. If they pass a `jobId` they don't own, they correctly get 403.

### Does binding applicant profile to req.user.uid break admin profile editing?

No regression found. The admin controller (`controllers/adminController.js`) does not expose a profile-update endpoint — a grep for `profile|updateProfile|updateBasicProfile` in that file returned no matches. Admin profile operations, if they exist at all, must go through a different mechanism. All current applicant profile FE callers (`ApplicantService`) already pass the logged-in user's own ID, so no frontend caller is affected.

### Do contacts/groups ownership checks break any read-only handlers?

No. The ownership checks were added only to `updateContact`, `deleteContact`, `updateGroup`, and `deleteGroup`. The read handlers (`list`, `grouplist`, `contactslist`, `list2`) were not modified and remain unchanged.

### Does succesMsg: null in getJobSuccess break any UI reading the job reducer's succesMsg?

No. The `success$` selector in `job.selector.ts` maps to `succesMsg`. The only confirmed consumer of this selector that branches on string values is `afterSubmit()` in `job-create.component.ts`, which checks for `'asDraft'` and `'published'` — values that only come from `saveJobSuccess`. `getJobSuccess` previously could leak a stale string from a prior operation; setting it to null is strictly correct and harmless to all known consumers. The `job-list.component.ts` and `create-interview.component.ts` also consume `success$` but their usage (`this.success$.unsubscribe()` pattern) does not branch on specific string values from a job-load action.

---

## New Issues Scan

### Remaining mutation endpoints missing ownership checks

**applicantsController.js — saveWorkExp, saveEducBg, saveCert, saveSkillsArray, saveDocuments**

These five handlers (lines 292–430) accept `applicantProfileId` from `req.body` with no ownership verification. Any authenticated applicant can overwrite another applicant's work history, education, certifications, skills, and documents by supplying a different `applicantProfileId`. Fix 4 only addressed the two profile-info handlers; these five were not in QA7's declared scope but are now the highest-remaining BOLA surface in the applicant domain.

**cvController.js — createCV**

`createCV` reads `userId` from `req.body` (line 10), meaning a caller can create a CV attributed to any user ID. This is a creation-time BOLA. Fix 6 addressed update/delete but not create.

**contactsController.js — createContact, createGroup**

Both accept `companyId` from request body with no ownership check. A caller can create contacts or groups attributed to a company they don't belong to. The QA7 fix only addressed mutation of existing records.

### Raw error patterns in changed files

No raw `throw error` strings exposed to the HTTP response were found in the changed files. All catch blocks use `console.error` + a generic error message constant — consistent with the project pattern.

### [innerHtml] or bypassSecurityTrust in changed FE files

No matches found in `job-create.component.ts`, `job.reducer.ts`, or `employer-panel.component.scss`.

---

## Prioritized Findings Table

| ID | Priority | Location | Finding | Recommended Action |
|---|---|---|---|---|
| QA7-F01 | P2 | `controllers/applicantsController.js` lines 292–430 | `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, `saveDocuments` accept `applicantProfileId` from body with no ownership check — BOLA on all 5 applicant array-data endpoints | Add `req.user.uid` ownership verification against `applicant_profile_id` before any array delete/insert |
| QA7-F02 | P2 | `controllers/cvController.js` line 10 | `createCV` reads `userId` from `req.body` — a caller can create a CV attributed to any user | Replace with `const userId = req.user.uid` (same pattern as updateCV Fix 6) |
| QA7-F03 | P2 | `controllers/contactsController.js` lines 9–31, 186–229 | `createContact` and `createGroup` accept `companyId` from body with no ownership check | Derive companyId from `getUserCompany(req.user.uid)` as with the mutation handlers |
| QA7-F04 | P3 | `controllers/jobsController.js` lines 387–401 | `updateJobStatus` internal helper has no `company_id` constraint in its UPDATE WHERE clause — ownership is enforced by the caller (`updateStatusOfJob`) but the helper is also exported and could be called independently without that check | Fold `AND company_id=$3` into the helper's UPDATE WHERE clause, or unexport it |
| QA7-F05 | P3 | `controllers/applicantsController.js` lines 62–77 | `deleteApplication` has no ownership check — a caller can delete any application by ID. Pre-existing; noted in prior SECURE report as out of scope | Add caller-binding: verify `candidate_id` in the application row matches `req.user.uid` before deleting |
| QA7-F06 | P3 | `controllers/contactsController.js` line 75 | `checkContactIfExist` called outside the try block in `deleteContact` — a DB error there is unhandled | Move into the try block |
| QA7-F07 | P3 | `controllers/jobsController.js` line 355 | `updateStatusOfJob` uses a two-step SELECT+UPDATE for ownership rather than folding `company_id` into the UPDATE WHERE clause — minor TOCTOU inconsistency vs. `updateJob`/`deleteJob` pattern | Backlog: fold company_id into `updateJobStatus` UPDATE WHERE |

---

## Summary

**9/9 fixes are correctly implemented.** The security hardening across job, company, applicant, contact, and CV controllers is sound. All ownership checks use token-derived identity, all 403s fire before any DB write, and the FE fixes (safe-area, reducer null, subscription lifecycle) are clean.

The three P2 findings (applicant array endpoints, CV create, contact/group create) represent the next logical pass of BOLA closure in the same controllers touched by this sprint. They are pre-existing gaps, not regressions from QA7.
