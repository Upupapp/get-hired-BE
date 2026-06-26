# GETHIRED BRAND — MICROINTERACTIONS LIBRARY (RECENT 3)
**Date:** 2026-06-26

---

## 1. Microinteraction Catalog

All interactions use tokens from `src/assets/styles/_motion.scss`.

### 1.1 Button Press (Haptic Scale)

**Token:** `$gh-scale-press: 0.985`
**Applies to:** `.gh-pressable`, `.btn-apply-now:active`, global `.mat-raised-button:active`, `.mat-flat-button:active`, `.btn:active`, `.gh-card:active` (touch devices only)
**Duration:** 100ms (`.gh-pressable`), $motion-duration-micro (`.btn-apply-now`)
**Easing:** $motion-ease-standard
**Reduced-motion:** `@include motion-safe` (gh-pressable), explicit `transform: none` in reduce block (btn-apply-now)
**Status: IMPLEMENTED**

### 1.2 Card Hover Lift

**Token:** `$gh-lift: -2px`
**Applies to:** `.gh-card`, `.job-card`, `.mat-card` (hover:hover devices only), `.portal-usp-card`, `.gh-job-card-hover`
**Duration:** $motion-duration-micro (160ms)
**Easing:** $motion-ease-standard
**Reduced-motion:** guarded in `@media (prefers-reduced-motion: no-preference)` or `@include motion-safe`
**Status: IMPLEMENTED**

### 1.3 Content Reveal

**Keyframes:** `gh-job-detail-reveal` (opacity 0→1, translateY 12px→0)
**Duration:** $motion-duration-card (220ms) for main content, 180ms for breadcrumb nav
**Easing:** $motion-ease-decelerate (cubic-bezier 0.0, 0.0, 0.2, 1) — content "arrives"
**Reduced-motion:** `animation: none` in reduce block
**Status: IMPLEMENTED**

### 1.4 Error / Session Banner Reveal

**Keyframes:** `gh-error-banner-reveal` (opacity 0→1, translateY -8px→0 — slides down from above)
**Duration:** $motion-duration-micro (160ms)
**Easing:** $motion-ease-standard
**Applies to:** `.job-detail-error-state`, `.job-detail-session-banner`
**Reduced-motion:** listed in reduce block
**Status: IMPLEMENTED**

### 1.5 Applied Chip Reveal

**Keyframes:** `gh-applied-chip-reveal` (opacity 0→1, scale 0.9→1)
**Duration:** $motion-duration-micro (160ms)
**Easing:** $motion-ease-standard
**Applies to:** `.bg-applied`
**Reduced-motion:** listed in reduce block
**Status: IMPLEMENTED**

### 1.6 Skeleton Shimmer (Loading)

**Keyframes:** `gh-skeleton-shimmer` (background-position sweep)
**Duration:** 1.4s infinite linear
**Applies to:** `.gh-skeleton` (global), `.gh-job-skeleton` (job detail)
**Reduced-motion:** `@include ambient-motion-safe` + static `#ececec` background fallback
**Status: IMPLEMENTED**

### 1.7 Dialog / Bottom-Sheet Entry

**Keyframes:** `gh-sheet-reveal` (opacity 0→1, translateY 16px→0)
**Duration:** $motion-duration-card (220ms)
**Easing:** $motion-ease-decelerate
**Applies to:** `.mat-dialog-container`, `.dialog-responsive` on ≤767px
**Reduced-motion:** `animation: none !important` in reduce block
**Status: IMPLEMENTED**

### 1.8 Success Pulse (available, not yet triggered in job detail)

**Keyframes:** `gh-success-pulse-kf` (scale 1→1.04→1)
**Duration:** 400ms
**Easing:** $motion-ease-decelerate
**Class:** `.gh-success-pulse`
**Reduced-motion:** `@include motion-safe`
**Status: DEFINED, NOT YET APPLIED AT JOB DETAIL**

---

## 2. Legacy Unguarded Interactions (Pre-existing, Deferred)

| Location | Interaction | Issue |
|---|---|---|
| `#interview-list:hover` in job-posts-details.scss | `transition: all 0.3s ease` | No reduced-motion guard; hardcoded 0.3s, not a token |
| `#interview-list .logo-thumbnail-2` | `transition: all 0.3s ease` | Same |
| `#interview-list img` | `transition: all 0.8s` | Same — very long, no guard |
| Auth page `@animate` directives | BrowserAnimationsModule | `mainAnimations` timing not audited here |
