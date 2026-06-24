# GETHIRED EMPLOYER P0/P1 ACCESSIBILITY QA V3

**Command:** GETHIRED_EMPLOYER_P0_P1_ROUTE_CTA_FIX_SPRINT_WORLD_CLASS_TECHY_V3  
**Date:** 2026-06-24  
**Scope:** Only areas changed in this sprint's Phases 5-14

---

## Sidebar Navigation

| Check | Before | After |
|-------|--------|-------|
| Container semantic role | `div.sidebar-details` — no landmark role | `<nav>` with `role="navigation"` and `aria-label="Employer panel navigation"` |
| Item keyboard access | Div — not in tab order | `role="button"`, `tabindex="0"`, `keydown.enter`, `keydown.space` |
| Active item indicator | CSS class only (visual only) | `[attr.aria-current]="'page'"` on active item |
| Sub-route item keyboard access | Span — not in tab order | Same pattern: `role="button"`, `tabindex="0"`, `keydown.enter/space` |
| Decorative icons | No `aria-hidden` | `aria-hidden="true"` |
| Focus ring | Not visible under keyboard navigation | `.gh-sidebar-item:focus-visible { outline: 2px solid coral; outline-offset: 2px; }` |
| Reduced motion | Not applicable (CSS transitions) | `@include motion-safe` in SCSS removes transition under `prefers-reduced-motion: reduce` |

---

## Company Not Setup Dialog

| Check | Before | After |
|-------|--------|-------|
| Button label | "Setup Company" (generic) | "Complete company profile" (clear outcome-focused label) |
| aria-label | None | `aria-label="Complete company profile — go to company setup"` |
| Button semantics | `<button>` (correct) | Preserved; added `gh-pressable` class |
| Dialog heading | h5 with vague text | h5 with clear task description |
| Supporting text | None | Explanatory p element added |

---

## Job List

| Check | Before | After |
|-------|--------|-------|
| "Create Job" button aria | `<button>` (correct) | Preserved; added `aria-hidden` on icon; added `gh-pressable` |
| Empty state when no jobs | None (blank table) | `role="status"`, `aria-label="No jobs yet"`, descriptive text, keyboard-accessible CTA |
| Empty state CTA | N/A | `<button>` with `aria-label="Post your first job"`, `gh-pressable` |
| Empty state animation | N/A | `@media (prefers-reduced-motion: no-preference)` wraps keyframe |

---

## Applicant List

| Check | Before | After |
|-------|--------|-------|
| "Back" button | `<button>` (correct) | Preserved; added `gh-pressable` |
| Breadcrumb "Jobs" | Clickable `span` — not keyboard accessible | `role="button"`, `tabindex="0"`, `keydown.enter/space`, `aria-label`, `class="gh-breadcrumb-link"` |
| Breadcrumb icon | No `aria-hidden` | `aria-hidden="true"` |
| Breadcrumb focus ring | None | `.gh-breadcrumb-link:focus-visible { outline: 2px solid coral; }` |
| Empty state (no applicants) | None (blank table) | `role="status"`, `aria-label="No applicants yet"`, descriptive text, "Back to jobs" button |
| Empty state animation | N/A | `@media (prefers-reduced-motion: no-preference)` wraps keyframe |

---

## Employer Panel Loading Fallback

| Check | Before | After |
|-------|--------|-------|
| When `employee$` loading | Blank page | `<app-loading>` spinner |
| When `employee$` errors | Blank page | `role="alert"`, explanatory text, `/signin` link |
| Error fallback link | N/A | Plain `<a href="/signin">` (fully keyboard and screen reader accessible) |

---

## Auth / Session Feedback

| Check | Before | After |
|-------|--------|-------|
| Wrong-role snackbar | None | "You don't have access to that area. Redirecting you now." — `danger-snackbar` class (Material has `role="alert"` at the Material theme level) |
| Session expired message | "Your login authorization is already expired. Please login again to continue." | "Your session has expired. Please sign in again to continue." — clearer, active voice |

---

## Summary

All changed areas now meet the minimum accessibility requirements specified in Phase 12:
- Meaningful button/link labels: YES
- aria-label for icon-only/ambiguous buttons: YES  
- Textual validation/error messages: YES
- Focusable CTA targets: YES (all interactive elements are `<button>` or `role="button"` + `tabindex=0`)
- Visible retry/back actions: YES (empty states include Back CTAs)
- Helper text for disabled buttons: N/A (no disabled buttons changed in this sprint)
- No color-only distinction: YES (empty state copy + aria-live cover screen readers)
- Visible focus ring: YES (focus-visible rings added to sidebar items and breadcrumb link)
- Reduced-motion CSS: YES (motion-safe mixin + keyframe media guards)
- Screen-reader friendly status text: YES (role="status", aria-live on existing snapshot card, role="alert" on error fallback)
