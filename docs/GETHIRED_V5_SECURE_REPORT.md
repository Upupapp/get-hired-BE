# GETHIRED V5 SECURE REPORT

**Audit date:** 2026-06-24
**Scope:** 9 FE files changed in V5 deployment (see below)
**Auditor:** Claude Code SECURE mode
**Verdict: PASS WITH P1 FINDINGS**

No launch-blocking (P0) issues found.
Two P1 issues require remediation before the next deploy.
Additional P2/P3 findings documented below.

---

## Files Audited

1. `src/app/job/job-create/job-create.component.ts`
2. `src/app/employer-panel/employer-panel.component.html`
3. `src/app/employer-panel/employer-panel.component.scss`
4. `src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts`
5. `src/app/company/company-dashboard/company-dashboard.component.html`
6. `src/app/company/company-dashboard/company-dashboard.component.ts`
7. `src/app/company/company-dashboard/company-dashboard.component.scss`
8. `src/app/auth/signup/signup.component.html`
9. `src/app/auth/signup/signup.component.scss`

Supporting files also read: `employer-panel.module.ts`, `employer-jobs.module.ts`, `employer-internal-authguard.ts`, `app.routing.module.ts`, `auth.guard.ts`, `employer.guard.ts`, `signup.component.ts`, `auth.effects.ts`, `auth.reducer.ts`, `auth.facade.ts`, `job-applicants.component.ts`, `employer-interview.module.ts`, `userController.js`, `userRoute.js`, `jobsRoute.js`, `jobsController.js`, `companiesController.js`, `companiesRoute.js`, `verifyAuth.js`.

---

## Executive Summary

V5 is a focused UX release: optional interview questions, mobile nav, onboarding checklist, employer signup copy. The prior P0 fixes (AuthGuard wrong-role bypass, UnauthorizedInterceptor, ApplicantGuard) held — none were regressed by V5.

The two P1 findings are:
- **P1-A: `[innerHtml]` binds raw server error text in signup** — pre-existing but elevated because V5 adds employer-specific error paths; risk is low-impact XSS if the BE ever returns HTML in error strings.
- **P1-B: `deleteAccountById` does not validate that the caller owns the account being deleted** — pre-existing route-level issue, not introduced by V5, but re-confirmed in scope.

No new P0 issues were introduced by V5 changes.

---

## P0 Findings — Launch Blockers

**None.** V5 did not introduce any launch-blocking security issues.

---

## P1 Findings — Fix Before Next Deploy

### P1-A: `[innerHtml]` Renders Raw Server Error in Signup

**File:** `src/app/auth/signup/signup.component.html` line 86
**Code:** `<span [innerHtml]="error"></span>`

**Flow:**
1. Signup failure → `auth.effects.ts` catchError extracts `err.error.error` (a string from BE)
2. Stored as `action.payload` in `auth.reducer.ts`
3. Surfaced via `authFacade.error$` → `showError()` assigns to `this.error`
4. Rendered via `[innerHtml]` in the alert

**Risk:** Angular's `[innerHtml]` sanitizes by default using `DomSanitizer`, which removes `<script>` tags. However it **does not strip all XSS vectors** — `<img src=x onerror=...>` survives sanitization in some Angular versions. The `error` value comes from the BE's `errorMessage.error` string. Currently all BE error strings in `userController.js` are plain text concatenations, so there is no active exploit. Risk is elevated if:
- BE error messages ever include user-controlled content (e.g., the email address echoed back)
- A future path passes an object instead of a string, resulting in `[object Object]` or unexpected coercion

**Fix:** Replace `[innerHtml]` with `{{ error }}` (plain text interpolation). Angular's text interpolation never executes HTML. There is no known use case requiring HTML in signup error messages.

```html
<!-- Before -->
<span [innerHtml]="error"></span>

<!-- After -->
<span>{{ error }}</span>
```

This fix is safe and minimal — it changes only rendering, not logic.

---

### P1-B: `deleteAccountById` Does Not Verify Caller Owns the Account

**File:** `get-hired-BE/controllers/userController.js` lines 531-542
**Route:** `PUT /auth/archive` (protected by `verifyAuth`)

