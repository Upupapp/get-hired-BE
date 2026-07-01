# GETHIRED QA ACTIONS — V6
**Date:** 2026-07-01 | **Scope:** Test coverage, QA processes, a11y, regression, and release gates

---

## QA Posture Summary V6

| Area | Status |
|---|---|
| Auth flows (Google, LinkedIn) | PASS — manually verified |
| Cert/license feature | PASS — manually verified |
| Company setup modal | PASS — manually verified |
| Employer sign-out | PASS — manually verified |
| Bulk import (contacts/candidates/users) | PASS — toast logic fixed and QA'd |
| PayMongo webhook code | PASS — code verified; env var open |
| Unit test coverage | LOW — no .spec.ts for critical import dialogs |
| E2E test coverage | NONE — no automated E2E tests exist |
| A11y (screen reader / ARIA) | PARTIAL — snackbar assertive mode open |
| Mobile QA | PASS on public pages; authenticated table OPEN |
| WCAG contrast | PASS — warning-snackbar fixed (5ea4466) |

---

## Open QA Actions

### QA-ACT-001 (= P3-TOAST-TESTS): Unit Tests for Toast Outcome Logic
**Action ID:** P3-TOAST-TESTS
**Priority:** P3
**Category:** Test Coverage
**Problem:** `import-add-contact.component.ts`, `import-add-candidate.component.ts`, `import-add-user.component.ts` have no `.spec.ts` files. Toast outcome logic (success vs duplicate vs partial vs all-failed) is critical user-facing behavior with zero automated coverage.
**Why it matters:** Regressions in toast logic are invisible until manual QA or user reports. These bugs were fixed twice already (BUG-01/02/03 in NOTIFY-P2).
**Scope:** Write Jest/Jasmine unit tests covering TC-05 through TC-08 from TEST V5 report:
- TC-05: All contacts succeed → success toast with count
- TC-06: All contacts fail (duplicate) → duplicate warning toast
- TC-07: Partial success → partial success toast with summary
- TC-08: All contacts fail (unknown error) → error toast
Apply same test matrix to candidate and user import dialogs.
**Non-scope:** E2E tests (separate action); BE integration tests.
**Affected repo:** FE
**Affected files:** New `.spec.ts` for each import dialog component
**Priority:** P3
**MoSCoW:** Should
**Estimated effort:** M (~4-6 hours, 3 spec files)
**Suggested owner:** FE developer
**Acceptance criteria:** `ng test` passes with all 12 new toast test cases (4 per dialog).
**Status:** OPEN

---

### QA-ACT-002 (= ACT-018): Automated Test Suite for Critical Paths
**Action ID:** ACT-018
**Priority:** P2
**Category:** Test Infrastructure
**Problem:** No automated tests exist for the most critical system paths: Google auth flow, LinkedIn auth flow, PayMongo webhook, or BOLA regression. A single refactor could break auth and not be caught until production.
**Why it matters:** Auth bugs = all users locked out. Payment bugs = revenue blocked. BOLA bugs = data breach.
**Scope:**
- `googleAuthController.js`: 10 test cases (new user, existing user, invalid token, banned user, admin blocked, correct UID, 409 on email conflict, requestUri field, role routing, error code mapping)
- `googleAuthService.ts` (FE): 7 test cases (token fetch, role redirect, error handling, 409 display, network error)
- PayMongo webhook handler: 5 test cases (valid signature, invalid signature, missing header, subscription.created, subscription.cancelled)
- BOLA regression: test suite verifying company_id isolation on all CRUD endpoints
**Non-scope:** Full E2E; UI visual regression.
**Affected repo:** BE + FE
**Affected files:** New test files alongside controllers and services
**Priority:** P2
**MoSCoW:** Should
**Estimated effort:** ~3 days (BE: 2 days; FE: 1 day)
**Acceptance criteria:** All 22+ test cases pass in CI. BOLA regression suite is runnable as `npm run test:bola`.
**Status:** OPEN

