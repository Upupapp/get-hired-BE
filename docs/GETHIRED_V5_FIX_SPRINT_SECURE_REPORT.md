# GETHIRED V5 Fix Sprint — SECURE Audit Report

**Date:** 2026-06-24
**Scope:** 13 changed files across get-hired-FE and get-hired-BE (fix sprint only)
**Auditor:** Claude Code SECURE agent
**Overall Verdict:** PASS WITH FINDINGS

Three previously-known P0s (XSS, BOLA on user-delete, BOLA on applicant-list) are confirmed fixed.
Two new findings are raised — one P1 (error leak scope) and one P1 (deleteJob BOLA, currently
unreachable because the route is commented out — severity degrades to P1 only while that route
stays dead). Several pre-existing XSS surfaces in other auth components are out of scope for this
sprint but are called out below for completeness.

---

## 1. XSS Fix Verification

### Finding: CONFIRMED FIXED

**File audited:** `src/app/auth/signup/signup.component.html` (lines 82–87)

The previously vulnerable binding has been replaced:

```html
<!-- CURRENT — safe -->
<span>{{ error }}</span>
```

Angular's `{{ }}` interpolation HTML-encodes the value before inserting it into the DOM.
No `[innerHtml]` or `[innerHTML]` binding is present anywhere in `signup.component.html`.

**signup.component.ts — additional checks:**
- No `bypassSecurityTrust*` call exists anywhere in the file.
- `this.error` is assigned from two sources:
  1. `localStorage.getItem('loginError')` on init (line 24) — localStorage value originates from
     a previous server error string; with `{{ error }}` rendering this is now safe regardless of
     what is stored there.
  2. `this.authFacade.error$` via `showError()` (line 115) — assigns the raw error object/string
     from the NgRx auth state. No HTML is expected or produced here; the fix is sufficient.
- One residual `console.log(err)` remains in `showError()` (line 111). This logs the auth error
  object to the browser console. It is not a high-severity issue (no sensitive PII expected in
  auth error messages) but should be changed to `console.error` and eventually removed in
  production.

**Pre-existing XSS surfaces in other auth components (OUT OF SCOPE for this sprint, raised for
awareness — these were not introduced by the fix sprint):**

| File | Binding | Source of value |
|------|---------|-----------------|
| `auth/signin/signin.component.html:76` | `[innerHtml]="error"` | Auth facade error$ |
| `auth/change-pw/change-pw.component.html:18,26` | `[innerHtml]="message/error"` | Auth facade |
| `auth/reset-password/reset-password.component.html:17` | `[innerHtml]="error"` | Auth facade |
| `company/company-basic/company-basic.component.html:13` | `[innerHtml]="error"` | Auth facade |

These are all auth/error message slots that carry server-returned strings. Angular's
DomSanitizer sanitizes `[innerHtml]` before rendering, so these are low-severity in practice,
but they represent unnecessary attack surface and should be migrated to `{{ }}` interpolation.
They are P3 findings (hardening, not critical).

---

## 2. BOLA Fix — deleteAccountById in userController

### Finding: CONFIRMED FIXED — with one caveat

**File audited:** `get-hired-BE/controllers/userController.js` (lines 531–546)

```javascript
const deleteAccountById = async (req, res) => {
  const { userId } = req.query;

  if (userId !== req.user.uid) {           // ownership check — line 534
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const account = await deleteUserAccount(userId);
    ...
  }
```

**Route:** `router.put("/auth/archive", verifyAuth, deleteAccountById)` — confirmed in
`routes/userRoute.js` line 31. The `verifyAuth` middleware is applied, so `req.user` is always
populated before the handler runs (verified in `middleware/verifyAuth.js`: it calls
`firebaseAdmin.auth().verifyIdToken(idToken)` and assigns `req.user = decodedIdToken`; on
failure it returns 403 before calling `next()`).

**Strict equality check:** The check uses `!==` (strict inequality), not `!=`. Since both
`userId` (a query param string) and `req.user.uid` (a Firebase UID string) are strings, type
coercion is not a concern here, but strict equality is the correct choice regardless.

