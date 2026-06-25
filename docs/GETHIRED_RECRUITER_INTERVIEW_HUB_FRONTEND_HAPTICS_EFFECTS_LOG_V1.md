# GetHired Recruiter Interview Hub — Frontend Haptics & Motion Effects Log V1

**Date:** 2026-06-25

---

## Motion Effects Implemented

### 1. Page Reveal (Header Fadein)
```scss
.ih-header {
  animation: ih-fadein $motion-duration-card $motion-ease-decelerate both;
  @include ambient-motion-safe;
}
@keyframes ih-fadein {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
Token: `$motion-duration-card = 220ms`, `$motion-ease-decelerate = cubic-bezier(0.0, 0.0, 0.2, 1)`
Suppressed: under `prefers-reduced-motion: reduce`

### 2. Card Hover Lift
```scss
.ih-card:hover {
  transform: translateY($gh-lift);  // $gh-lift = -2px
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}
```
Token: `$gh-lift = -2px` from `_motion.scss`
Suppressed: `@include motion-safe`

### 3. Card Tap Compression
```scss
.ih-card:active {
  transform: scale(0.99);
}
```
Suppressed: `@include motion-safe`

### 4. Filter Chip Transition
```scss
.ih-filter-chip {
  transition: background $motion-duration-micro $motion-ease-standard,
              color $motion-duration-micro $motion-ease-standard,
              border-color $motion-duration-micro $motion-ease-standard;
}
```
Token: `$motion-duration-micro = 160ms`
Suppressed: `@include motion-safe`

### 5. Skeleton Shimmer
```scss
.ih-skeleton-line, .ih-skeleton-chip {
  animation: ih-shimmer 1.4s ease-in-out infinite;
  @include ambient-motion-safe;
}
```
Ambient — fully suppressed (not slowed) under reduced motion.

### 6. Button Press
```scss
.ih-btn:active, .ih-action:active {
  transform: scale(0.96);
}
```
Suppressed: `@include motion-safe`

### 7. Error Retry Press (inherits .ih-btn:active)
```scss
/* via ih-btn--primary:active — scale(0.96) */
```

---

## Haptics

Web Haptics API (`navigator.vibrate`) is not available in Angular 13 employer panel (employer is desktop-first). No haptic calls added. Mobile haptics (if desired) are a backlog item.

---

## Reduced Motion Summary

Every animation/transition in this component is suppressed under `prefers-reduced-motion: reduce`:
- Micro transitions: `@include motion-safe` → `transition: none !important`
- Ambient (shimmer, fadein): `@include ambient-motion-safe` → `animation: none !important`

The layout is fully usable with zero motion.
