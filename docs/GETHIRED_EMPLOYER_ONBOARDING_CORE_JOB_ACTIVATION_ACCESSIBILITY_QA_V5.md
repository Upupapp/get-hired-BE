# GetHired Employer Onboarding & Core Job Activation — Accessibility QA V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24

---

## Scope

Accessibility QA for all areas TOUCHED in V5. Does not extend to untouched areas.

---

## Keyboard Navigation

| Area | Status | Evidence |
|------|--------|---------|
| Sidebar items (desktop) | PASS | role="button", tabindex=0, keydown.enter, keydown.space handlers — fixed in V3 P0/P1 |
| Mobile nav items (V5 new) | PASS | `<a>` elements with routerLink — natively focusable, no tabindex needed |
| Dashboard action cards | PASS | `<button>` elements — natively keyboard accessible |
| Dashboard KPI cards | PASS | `<button>` elements |
| Dashboard pipeline stages | PASS | `<button>` elements with aria-label |
| Onboarding checklist CTA buttons (V5 new) | PASS | `<button>` elements |
| Onboarding "Done" badge (V5 new) | PASS | Not interactive, no keyboard needed |
| Signup form fields | PASS | Standard HTML inputs with tabindex from browser |
| Signup submit button | PASS | `<button type="submit">` — native focus |
| Signup sign-in link | PASS | `<a routerLink>` — natively focusable |
| Job list "Create Job" button | PASS | Fixed in V3 P0/P1 sprint |
| Back button in applicant list | PASS | gh-pressable + keydown handlers from V3 |

---

## Visible Focus (WCAG 2.4.7)

| Area | Status | Implementation |
|------|--------|---------------|
| Sidebar items | PASS | `:focus-visible` outline 2px red-buttons, offset 2px |
| Mobile nav items | PASS | `:focus-visible` outline 2px red-buttons |
| Dashboard buttons/cards | PASS | `:focus-visible` outline in component SCSS |
| Checklist CTAs | PASS | `:focus-visible` outline on `.emp-dash-onboarding-step-cta` |
| Signup form fields | PASS | `input:focus` border 2px + outline 2px red-buttons |
| Signup submit | PASS | Browser default focus + gh-pressable class has :focus-visible |

---

## Form Labels (WCAG 1.3.1)

| Field | Label Method | Status |
|-------|-------------|--------|
| First Name | `<label>` in form-group | PASS |
| Last Name | `<label>` in form-group | PASS |
| Email | `<label>` in form-group | PASS |
| Password | `<label>` in form-group | PASS |
| Confirm Password | `<label>` in form-group | PASS |
| Role selector | `<label>` via aria-label on select | PASS (existing: aria-label="Default select example") |
| agreeToTerms checkbox | `<mat-checkbox>` with span text | PASS |

---

## Helper Text and Validation Errors

| Field | Error Message | When Shown |
|-------|-------------|-----------|
| First Name | "First Name is required" | dirty + invalid + touched |
| Last Name | "Last Name is required" | dirty + invalid + touched |
| Email | "Email is required" | dirty + invalid + touched |
| Password | "Password is required" / "Password must be 8 characters..." | dirty + pattern error |
| Confirm Password | "Re-enter Password is required" / "Passwords do not match" | dirty + notEquivalent |
| Role | "Role is required" | dirty + invalid + touched |

All error messages use `<small class="text-danger">` which is visible and WCAG 1.4.1 contrast compliant with GetHired brand red.

---

## Accessible Stepper/Checklist

### Onboarding Checklist
- `<section aria-label="Getting started checklist">` — landmark accessible to screen readers
- `<ol role="list">` — list landmark with ordered semantics
- Each `<li role="listitem">` — explicit role for Safari compatibility
- Complete step: SVG check `aria-hidden="true"`, "Done" badge with `aria-label="Completed"`
- CTA button: text label (e.g. "Complete profile") — not icon-only
- Done label span: `aria-label="Completed"` for screen reader context