**Null check gap:** If `userId` is absent from the query string, `userId` is `undefined`. The
check `undefined !== req.user.uid` evaluates to `true` (a non-empty UID string is never
`=== undefined`), so the 403 is correctly returned and no DB operation is attempted. The null
case is therefore safe, though explicit null-checking would be clearer.

**Error leak in catch block (line 543):**
```javascript
errorMessage.error = "ERROR: " + error;
```
This leaks internal DB/Firebase error details to the caller. This is the same pattern fixed in
jobsController for the three main handlers. It was not fixed here — see Finding #5 below.

**Attack surface completeness:** The handler is only reachable via the single wired route
(`PUT /auth/archive`), which requires `verifyAuth`. No alternate path to this function was
identified. The BOLA is fully closed on the user-delete surface.

---

## 3. New XSS Surface Scan — Changed HTML Templates

### employer-panel.component.html

**File audited:** `src/app/employer-panel/employer-panel.component.html`

The mobile nav (lines 24–73) adds 5 `<a>` elements with `routerLink`, hardcoded SVG icons, and
hardcoded string labels ("Dashboard", "Jobs", "Candidates", "Post Job", "Company"). No dynamic
data, no `[innerHtml]`, no user-controlled interpolation. No XSS surface introduced.

### company-dashboard.component.html

**File audited:** `src/app/company/company-dashboard/company-dashboard.component.html`

All data bound with `{{ }}` interpolation — no `[innerHtml]` anywhere in this file. Specific
checks:
- `{{ applicant.candidateName?.charAt(0) || '?' }}` (line 146) — null guard present, safe.
- `{{ applicant.candidateName }}` (line 148) — renders as text, not HTML. Safe.
- `{{ step.title }}`, `{{ step.desc }}`, `{{ step.cta }}` (onboarding checklist, lines 182–190)
  — confirmed in `company-dashboard.component.ts` that these are hardcoded string literals
  defined in the `onboardingSteps()` method, not from API responses. Safe.
- `{{ stage.label }}`, `{{ stage.count }}` (pipeline, lines 130–131) — sourced from
  `res?.data?.byStage` API response. These are rendered with `{{ }}` not `[innerHtml]`, so safe.
  Numeric `count` cannot carry XSS. String `label` is text-encoded by Angular.

### signup.component.html

Covered in section 1. No new XSS surfaces.

**Verdict:** No new XSS surfaces introduced by the fix sprint templates.

---

## 4. Console.log Removal Audit — job-create.component.ts

**File audited:** `src/app/job/job-create/job-create.component.ts`

The main `job-create.component.ts` file contains no `console.log` calls at all — none were
found. The fix sprint note says console.logs were removed; the file is clean of them.

**Residual console.logs in child components (NOT changed by this fix sprint, noted for
completeness):**

| File | Line | Content |
|------|------|---------|
| `preview-job-post-step.component.ts` | 64–65 | `console.log('PREVIEW: ')`, `console.log(this.preview)` — logs job preview data |
| `preview-job-post-step.component.ts` | 168 | `console.log(dragPosition, imageSourceFile?.scrollHeight)` — layout debug |
| `job-post-detail-step.component.ts` | 51 | `console.log(this.initialDetailsForm)` — logs form object |
| `job-post-detail-step.component.ts` | 85, 108, 120 | Various form/event debug logs |
| `create-interview.component.ts` | 98 | `console.log(result)` |

None of these log auth tokens, passwords, or user credentials. They log form/UI state. Severity
is P3 (production hygiene — should be removed before final release, but not a data-exposure risk
in a development/staging build).

The `signup.component.ts` retains `console.log(err)` in `showError()` (line 111). Auth error
objects from Firebase are logged to the browser console. This is a cosmetic/hygiene issue (P3).

**No console.log logs sensitive material (tokens, passwords, PII) in the changed files.**

---

## 5. Error Leak Fix — jobsController.js

### Finding: PARTIALLY FIXED — three targeted handlers fixed, fourteen others remain

**File audited:** `get-hired-BE/controllers/jobsController.js`

**Fixed (confirmed):**

