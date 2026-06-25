# GetHired QA Cycle 9 — Fix Sprint Log

**Date:** 2026-06-25
**Sprint scope:** All findings from QA Cycle 9 in priority order

---

## Build Result

**PASS** — Production build completed successfully.
- Build time: ~31.6s
- Zero compilation errors
- Two autoprefixer CSS warnings (pre-existing, harmless)
- xlsx upgraded from 0.17.5 to 0.18.5 (CVE-2023-30533 resolved)

---

## Fix 1 (P1) — deleteApplication crash + BOLA — APPLIED

**File:** `get-hired-BE/controllers/applicantsController.js`

Two sub-fixes:

**1a — deleteApplication runtime crash + BOLA:**
- `candidateId` was referenced on line 69 (`getApplicationListCandidate(candidateId)`) but was never destructured from `req.body` — ReferenceError on every call.
- Fixed: `const candidateId = req.user.uid;` (JWT-derived, never from body).
- Also added `AND candidate_id=$2` to the DELETE WHERE clause so a caller can only delete their own application.

**1b — createApplication BOLA:**
- Was: `const { jobId, candidateId, status } = req.body;` — body-supplied `candidateId` used as the insert anchor.
- Fixed: `const candidateId = req.user.uid;` — only destructure `jobId` and `status` from body.

---

## Fix 2 (P1) — saveVideoCV ownership + crash fix — APPLIED

**Files:**
- `get-hired-BE/controllers/applicantsController.js` (ownership pre-check)
- `get-hired-BE/services/applicant.service.js` (undefined variable crash)

**2a — Ownership pre-check (controller):**
- `saveVideoCV` passed `applicantProfileId` from `req.body` to the service's storage write without verifying ownership.
- Added the same `SELECT 1 FROM applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2` check (consistent with `saveWorkExp`, `saveEducBg`, etc.) before calling `updateProfileSaveVideoCV`.
- Note: the service's UPDATE already uses `WHERE user_id=$3` (JWT-derived `uid`), so DB write ownership was enforced; the gap was the storage bucket path using `applicantProfileId` before the ownership check.

**2b — Undefined variable crash (service):**
- `applicant.service.js:564`: `throw error` inside the try block where `error` is not yet in scope (only defined in the catch block at line 573). This was a ReferenceError on the error path.
- Fixed to: `throw new Error('Failed to save video CV');`

---

## Fix 3 (P2) — addCompanyUser no ownership check — APPLIED

**File:** `get-hired-BE/controllers/companiesController.js`

- `addCompanyUser` accepted `companyId` from `req.body` with no verification — any authenticated employer could invite users to a different company.
- Fixed: removed `companyId` from body destructure; derive from `getUserCompany(req.user.uid)` with `Array.isArray` guard.
- `companyId` is now JWT-derived before the invite loop runs.

---

## Fix 4 (P2) — saveQuestionTemplate companyId from body — APPLIED

**File:** `get-hired-BE/controllers/interviewController.js`

- `saveQuestionTemplate` accepted `companyId` from `req.body` — any employer could create a template attributed to a different company.
- Fixed: removed `companyId` from body destructure; added `getUserCompany(req.user.uid)` with `Array.isArray` guard; `companyId` is now JWT-derived.
- Also added `dbQuery` and `dbSchema` imports to the file (needed for Fixes 5 and 6 ownership checks).

---

## Fix 5 (P2) — updateJobInterviewQuestion no ownership check — APPLIED

**File:** `get-hired-BE/controllers/interviewController.js`

- `updateJobInterviewQuestion` updated a question by `questionId` from `req.body` with no company-ownership check.
- `interview_template_question` has no `company_id` column directly — ownership is via `job_interview_template`.
- Fixed: added `getUserCompany` check + join query:
  ```sql
  SELECT itq.template_question_id
  FROM gethired.interview_template_question itq
  JOIN gethired.job_interview_template jit
    ON jit.job_interview_template_id = itq.job_interview_template_id
  WHERE itq.template_question_id=$1 AND jit.company_id=$2
  ```

---

## Fix 6 (P2) — deleteInterviewQuestion no ownership check — APPLIED

**File:** `get-hired-BE/controllers/jobsController.js`

- `deleteInterviewQuestion` deleted a question by `questionId` from query params with no ownership check.
- Applied the same `getUserCompany` + join-through-`job_interview_template` ownership check as Fix 5 before the DELETE.
- Caller's `companyId` must match `jit.company_id` for the question being deleted.

---

## Fix 7 (P2) — deleteCandidate no ownership check — APPLIED

**File:** `get-hired-BE/controllers/candidateController.js`

**Determination: employer-facing endpoint.**
- The `candidates` table has a `company_id` column set at import time (see `addCandidates` service — `companyId` is in the INSERT).
- This is a CRM-style "imported candidate" record, not an applicant's own profile.
- The endpoint is only called with `verifyAuth` by employer UI (same router as `createCandidate`, `list` by companyId etc.).