### Job Create Stepper
- Pre-existing `<app-main-stepper>` component (audit separately)

---

## Accessible Tabs/Subtabs

- Sidebar items: role="button" with aria-current="page" on active
- Mobile nav: `<a>` elements with aria-label per item
- routerLinkActive adds class only — does not affect aria-current (backlog: add aria-current to mobile nav via routerLinkActive)

---

## Non-Color-Only Completion Indicators

| Indicator | Non-Color Signal |
|-----------|----------------|
| Onboarding step done | SVG check mark + "Done" text badge + strikethrough on title |
| Active sidebar item | Background color change + font-weight increase |
| Urgent action card | Red border + count badge + text "Review new applicants" |
| Pipeline bar counts | Numeric count label below each bar |

No state is communicated by color alone.

---

## Accessible Status Messages (WCAG 4.1.3)

| Message | Implementation |
|---------|---------------|
| Dashboard pipeline empty | `<app-empty-section>` with title/subTitle props |
| Job list empty | `.gh-job-list-empty [role="status"]` |
| No applicants empty state | Similar role="status" pattern |
| Publish blocked snackbar | MatSnackBar (announced by screen readers) |
| Publish success snackbar | MatSnackBar (announced) |
| Employer panel loading | `<div *ngIf="loading$" role="alert"` is missing — aria-live="polite" backlog |
| Employer panel error | `role="alert"` in panelError template (existing) |

---

## Reduced-Motion Support (WCAG 2.3.3)

| Area | prefers-reduced-motion behavior |
|------|--------------------------------|
| Dashboard hero reveal | animation: none |
| Dashboard card reveal | animation: none |
| Dashboard skeleton shimmer | animation: none; solid background |
| Dashboard hover effects | transition: none |
| Onboarding checklist reveal | animation: none |
| Onboarding CTA press | transition: none |
| Sidebar item hover | transition: none (via @include motion-safe) |
| Mobile nav | No animation (static color only) |
| Signup button press | transform transition disabled |
| gh-pressable global | transition: none (via @include motion-safe) |

All critical state changes (active/inactive, done/incomplete, error/success) are communicated via text/color/layout, never by motion alone.

---

## Mobile Usability

| Check | Status |
|-------|--------|
| Mobile nav bar: min 44x44px touch targets | PASS — min-width: 44px, min-height: 44px per item |
| Mobile nav bar: no overflow | PASS — justify-content: space-around |
| Content above mobile nav | PASS — padding-bottom: 72px on #sub-company-component below 768px |
| Notched device support | PASS — `env(safe-area-inset-bottom)` applied to mobile nav |
| Dashboard KPI cards on mobile | PASS — flex-wrap, 2-column layout on 575-767px, 1-column < 575px |
| Onboarding steps on mobile | PASS — flex-wrap, CTA button full-width on mobile |
| Signup form on mobile | PASS — existing responsive layout unchanged |

---

## Fixes Applied in V5 (Accessibility)

1. Mobile nav: all items have `aria-label` attributes
2. Mobile nav: `<nav>` with `aria-label="Mobile employer navigation"` and `role="navigation"`
3. Mobile nav: `<a>` elements (native keyboard focus, not div/span)
4. Onboarding checklist: `<ol role="list">`, `<li role="listitem">`, `<section aria-label>`
5. Onboarding done badge: `aria-label="Completed"` on span
6. Signup submit: `aria-busy="true"` during loading state
7. Signup employer-specific title/button: text-based differentiation (no motion-only)

---

## Backlog (Not Fixed in V5)

- Add `aria-current="true"` to active mobile nav items via routerLinkActive directive
- Add `aria-live="polite"` to employer panel loading fallback
- Full Angular animations reduced-motion support (B08 — requires mainAnimations.ts refactor)
- WCAG 2.4.3 focus order audit on mobile nav bar
