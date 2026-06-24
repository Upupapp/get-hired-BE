# GetHired QA Cycle 8 — Fix Sprint Log

**Date:** 2026-06-25  
**Sprint scope:** 11 fixes (P1×4, P2×3, P3×4)  
**Build result:** PASS — 0 errors, pre-existing warnings only (autoprefixer flex-start ×2, xlsx CommonJS; both unchanged from prior builds)

---

## Fix 1 — P1: changeJobStatus$ 403 normalisation

**File:** `get-hired-FE/src/app/job/state/job.effects.ts`  
**Status:** APPLIED

**Change:** Replaced `const { error } = err.error` destructure (crashes when BE returns `{ message: "..." }` shape, e.g. on 403) with the safe body-reading pattern already used in `saveJob$`:

```ts
const body = (err && err.error) || {};
const payload: string = body.error || body.message || 'Unable to update job status. Please try again.';
return of(JobActions.changeJobStatusFail({ payload }))
```

Handles both `{ error: "..." }` (legacy) and `{ message: "..." }` (403 from BOLA guards) response shapes without crashing.

---

## Fix 2 — P1: createJobs company spoofing

**File:** `get-hired-BE/controllers/jobsController.js`  
**Status:** APPLIED

**Change:** Removed `companyId` from the `req.body` destructure. Inside the `try` block, immediately derive it from JWT:

```js
const callerCompany = await getUserCompany(uid);
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
const companyId = callerCompany.companyId;
```

`companyId` is then used in the `INSERT` and `createInterviewTemplateQuestions` calls. Any body-supplied `companyId` is ignored.

---

## Fix 3 — P1: getUserCVlist open read

**File:** `get-hired-BE/controllers/cvController.js`  
**Status:** APPLIED

**Context determination:** Endpoint is purely applicant-facing. No FE code calls this endpoint with an employer-context `userid` param. The route is `GET /cv/getall` (authenticated). Locked to `req.user.uid`:

```js
const userId = req.user.uid;
// query uses userId — caller-supplied `userid` query param ignored entirely
```

**Note added in code:** Employer CV viewing in a job-application context must go through a separate scoped endpoint that verifies the employer's company owns the application.

---

## Fix 4 — P1: getCvById open read

**File:** `get-hired-BE/controllers/cvController.js`  
**Status:** APPLIED

**Context determination:** Same as Fix 3 — purely applicant-facing. Added `AND user_id = $2` ownership check with `req.user.uid`:

```js
const searchQuery = `SELECT * from ${dbSchema}.cv where cv_id = $1 AND user_id = $2;`;
const { rows } = await dbQuery.query(searchQuery, [id, req.user.uid]);
if (!dbResponse) {
  return res.status(403).json({ message: "You don't have permission to view this CV." });
}
```

Zero rows = cv_id not found OR user_id mismatch — both return 403.

---

## Fix 5 — P2: Applicant sub-array BOLA