**Code:**
```js
const deleteAccountById = async (req, res) => {
  const { userId } = req.query;
  // ... no check that req.user.uid === userId
  const account = await deleteUserAccount(userId);
```

**Risk:** Any authenticated user (role 2 or 3) can archive any other user's account by passing an arbitrary `userId` query param. This is a BOLA (Broken Object Level Authorization) issue. The `verifyAuth` middleware validates the token but does not restrict which `userId` may be acted upon.

**Note:** This is not a V5 regression — the route existed before. It is re-confirmed here because the V5 employer onboarding path creates more employer accounts and increases the attack surface slightly (more accounts to target).

**Fix:**
```js
const deleteAccountById = async (req, res) => {
  const { userId } = req.query;
  // Enforce: caller may only archive their own account
  if (!userId || userId !== req.user.uid) {
    return res.status(403).send("Forbidden");
  }
  ...
```

---

## P2 Findings — Medium Severity

### P2-A: `console.log` Statements Leak Job Data and Form Controls in Production

**File:** `src/app/job/job-create/job-create.component.ts`
**Lines:** 131, 320, 340, 347–348, 409, 428, 500

Multiple `console.log(data)`, `console.log(job)`, `console.log(this.jobForm.controls)` statements remain in the published component. In a browser DevTools session, these expose:
- Full job object including `companyId`, salary range, description
- Interview question content
- Full `FormGroup` control tree

**Risk:** Low direct exploitability (browser console only), but violates data minimization principles and reveals internal data structures to anyone inspecting the employer's browser. Worse in a shared-device or screen-share context.

**Fix:** Remove or gate behind `isDevMode()` / environment flag.

---

### P2-B: Sidebar Logs User Object at Init

**File:** `src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts`

The V5 comment says debug `console.log` calls were removed, but lines 46–48 in ngOnInit contain the comment `// OPTIMIZE V5: removed debug console.log calls`. Verified that the calls themselves are gone. This is a **PASS** — flagged here only for confirmation that the cleanup happened.

---

### P2-C: `loginUser` BE Error Exposes Internal Error Object

**File:** `get-hired-BE/controllers/userController.js` line 95

```js
errorMessage.error = "Operation Not Successful. " + err;
```

`err` is a caught exception. When stringified, `Error` objects produce their `.message`, but some libraries produce full stack traces. If `err` is a Postgres error, this can leak schema names, table names, query structure, or constraint names.

**Risk:** Medium — same pattern exists throughout the codebase, not specific to V5. The V5 change increases employer signups, making the signup error path more trafficked.

**Fix:** Log `err` server-side only; return a generic message to the client:
```js
console.error(err);
errorMessage.error = "Operation not successful. Please try again.";
```

---

## P3 Findings — Low Severity / Informational

### P3-A: Mobile Nav `Post Job` Link Has No `routerLinkActive`

**File:** `src/app/employer-panel/employer-panel.component.html` line 43

The `/recruiter/jobs/create` nav item uses `class="gh-mobile-nav-item gh-mobile-nav-item--create"` without `routerLinkActive`. Other items correctly apply `routerLinkActive="gh-mobile-nav-item--active"`. This is a UX gap (no visual active state) but has no security implication.

---

### P3-B: `InternalEmployerGuard` Trusts `localStorage.companyName` for Access Control

**File:** `src/app/employer-panel/employer-internal-authguard.ts`

This guard checks `JSON.parse(localStorage.getItem('user')).companyName`. The V5 company dashboard checklist links go through `goToCompanyProfile()` and `goToCreateJob()` which navigate to `/recruiter/company/details` and `/recruiter/jobs/create` — both sit under the `recruiter` path, which is protected by `AuthGuard` (role='2'). The `InternalEmployerGuard` is currently **commented out** on all child routes in `employer-panel.module.ts` (`// canActivate: [InternalEmployerGuard]`), so it is not an active gate. No security issue introduced by V5 here, but the dormant guard uses client-side data that could be spoofed if reactivated.

---

### P3-C: `onboardingSteps()` Called in Template Without Memoization