---

### QA-ACT-003 (= P3-SNACKBAR-ASSERTIVE): danger-snackbar aria-live="assertive"
**Action ID:** P3-SNACKBAR-ASSERTIVE
**Priority:** P3
**Category:** Accessibility / A11y
**Problem:** Angular Material `MatSnackBar` uses `aria-live="polite"` by default. Error outcomes (danger-snackbar) should interrupt screen readers immediately (`aria-live="assertive"`) to meet WCAG 2.1 SC 4.1.3 (Status Messages).
**Scope:** Create a custom `ToastComponent` with `role="alert"` (implicit assertive). Use `MatSnackBar.openFromComponent(ToastComponent, config)` for error states. Polite behavior can remain for success/info.
**Non-scope:** Redesigning toast visuals; changing toast duration.
**Affected repo:** FE
**Affected files:** `src/styles.scss` (class), new `toast/toast.component.ts/html`, all `snackBar.open(...)` call sites using `danger-snackbar`
**Priority:** P3
**MoSCoW:** Should
**Estimated effort:** M (~3-4 hours)
**Acceptance criteria:** NVDA/VoiceOver announces error snackbar content immediately without waiting for current speech to finish.
**Status:** OPEN

---

### QA-ACT-004 (= P3-DIALOG-ALL-FAILED-UX): Keep Invite Dialog Open on All-Failed
**Action ID:** P3-DIALOG-ALL-FAILED-UX
**Priority:** P3
**Category:** UX / Error State
**Problem:** When all company user invites fail, the invite dialog closes and shows an error snackbar. The employer must reopen the dialog to correct invalid emails — creating unnecessary friction.
**Scope:** In `company-users.component.ts`, when the invite result shows `allFailed === true`, keep the dialog open and render an inline error message listing the failed emails instead of closing.
**Non-scope:** Partial-success dialog behavior (keep current approach).
**Affected repo:** FE
**Affected files:** `src/app/company/company-users/company-users.component.ts`, dialog template
**Risk level:** Low
**Priority:** P3
**MoSCoW:** Could
**Estimated effort:** S (~2 hours)
**Acceptance criteria:** All-failed invite scenario keeps dialog open. Inline error shows "The following emails could not be invited: [list]." Dialog can be closed manually.
**Status:** OPEN

---

### QA-ACT-005 (= P3-FAILED-EMAIL-INDICATOR): Per-Item Failure Indicator in Invite List
**Action ID:** P3-FAILED-EMAIL-INDICATOR
**Priority:** P3
**Category:** UX / Error State
**Problem:** In partial-success invite results, all items render identically. There is no visual indicator (red icon, strikethrough, label) on items with `status: 'failed'`.
**Scope:** In `import-add-user.component.ts` and its template, check each item's `status` field. Render a red/warning icon + "Failed" label on `status: 'failed'` items.
**Affected repo:** FE
**Affected files:** `src/app/company/import-add-user/import-add-user.component.html/ts`
**Risk level:** Very low
**Priority:** P3
**MoSCoW:** Could
**Estimated effort:** S (~1-2 hours)
**Acceptance criteria:** Partial-success invite result shows red indicator on failed emails and green/neutral indicator on successful ones.
**Status:** OPEN

---

### QA-ACT-006: LinkedIn Auth Error States — Manual QA Checklist
**Action ID:** GH-ACT-089 (QA aspect)
**Priority:** P2
**Category:** Auth / Error State QA
**Problem:** `/linkedin/complete?error=server_error` and `/linkedin/complete?error=access_denied` error state pages exist but have not been fully QA'd for message clarity, visual polish, and recovery CTA.
**Scope:** Manual QA of all LinkedIn OAuth error states. For each error code, verify: error message displayed correctly, "Try Again" CTA present, CTA routes to correct sign-in page, no raw error codes exposed to user.
**Error codes to test:**
- `error=access_denied` — user cancelled LinkedIn consent
- `error=server_error` — LinkedIn service error
- `error=invalid_state` — CSRF state mismatch
- `error=unknown` — catch-all
**Affected repo:** FE
**Affected files:** LinkedIn callback error handler component
**Priority:** P2
**MoSCoW:** Should
**Estimated effort:** ~2 hours (QA) + ~2-3 hours (polish fixes)
**Acceptance criteria:** All 4 error codes show friendly message + recovery CTA. No raw error codes shown to user. Design matches GetHired brand system.
**Status:** OPEN

