# GETHIRED EMPLOYER P0/P1 FRONTEND HAPTICS EFFECTS LOG V3

**Command:** GETHIRED_EMPLOYER_P0_P1_ROUTE_CTA_FIX_SPRINT_WORLD_CLASS_TECHY_V3  
**Date:** 2026-06-24

---

## Haptic Effects Added

| Effect | Component | Trigger | UX Purpose | Accessibility Impact | Reduced-Motion |
|--------|-----------|---------|------------|---------------------|---------------|
| `HapticFeedbackService.selection()` | `CompanyNotSetupComponent` | User clicks "Complete company profile" | Lightest haptic — physical confirmation that a navigational intent was registered | Optional/additive — never required to understand the UI | N/A (vibration has no visual component) |
| `HapticFeedbackService.warning()` | `JobCreateComponent` | `publishJobPost()` fails validation | Tactile signal that something needs fixing before proceeding | Optional/additive | N/A |
| `HapticFeedbackService.jobPublished()` | `JobCreateComponent` | Job successfully published | Physical celebration of the primary employer first-value moment | Optional/additive | N/A |

---

## Button Press Effects (`gh-pressable`)

`gh-pressable` applies `transform: scale(0.985)` on `:active` with a 100ms transition, with `@include motion-safe` removing the transition under `prefers-reduced-motion: reduce`.

| Component | Element | Before | After |
|-----------|---------|--------|-------|
| `employer-sidebar.component.html` | Settings button | No press effect | `gh-pressable` added |
| `company-not-setup.component.html` | "Complete company profile" | No press effect | `gh-pressable` added |
| `job-list.component.html` | "Create Job" / "Post your first job" | No press effect | `gh-pressable` added to both |
| `job-applicants.component.html` | "Back" button | No press effect | `gh-pressable` added |
| `job-applicants.component.html` | "Back to jobs" (empty state) | N/A — new element | `gh-pressable` added |

---

## Entry / Reveal Animations Added

| Component | Element | Animation | Purpose | Reduced-Motion Fallback |
|-----------|---------|-----------|---------|------------------------|
| `job-list.component.html` + `.scss` | Empty state card | `gh-empty-reveal` — fade + 8px up over 280ms | Draws gentle attention to the empty state without being alarming | Animation entirely absent under `prefers-reduced-motion: reduce` (keyframe inside `@media (prefers-reduced-motion: no-preference)`) |
| `job-applicants.component.html` + `.scss` | Empty state card | `gh-empty-reveal` — same pattern | Same purpose | Same fallback |

---

## Focus-Visible Improvements

| Component | Element | Before | After |
|-----------|---------|--------|-------|
| `employer-sidebar.component.scss` | Sidebar nav items (`.gh-sidebar-item`) | No focus ring | `outline: 2px solid rgba(255, 112, 98, 0.8); outline-offset: 2px; border-radius: 6px;` on `:focus-visible` |
| `employer-sidebar.component.scss` | Sub-route items (`.sub-label`) | No focus ring | Same |
| `job-applicants.component.scss` | Breadcrumb "Jobs" link (`.gh-breadcrumb-link`) | No focus ring | `outline: 2px solid rgba(255, 112, 98, 0.8); outline-offset: 2px; border-radius: 2px;` on `:focus-visible` |

All focus rings use `:focus-visible` (not `:focus`) — rings only show under keyboard navigation, not mouse click.

---

## Reduced-Motion Implementation Summary

| Method | Used In | Purpose |
|--------|---------|---------|
| `@include motion-safe` mixin | Sidebar item transitions, breadcrumb link transitions | Removes CSS transitions under `prefers-reduced-motion: reduce` |
| `@media (prefers-reduced-motion: no-preference)` wrapping keyframe | Job list empty state, applicant empty state | Removes reveal animation entirely under reduced motion |
| Angular animation triggers | `@animate`, `@fadeInOut` (pre-existing) | Documented as not reducible in Angular 13 — CSS fallback via `_motion.scss` utilities |