**Fix applied:**
- Added static import `getUserCompany` from `./companiesController` and `const dbSchema = env.schema` at module level.
- Added `getUserCompany(req.user.uid)` with `Array.isArray` guard before the DELETE.
- Folded ownership into DELETE WHERE: `WHERE candidate_id=$1 AND company_id=$2` — zero `rowCount` returns 403.

---

## Fix 8 (P2) — xlsx CVE-2023-30533 upgrade — APPLIED

**File:** `get-hired-FE/package.json`

- Previous version: `^0.17.5` (CVSS 9.8 prototype pollution, CVE-2023-30533)
- Upgraded to: `xlsx@0.18.5` (latest stable)
- Command: `npm install xlsx@latest --save`
- Production build: PASS — no build errors introduced by the upgrade.

---

## Fix 9 (P3) — removeCompanyUser missing Array.isArray guard — APPLIED

**File:** `get-hired-BE/controllers/companiesController.js`

- `removeCompanyUser` had `if (!callerCompany || callerCompany.companyId !== companyId)` — missing `Array.isArray(callerCompany)` check.
- `getUserCompany` returns `[]` (truthy empty array) when no company row exists, so `!callerCompany` would not catch a caller with no company.
- Fixed to: `if (Array.isArray(callerCompany) || !callerCompany || callerCompany.companyId !== companyId)`
- Also updated response from bare `res.status(403).send("Forbidden")` to `res.status(403).json({ message: "..." })` for consistency.

---

## Fix 10 (P3) — getJobApplicantFitSignals bare "Forbidden" — APPLIED

**File:** `get-hired-BE/controllers/jobsController.js`

- `getJobApplicantFitSignals` returned `res.status(403).send("Forbidden")` on the FORBIDDEN error branch.
- Changed to: `res.status(403).json({ message: "You don't have permission to do that." })`
- Consistent with all other 403 responses added across QA7/8/9 fix sprints.

---

## Fix 11 (P3) — .map(async) without await Promise.all — APPLIED

**File:** `get-hired-BE/controllers/applicantsController.js`

Three handlers fixed:

| Handler | Array processed | Was | Now |
|---|---|---|---|
| `saveWorkExp` | `workExperience` | `.map(async ...)` (unresolved) | `await Promise.all(.map(async ...))` |
| `saveEducBg` | `educationalBackground` | `.map(async ...)` (unresolved) | `await Promise.all(.map(async ...))` |
| `saveCert` | `certifications` | `.map(async ...)` (unresolved) | `await Promise.all(.map(async ...))` |

`saveSkillsArray` uses `saveApplicantDetailsList` which is already a single awaited call — no change needed.
`saveDocuments` already uses `await Promise.all(...)` correctly — confirmed, no change needed.

---

## Fix 12 (P3) — contactsController list/grouplist caller-supplied companyId — APPLIED

**File:** `get-hired-BE/controllers/contactsController.js`

Two handlers fixed:

**`list`:**
- Was: `const { companyId } = req.query` — any employer could read another company's contacts.
- Fixed: derive `companyId` from `getUserCompany(req.user.uid)` with `Array.isArray` guard.

**`grouplist`:**
- Same pattern — `companyId` from `req.query`.
- Fixed: same `getUserCompany(req.user.uid)` derivation.

Both handlers already imported `getUserCompany` (used by other handlers in the same file).

---

## Fix 13 (P3) — error$ subscription deduplication — APPLIED (removed duplicate)

**File:** `get-hired-FE/src/app/job/job-list/job-list.component.ts`

Two subscriptions to `jobError$` existed:

1. **Class field `error$`** (lines 74-76 before fix): `this.jobFacade.jobError$.subscribe(this.onError.bind(this))` — called `onError` (5s duration, "Dismiss" action, `danger-snackbar`). No cleanup via `takeUntil`.

2. **`ngOnInit` block** (lines 141-150): inline subscription via `this.req.add(this.jobFacade.jobError$.pipe(takeUntil(this.unsubscribe$)).subscribe(...))` — 4s duration, `danger-snackbar`, proper cleanup.

**Decision:** Kept the `ngOnInit` subscription (has cleanup, no leak). Removed the class-field `error$` subscription. Both would have shown double toasts on every job status error.

The `onError` method is still present in the class and continues to serve as a named handler if needed elsewhere.

---

## Deferred Items

None. All 13 QA9 findings addressed.

---

## Overall Production Verdict

**READY.** All 13 fixes applied without build breakage. No regressions detected in compilation. Key security improvements:
- **3 BOLA crashes closed** (createApplication, deleteApplication, saveVideoCV/service crash)
- **7 authorization gaps closed** (addCompanyUser, saveQuestionTemplate, updateJobInterviewQuestion, deleteInterviewQuestion, deleteCandidate, contacts list, contacts grouplist)
- **1 CVE patched** (xlsx 0.17.5 → 0.18.5, CVE-2023-30533 CVSS 9.8)
- **1 silent-failure pattern fixed** (3 handlers: await Promise.all)
- **1 duplicate subscription removed** (job-list double toast)
- **1 response shape normalized** (getJobApplicantFitSignals JSON 403)
- **1 missing guard added** (removeCompanyUser Array.isArray)