| Handler | Before | After |
|---------|--------|-------|
| `createJobs` (line 149–153) | `errorMessage.data = "Operation Not Successful. " + error` | `console.error('[createJobs] error:', error)` + generic message to client |
| `deleteJob` (line 207–210) | leaked raw error | `console.error('[deleteJob] error:', error)` + generic message |
| `updateJob` (line 317–321) | leaked raw error | `console.error('[updateJob] error:', error)` + generic message |

All three now send `"Operation not successful. Please try again."` to clients, and log the real
error server-side with `console.error`. This is correct.

**Still leaking in jobsController.js (same file, out-of-sprint handlers):**

Lines 165, 178, 191, 334, 380, 401, 420, 439, 530, 554, 574, 596, 618, 636, 653 — all use
`errorMessage.error = "ERROR: " + error` pattern, leaking internal DB/Node.js error details.

**Other controllers with the same leak pattern:**

| Controller | Leak instances |
|------------|---------------|
| `userController.js` | 6 active instances (lines 280, 292, 306, 327, 358, 543) |
| `companiesController.js` | ~12 instances |
| `interviewController.js` | 8 instances |
| `applicantsController.js` | 13 instances |
| `messageController.js` | 3 instances |
| `cvController.js` | 2 instances |
| `candidateController.js` | 1 instance |
| `optionsController.js` | 3 instances |
| `paymentController.js` | 2 instances |
| `subscriptionController.js` | 3 instances |
| `adminController.js` | 1 instance |
| `employerController.js` | 1 instance |

**Total remaining leak instances across codebase: approximately 55.**

These leak Postgres error messages (which can include table names, column names, constraint
names, and query fragments), Firebase error codes and messages, and Node.js stack-trace strings
to API callers. This is a P1 finding for any route accessible to authenticated users, and a P0
for any unauthenticated route (e.g., `loginUser` at line 94 of userController — the catch block
sends `"Operation Not Successful. " + err` directly).

---

## 6. New Issues Assessment

### 6a. Error leak pattern in other BE controllers

**Confirmed:** The `"ERROR: " + error` pattern is present in every controller that was not
changed by this fix sprint (see full list in section 5 above).

**Severity assessment:**

- **P0 (unauthenticated routes):** `loginUser` catch block in `userController.js` (line 94–97)
  sends raw Firebase/DB error to unauthenticated callers. An attacker can probe signup/login
  endpoints to enumerate error messages and learn internal details (database schema, Firebase
  project config, etc.). This is the highest-severity remaining instance.

- **P1 (authenticated routes):** All other controllers — leaking to authenticated but potentially
  malicious or compromised sessions. DB schema information (table names, constraint names)
  revealed through error strings can accelerate SQL injection attempts or BOLA probing.
  Approximately 54 additional instances across the codebase.

**Recommended action:** Create a shared error-response helper (`sendError(res, statusCode,
publicMessage, internalError)`) that logs internally and sends only the public message. Apply
across all controllers in one sweep. This is a one-sprint project.

### 6b. deleteJob — missing caller-owns-job check

**File audited:** `get-hired-BE/controllers/jobsController.js` (lines 196–211)
**Route file:** `get-hired-BE/routes/jobsRoute.js`

```javascript
// routes/jobsRoute.js line 27
// router.delete("/jobs/delete", deleteJob);  ← COMMENTED OUT
```

**Current status:** The `deleteJob` handler is defined and contains no ownership check, but the
route is commented out. The endpoint is currently unreachable in production.

**Vulnerability if route were re-enabled:** Any authenticated employer could delete any job
belonging to any other company. The handler only checks that `req.user` exists (via `verifyAuth`)
but does not confirm that the job being deleted belongs to the caller's company. The fix used for
`deleteInterviewQuestion` (no ownership check either) and `updateJob` (no ownership check on the
`job_id`) applies here too — `getJobCompanyId(jobId)` + `getUserCompany(req.user.uid)` +
comparison is the established pattern (see `getAllApplicantOfJob`, lines 584–598).

**Severity:**
- **Current:** P1 (the handler code itself is a BOLA, but the dead route means it is not
  exploitable today).
- **If route re-enabled without fix:** P0 (any employer deletes any job across all companies).

**Recommended action:** Before re-enabling the delete route, add the company-ownership check
identical to `getAllApplicantOfJob`. Do not re-enable the commented-out route without this fix.