**File:** `get-hired-BE/controllers/applicantsController.js`  
**Status:** APPLIED — handlers fixed: `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, `saveDocuments`

**Pattern:** `applicantProfileId` is the `AP-xxx` profile ID, not the Firebase UID. The fix verifies the caller's JWT uid owns that profile before allowing any sub-array mutations:

```js
const { uid } = req.user;
const ownerCheck = await dbQuery.query(
  `SELECT 1 FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2`,
  [applicantProfileId, uid]
);
if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
```

Applied identically to all 5 handlers before any array mutation.

**`saveVideoCV`:** Not fixed (no change needed) — the service's `updateProfileSaveVideoCV` already uses `userId` from `req.user.uid` in `WHERE user_id=$3`. The body-supplied `applicantProfileId` is only used as a storage bucket key name, not as an ownership anchor.

---

## Fix 6 — P2: createProfile body userId

**File:** `get-hired-BE/controllers/applicantsController.js`  
**Status:** APPLIED

**Change:** Override `userId` in the body with JWT-derived uid:

```js
const profile = await createApplicationProfile({ ...req.body, userId: req.user.uid });
```

Spread-plus-override ensures all other body fields (jobTitle, skills, etc.) pass through unchanged.

---

## Fix 7 — P2: createContact / multipleContact / createGroup company spoofing

**File:** `get-hired-BE/controllers/contactsController.js`  
**Status:** APPLIED — all 3 handlers fixed

**Pattern for all three:** Derive `companyId` from JWT via `getUserCompany(req.user.uid)` with full `Array.isArray` guard, then inject it into the service call, overriding any body-supplied value.

- `createContact`: passes `{ ...contact, companyId }` to `addContact()`
- `multipleContact`: passes `{ ...option, companyId }` for each contact to `addMultipleContact()`
- `createGroup`: removed `companyId` from body destructure; passes JWT-derived `companyId` to `addGroup()`

---

## Fix 8 — P3: updateCompany missing Array.isArray guard

**File:** `get-hired-BE/controllers/companiesController.js`  
**Status:** APPLIED

**Change:** Added `Array.isArray(userCompany)` leg and changed bare string 403 to JSON:

```js
if (Array.isArray(userCompany) || !userCompany || userCompany.companyId !== companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
```

`getUserCompany` returns `[]` (truthy array) when no company row exists — the prior `!userCompany` check alone would have passed for a caller with no company.

---

## Fix 9 — P3: getAllApplicantOfJob bare "Forbidden"

**File:** `get-hired-BE/controllers/jobsController.js`  
**Status:** APPLIED

**Change:** Replaced `res.status(403).send("Forbidden")` with JSON and added `Array.isArray` guard:

```js
if (!jobCompanyId || !callerCompany || Array.isArray(callerCompany) || callerCompany.companyId !== jobCompanyId) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
```

---

## Fix 10 — P3: setFormGroup subscription accumulation

**File:** `get-hired-FE/src/app/job/job-create/job-create.component.ts`  
**Status:** APPLIED

**Change:** Added `private formSubs = new Subscription()` class field. In `setFormGroup()`, the two `statusChanges` subscriptions now go into `formSubs` (unsubscribed and replaced on each call) instead of accumulating in the main `subscriptions` bag:

```ts
this.formSubs.unsubscribe();
this.formSubs = new Subscription();
this.formSubs.add(this.jobForm.controls.initialData.statusChanges...);
this.formSubs.add(this.jobForm.controls.jobInfo.statusChanges...);
```

`ngOnDestroy()` also calls `this.formSubs.unsubscribe()` to clean up.

---

## Fix 11 — P3: #sub-company-component mobile padding (notched iPhones)

**File:** `get-hired-FE/src/app/employer-panel/employer-panel.component.scss`  
**Status:** APPLIED

**Change:** Updated the mobile media-query rule from `72px` to `calc(72px + env(safe-area-inset-bottom, 0px))`:

```scss
@media (max-width: 767px) {
  #sub-company-component {
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
  }
}
```

On non-notched devices `env()` resolves to 0px, so the value remains 72px. On iPhone notch/dynamic-island devices it adds the necessary inset so content clears the billing-bar + nav-bar stack.

---

## Deferred items

None. All 11 fixes applied.

---

## Overall production verdict

**READY — all 11 QA8 findings fixed, production build PASS.**

- 4 × P1 security fixes applied (changeJobStatus$ 403 swallow, createJobs spoofing, getUserCVlist open read, getCvById open read)
- 3 × P2 security fixes applied (sub-array BOLA ×5 handlers, createProfile userId, contacts company spoofing ×3 handlers)
- 4 × P3 polish fixes applied (updateCompany guard, getAllApplicantOfJob bare Forbidden, setFormGroup subscriptions, safe-area padding)
- Build: 0 errors, warnings are pre-existing and unrelated to this sprint