**File:** `src/app/company/company-dashboard/company-dashboard.component.html` line 164, 169

```html
*ngIf="!pipelineLoading && onboardingSteps(dashboard.company, dashboard.charts).length > 0"
...
*ngFor="let step of onboardingSteps(dashboard.company, dashboard.charts)"
```

`onboardingSteps()` is called **twice per change-detection cycle**. No security issue, but the function builds an array with inline arrow functions per call. In a security context, inline `action: () => this.goToXxx()` closures are fine — they navigate to hardcoded Angular router paths, not user-supplied URLs. Confirmed safe.

---

### P3-D: Interview Route Still Exists in Router (Sidebar-Removed But Reachable by URL)

**File:** `src/app/employer-panel/employer-panel.module.ts` lines 40–42

```ts
{
  path: 'interview',
  loadChildren: () => import('./employer-interview/employer-interview.module')...
}
```

V5 removed "Interviews" from the sidebar (`employer-sidebar.component.ts`), but the `/recruiter/interview` route remains registered in the module. A user can still navigate to it directly. The interview component (`employer-interview.component.ts`) is a near-empty stub with no constructor logic, no data fetches, and no sensitive operations. The route is behind the `AuthGuard` (role='2') via the parent `recruiter` route. **No security issue** — the stub exposes nothing. Flagged as a dead-link cleanup item only.

---

## Route Guard Integrity Audit

| Route | Guard Chain | Verdict |
|---|---|---|
| `/recruiter` (parent) | `AuthGuard` (role='2') in `app.routing.module.ts` | PASS |
| `/recruiter/dashboard` | Inherits parent AuthGuard | PASS |
| `/recruiter/jobs/list` | Inherits parent AuthGuard | PASS |
| `/recruiter/jobs/create` | Inherits parent AuthGuard | PASS |
| `/recruiter/jobs/applicants` | Inherits parent AuthGuard | PASS |
| `/recruiter/company/details` | Inherits parent AuthGuard | PASS |
| `/recruiter/subscription` | Inherits parent AuthGuard | PASS |
| `/recruiter/interview` | Inherits parent AuthGuard (stub only) | PASS (stub) |

**AuthGuard behavior (verified):** Reads `state` from localStorage; if not `'true'`, redirects to `/signin`. If role does not match route's `data.role`, redirects to correct panel. The prior wrong-role bypass bug (returned `true` instead of `false`) is fixed and was **not regressed by V5**.

**Post-publish redirect** (`/recruiter/jobs/applicants?id=X`): Navigated to by `router.navigate()` after a successful publish. The target is inside the `recruiter` panel, inherits `AuthGuard` (role='2'). Guard runs on navigation; only a logged-in employer can reach it. **PASS.**

**Mobile nav items:** All 5 items link to routes inside `/recruiter/**`:
- `/recruiter/dashboard` — guarded PASS
- `/recruiter/jobs/list` — guarded PASS
- `/recruiter/jobs/create` — guarded PASS
- `/recruiter/company/details` — guarded PASS
- `/recruiter/subscription` — guarded PASS

No mobile nav item links to a public or unguarded route. **PASS.**

**Onboarding checklist CTAs:** All use `this.goToCompanyProfile()`, `this.goToCreateJob()`, `this.goToApplicants()` — all route to `recruiter/**` paths. **PASS.**

**Sidebar interview removal:** Route is still registered but hidden from nav. No security impact (route is guarded and stub). **PASS.**

---

## BOLA / Role Escalation Audit

### `?role=2` Query Param — Signup Display Copy Only

**Verified in `signup.component.ts`:**

```ts
const requestedRole = this.activatedRoute.snapshot.queryParamMap.get('role');
if (requestedRole === '2' || requestedRole === '3') {
  this.registerForm.patchValue({ role: Number(requestedRole) });
}
```

The `?role=2` param sets the **form field default** so the user doesn't have to manually pick "Employer" from the dropdown. The dropdown is still rendered and the user can change it. The form field value is submitted to the BE as part of the normal registration payload.