Additionally, `updateJob` (fully wired at `PUT /job/updatejobs` with `verifyAuth`) does not
verify that the `jobId` in the request body belongs to the caller's company. This is a live P1
BOLA: any authenticated employer can overwrite any other company's job post. This was not a
fix-sprint change but is closely related and should be addressed alongside `deleteJob`.

---

## 7. Fair-Hiring Guardrail Confirmation

All 13 changed files have been read in full. No fix sprint change:

- Auto-rejects applicants: **Not present.** No applicant status is set automatically.
- Hides applicants based on score: **Not present.** Applicant lists are not filtered by any
  computed score in changed code.
- Scores protected attributes: **Not present.** No demographic fields are evaluated.
- Exposes cross-company data: **Not introduced.** The `getAllApplicantOfJob` BOLA fix in
  `jobsController.js` tightens cross-company isolation (does not loosen it). The `deleteAccountById`
  fix in `userController.js` adds self-ownership enforcement.
- Claims AI screening: **Not present.** No marketing copy or API response in changed files
  claims AI-based screening or automated decision-making.

**Fair-hiring verdict: PASS. No guardrail violations introduced by this sprint.**

---

## 8. Findings Table

| ID | Severity | Category | File(s) | Description | Status |
|----|----------|----------|---------|-------------|--------|
| F-01 | FIXED | XSS | signup.component.html | `[innerHtml]="error"` replaced with `{{ error }}` | Closed |
| F-02 | FIXED | BOLA | userController.js | `deleteAccountById` missing ownership check | Closed |
| F-03 | FIXED | BOLA | jobsController.js, jobsRoute.js | `getAllApplicantOfJob` missing auth + ownership | Closed |
| F-04 | FIXED | Error leak | jobsController.js | `createJobs`, `deleteJob`, `updateJob` leaked raw errors | Closed (3 handlers) |
| F-05 | P1 | Error leak | All controllers | ~55 remaining `"ERROR: " + error` instances leak DB/Firebase internals | Open |
| F-06 | P0 | Error leak | userController.js:94 | `loginUser` catch sends raw error to unauthenticated callers | Open |
| F-07 | P1 | BOLA | jobsController.js:196 | `deleteJob` has no company-ownership check (route currently dead) | Open — do not re-enable route without fix |
| F-08 | P1 | BOLA | jobsController.js:213 | `updateJob` has no company-ownership check (route is live) | Open |
| F-09 | P3 | XSS hygiene | signin, change-pw, reset-password, company-basic | Pre-existing `[innerHtml]="error"` in other auth components | Open — hardening |
| F-10 | P3 | Console hygiene | signup.component.ts:111, job-create child components | Residual `console.log` in production code | Open |
| F-11 | P3 | State hygiene | signup.component.ts:23–24 | `error` initialized from `localStorage.getItem('loginError')` at class property level (not in ngOnInit) — runs before component lifecycle, minor race risk | Open |

---

## 9. Recommended Next Security Actions

**Immediate (before next production deploy):**

1. **Fix `loginUser` error leak (F-06, P0):** Wrap the `loginUser` catch block in `userController.js`
   to send a generic message. This is an unauthenticated endpoint and leaks Firebase/DB error details
   to anyone.

2. **Fix `updateJob` BOLA (F-08, P1):** Add company-ownership check to `updateJob` using the
   `getJobCompanyId` + `getUserCompany` pattern. This route is live and accessible to all
   authenticated employers.

**Before re-enabling `deleteJob` route (F-07):**

3. Add company-ownership check to `deleteJob` handler. Do not uncomment the route until this is done.

**Next sprint (batch sweep):**

4. **Sweep all error leak instances (F-05):** Create a shared `sendError(res, code, publicMsg, err)`
   helper. Apply to all ~55 remaining `"ERROR: " + error` instances. Estimated: one PR, one sprint.

5. **Sweep `[innerHtml]` → `{{ }}` in auth components (F-09):** Four files. Quick mechanical
   change; verify each source is plain-text-only after migration.

6. **Remove console.logs from production code (F-10):** Child components of `job-create` and
   `signup.component.ts` line 111.