---

### QA-ACT-007: Google One Tap Post-Launch QA Gate
**Action ID:** GH-ACT-092 (QA gate)
**Priority:** P2
**Category:** Auth / Feature Gate
**Problem:** Google One Tap (FedCM) is planned as a P2 feature but should only be activated after the existing Google OAuth flow has been fully QA'd in production.
**Gate criteria (all must pass before One Tap enabled):**
1. Google sign-in tested on Chrome, Firefox, Safari on production
2. Google sign-in tested on iOS Safari + Android Chrome on production
3. 409 (existing email) flow tested: correct error message, no crash
4. Role selection screen tested: applicant role, employer role both work
5. New user profile creation works after Google auth
**Scope:** QA checklist to be run after Google OAuth is confirmed stable (1-2 weeks post-launch).
**Status:** OPEN — blocked on post-launch observation period

---

## QA Checklist — Release Gate for V6

### Auth
- [ ] Google sign-in: new applicant → success + profile creation
- [ ] Google sign-in: new employer → success + company setup
- [ ] Google sign-in: existing email → 409 error message shown
- [ ] LinkedIn sign-in: new user → success + role selection
- [ ] LinkedIn sign-in: error states → friendly messages shown
- [ ] Email/password sign-in: unchanged
- [ ] Admin sign-in: email/password only (Google/LinkedIn blocked)
- [ ] Employer sign-out: redirects to login
- [ ] Applicant sign-out: redirects to login

### Employer Features
- [ ] Company setup modal: shows once, dismissed correctly
- [ ] Job posting: create, publish, edit, delete
- [ ] Cert/license requirements: add, update, display on job card
- [ ] CSV import (contacts, candidates, users): all 3 import flows, all toast states
- [ ] Dashboard: action center, pipeline, needs-review all show real data

### Applicant Features
- [ ] Apply to job: new application
- [ ] Profile: update all fields
- [ ] Public job search: filter + pagination

### Public Pages
- [ ] Home: loads, CTAs visible
- [ ] /jobs: job listing loads
- [ ] /jobs/details/:id: job detail loads with JSON-LD in source
- [ ] sitemap.xml: returns valid XML with job URLs
- [ ] robots.txt: correct disallow list

### Security Smoke
- [ ] Test PayMongo webhook: confirm 200 response with correct signature
- [ ] Auth: confirm 401 on protected routes without token
- [ ] BOLA: confirm cannot access another employer's jobs

---

## QA Items Closed (History)

| Item | Closed | Detail |
|---|---|---|
| NOTIFY-P2-BUG-01 | CLOSED | Commit 1863842 |
| NOTIFY-P2-BUG-02 | CLOSED | Commits 2ff6358/1863842 |
| NOTIFY-P2-BUG-03 | CLOSED | Commits 2ff6358/1863842 |
| Import dialog mobile config | CLOSED | Commit 5ea4466 |
| WCAG warning-snackbar contrast | CLOSED | Commit 5ea4466 |
| success-snackbar color | CLOSED | Commit 5ea4466 |
| LinkedIn OIDC QA | CLOSED | Session 2026-07-01 |
| Company setup modal QA | CLOSED | Session 2026-07-01 |
| Employer sign-out QA | CLOSED | Session 2026-07-01 |
| Cert/license feature QA | CLOSED | Session 2026-07-01 |