**This is intentional and safe** because:
1. The BE (`registerUser` in `userController.js`) validates role server-side with an allowlist: `const ALLOWED_ROLES = [2, 3]; if (!ALLOWED_ROLES.includes(Number(role))) return 400`
2. Role 1 (admin) cannot be self-assigned via signup — hard-blocked at the BE
3. The FE dropdown only offers options `[value]="3"` (applicant) and `[value]="2"` (employer); no client-side path assigns any other value
4. Title/CTA text changes based on `role_validators?.value === 2` — purely display logic, no auth consequence

**Verdict: PASS.** The `?role=2` param pre-fills a valid user-visible dropdown. It does not bypass, circumvent, or self-assign any privileged role. Role assignment is enforced server-side.

### Job applicants BOLA (BOLA check on `/job/applicants?id=X`)

**Verified in `getAllApplicantOfJob` (`jobsController.js` lines 576–596):**
- Route is protected by `verifyAuth`
- Controller fetches `getJobCompanyId(id)` to get the job's owner company
- Compares against `getUserCompany(req.user.uid).companyId`
- Returns 403 if mismatch

An employer cannot view another company's applicants by changing the `?id=` param. **PASS.**

---

## Data Isolation Audit

### Dashboard Checklist — Company Scoping

`company-dashboard.component.ts` calls `companyFacade.getCompanyDashboard()` and `companyService.getDashboardPipelineOverview()`. The pipeline endpoint (`GET /company/dashboard/pipeline-overview`) uses `req.user.uid` to resolve the company — the uid comes from the verified Firebase token, not from any query param or body. Scoped to the logged-in employer's company. **PASS.**

The checklist uses `dashboard.company` (from the dashboard response) and `dashboard.charts` (from the same response). Both are derived from the server's company-scoped data. Checklist labels are hardcoded strings: `'Complete your company profile'`, `'Post your first job'`, `'Review your first applicants'`. **PASS — no cross-company leakage.**

### Sidebar — No Employer-Specific Data Fetched in V5

V5's `employer-sidebar.component.ts` restructure is purely a `sidebarItems` array rebuild. No new data fetches were added. No unread counts or cross-company data surfaces from this component. **PASS.**

### Post-Publish `jobId` URL Manipulation

The `jobId` passed to `/recruiter/jobs/applicants?id=X` comes from `this.jobId` which is the job the employer just created (`getJobById` stores it from the facade). An employer who manipulates this URL to someone else's `jobId` will hit the BE's BOLA check (verified above). **PASS.**

---

## XSS Surface Audit

| Location | Binding | Content Source | Risk |
|---|---|---|---|
| `signup.component.html` line 86 | `[innerHtml]="error"` | BE error string | P1-A (see above) |
| `company-dashboard.component.html` | `{{ step.title }}`, `{{ step.desc }}` | Hardcoded in TS | PASS |
| `company-dashboard.component.html` | `{{ dashboard.company?.companyName }}` | Server, text interpolation | PASS |
| `company-dashboard.component.html` | `{{ stage.label }}`, `{{ stage.count }}` | Server, text interpolation | PASS |
| `company-dashboard.component.html` | `{{ applicant.candidateName }}` | Server, text interpolation | PASS |
| `employer-panel.component.html` (mobile nav) | All static SVG + hardcoded labels | Hardcoded | PASS |
| `employer-sidebar.component.ts` | `sidebarItems[].title` | Hardcoded strings + i18n keys | PASS |
| `job-create.component.ts` | snackBar.open(`Missing: ${missingJob}`) | Local string built from field IDs | PASS |

**No use of `bypassSecurityTrustHtml`, `bypassSecurityTrustUrl`, or `bypassSecurityTrustResourceUrl` in any V5-changed file.** Only the pre-existing `[innerHtml]` in signup.

**Onboarding step labels:** Hardcoded in `onboardingSteps()` method — not from API. `step.cta` values are hardcoded strings. **PASS.**

**Mobile nav labels:** Hardcoded strings (`Home`, `Jobs`, `Post Job`, `Company`, `Account`). **PASS.**

---

## Auth Flow Audit — Signup

