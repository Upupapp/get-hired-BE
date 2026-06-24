# GETHIRED EMPLOYER P0/P1 ROUTE CTA FIX PLAN V3

**Command:** GETHIRED_EMPLOYER_P0_P1_ROUTE_CTA_FIX_SPRINT_WORLD_CLASS_TECHY_V3  
**Date:** 2026-06-24  
**Status:** Phase 1 complete — 10 issues identified (P0: 4 found, 3 from V4 already fixed, 1 new fixed; P1: 7 fixed in this sprint)

---

## Source of Truth

All findings cross-referenced with V4 audit docs. V4 already resolved 3 issues before this sprint ran. This plan documents what was left and what V3 sprint addressed.

---

## V4-RESOLVED BEFORE THIS SPRINT (Not re-fixed)

| ID | Severity | Issue | V4 Fix |
|----|----------|-------|--------|
| V4-P0-1 | P0 | `CompanyNotSetupComponent.redirectToSetup()` navigation commented out | Uncommented `router.navigate(['/recruiter/company/details'])` |
| V4-P0-2 | P0 | Publish-blocked snackbar used `success-snackbar` (wrong color) | Changed to `danger-snackbar` |
| V4-P1-1 | P1 | Sidebar "Employer Branding" label misleading | Changed to `'Company Profile'` |

---

## ISSUES FIXED IN THIS SPRINT

| ID | Source | Severity | Area | Current Behavior | Expected Behavior | Affected File | Risk | Fixed |
|----|--------|----------|------|-----------------|-------------------|---------------|------|-------|
| V3-P0-1 | Code review | P0 | Auth guard | Wrong-role user: `checkUserLogin()` calls `navigateToUserRole()` but still returns `true`, allowing the wrong-role user past the guard | Should return `false` after redirecting wrong-role user | `auth.guard.ts` | Low — changes return value path, no data affected | Yes |
| V3-P0-2 | Code review | P0 | Session expiry | `UnauthorizedInterceptor` only catches 403. A 401 from truly expired JWT silently shows API errors. Employer has no indication they need to sign in again. | Both 401 and 403 should clear auth and redirect to `/signin` | `unauthorize.interceptor.ts` | Low — adds one status code check | Yes |
| V3-P1-1 | Code review | P1 | Employer panel | `employer-panel.component.html` uses `*ngIf="employee$ | async as employee"` — if `employee$` API fails or delays, the whole section disappears with no fallback | Loading state while `employee$` is pending; error fallback with sign-in link if it fails | `employer-panel.component.html` | Low — template addition only | Yes |
| V3-P1-2 | Code review | P1 | Sidebar accessibility | All sidebar nav items are `div` elements with click handlers — not keyboard focusable or screen reader navigable. No `role="navigation"` on the container. No `aria-current`. | `role=button`, `tabindex=0`, `keydown.enter/space` handlers; `role="navigation"`; `aria-current="page"` on active item | `employer-sidebar.component.html` | Low — template structural improvement | Yes |
| V3-P1-3 | Code review | P1 | Sidebar accessibility | No focus-visible ring for keyboard navigation on sidebar items | `focus-visible` outline on sidebar items | `employer-sidebar.component.scss` | Low — CSS addition | Yes |
| V3-P1-4 | Code review | P1 | Company setup dialog | "Setup Company" button label is generic/imperative; no haptic feedback; no `gh-pressable`; descriptive text is vague ("A Company has to be set up...") | Clear CTA: "Complete company profile"; helpful explanation; haptic feedback; `gh-pressable` | `company-not-setup.component.html`, `company-not-setup.component.ts` | Low — copy + haptic only | Yes |
| V3-P1-5 | Code review | P1 | Job create publish | No haptic feedback on publish success or publish-blocked warning | `haptics.jobPublished()` on publish success; `haptics.warning()` on publish-blocked | `job-create.component.ts` | Low — additive only | Yes |
| V3-P1-6 | Code review | P1 | Job list empty state | Jobs list shows a blank table when employer has no jobs. No "Post your first job" CTA visible. | Empty state with explanation and "Post your first job" CTA | `job-list.component.html`, `job-list.component.scss` | Low — template addition inside `*ngIf` | Yes |
| V3-P1-7 | Code review | P1 | Job list create button | "Create Job" button has no `gh-pressable` class (no press micro-animation) | `gh-pressable` class added | `job-list.component.html` | Low — CSS class addition | Yes |
| V3-P1-8 | Code review | P1 | Applicant list empty state | Applicant list shows blank table with no CTAs when a job has zero applicants | Empty state with explanation + "Back to jobs" CTA; accessible animated reveal | `job-applicants.component.html`, `job-applicants.component.scss` | Low — template addition inside existing `*ngIf` | Yes |
| V3-P1-9 | Code review | P1 | Applicant breadcrumb | "Jobs" breadcrumb link is a clickable `span` — not keyboard accessible | `role=button`, `tabindex=0`, `keydown.enter/space` | `job-applicants.component.html` | Low — template addition | Yes |
| V3-P1-10 | Code review | P1 | Back button | Applicant list "Back" button has no `gh-pressable` | `gh-pressable` class added | `job-applicants.component.html` | Low — CSS class addition | Yes |

---

## DEFERRED (Not safely fixable in this sprint)

| ID | Severity | Area | Reason | Recommended Next Command |
|----|----------|------|--------|--------------------------|
| V3-D1 | P1 | Global messages route | New route + new component + backend endpoint required — not a safe code-only fix | B01 messages feature sprint |
| V3-D2 | P1 | Interview page (stub) | Under-construction component replacement — new feature | B03 interview feature sprint |
| V3-D3 | P1 | Mobile sidebar navigation | Responsive layout refactor — requires full sidebar redesign | Responsive design sprint |
| V3-D4 | P1 | `inviteApplicant()` TODO | Feature implementation required (unknown endpoint) | Pipeline advancement sprint |
| V3-D5 | P1 | Pipeline drill-down | `goToJobsList()` should navigate to stage-filtered applicant view — requires query param design + backend support | B02 pipeline sprint |
| V3-D6 | P1 | `@animate` reduced-motion in Angular animations | Angular 13 does not support `@media` inside trigger() — documented in main-animations.ts | Post Angular 16 upgrade |