1. User visits `/signup?role=2` → role form field pre-filled to `2` (employer)
2. User fills form → submits → `authFacade.signUp(credentials)` dispatched
3. Effect calls `authService.signUp()` → `POST /auth/signup`
4. BE `registerUser`: validates email/password, checks `ALLOWED_ROLES.includes(Number(role))`, creates Firebase user, inserts into `user_credentials` with `role` column, sends verification email
5. Success → FE navigates to `/auth/verify?mode=registered` (not to any privileged area)
6. User must verify email (Firebase `emailVerified` check in `loginUser`) before accessing employer panel

**No client-side role assignment.** The form's `role` field is a data payload to the server; the server enforces allowlist. After signup, redirect goes to email verification, not to dashboard or any protected area. **PASS.**

---

## Fair-Hiring Guardrail Confirmation

Checked all 9 V5-changed files against the mandatory fair-hiring checklist:

| Check | Status |
|---|---|
| Auto-rejects applicants | NOT PRESENT in V5 changes |
| Hides applicants by score | NOT PRESENT — applicant list is unfiltered by default |
| Scores protected attributes | NOT PRESENT — onboarding checklist scores company fields (logo, description, location), not applicants |
| Exposes applicant data cross-company | NOT PRESENT — BOLA check confirmed above |
| Claims AI screening | NOT PRESENT in V5 changes |

The onboarding checklist's third step ("Review your first applicants") navigates to `/recruiter/jobs/list`, not to a filtered or scored applicant view. The step's `done` condition uses `needsReviewCount > 0` — a count, not a filtered subset. **PASS.**

---

## Recommended Fixes (Safe, Minimal)

Priority order:

### Fix 1 — P1-A: Replace `[innerHtml]` with text interpolation in signup

**File:** `src/app/auth/signup/signup.component.html` line 86

```html
<!-- Remove: -->
<span [innerHtml]="error"></span>

<!-- Add: -->
<span>{{ error }}</span>
```

**Risk of fix:** Zero — signup error messages are plain text, no HTML needed.

---

### Fix 2 — P1-B: Add self-ownership check to `deleteAccountById`

**File:** `get-hired-BE/controllers/userController.js` ~line 531

```js
const deleteAccountById = async (req, res) => {
  const { userId } = req.query;

  // Enforce caller may only archive their own account
  if (!userId || userId !== req.user.uid) {
    errorMessage.error = "Forbidden";
    return res.status(403).send(errorMessage);
  }

  try {
    const account = await deleteUserAccount(userId);
    ...
```

**Risk of fix:** Minimal — only breaks callers that were passing someone else's userId, which is the exploit.

---

### Fix 3 — P2-A: Remove production `console.log` from `job-create.component.ts`

Remove or guard the 8 `console.log` calls in `job-create.component.ts`. If needed for debugging, gate with `if (!environment.production) { console.log(...) }`.

---

### Fix 4 — P2-C: Sanitize BE error messages before sending to client

In `userController.js` and throughout BE controllers, replace raw `err` concatenation with generic client messages and server-side logging:

```js
// Before:
errorMessage.error = "Operation Not Successful. " + err;

// After:
console.error("[registerUser error]", err);
errorMessage.error = "Operation not successful. Please try again.";
```

---

## Items Verified as PASS (Not Issues)

- `?role=2` param is display-only; role is validated server-side with allowlist
- All mobile nav items link to guarded employer routes
- All onboarding checklist CTAs navigate to guarded employer routes
- Post-publish redirect is within the guarded `recruiter` panel
- BOLA check on `/job/applicants` is enforced in BE controller
- Pipeline overview is scoped by authenticated user's company
- No `bypassSecurityTrust*` usage in V5 changes
- Onboarding step labels and CTA text are hardcoded (not API-driven)
- Signup redirect goes to email verification, not a privileged area
- Admin role (1) cannot be self-assigned via signup
- The removed "Interviews" sidebar item did not remove any guard; the route is still protected
- `getDashboardPipelineOverview` uses `req.user.uid` for company scoping, not query params
- `getAllApplicantOfJob` enforces company ownership (previous P0 fix holds)

---

*Generated by Claude Code SECURE audit — V5 scope only.*
