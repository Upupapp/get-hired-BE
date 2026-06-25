# GETHIRED_RECRUITER_MOBILE_SIDEBAR_FIX_LOG_V1

## Phase 17 — Fix Log
Date: 2026-06-25

---

## Issues Found and Fixed During Implementation

### FIX-01: Content overlap with sticky top bar
**Problem:** Adding a 56px sticky top bar would cause `<section id="body-main-container">` content to slide behind it on mobile.
**Fix:** Added `@media (max-width: 767px) { #body-main-container { padding-top: 56px; } }` to SCSS.

### FIX-02: Drawer visible on desktop
**Problem:** Drawer is `position: fixed` — without explicit hiding, it would be off-screen on desktop but still in DOM and focusable.
**Fix:** Added `@media (min-width: 768px) { .gh-mobile-drawer { display: none !important; } }` to completely remove it from rendering and accessibility tree on desktop.

### FIX-03: ngOnDestroy not implemented in original component
**Problem:** Original `EmployerPanelComponent` did not implement `OnDestroy`, so the router subscription from B02 would leak if component is destroyed.
**Fix:** Added `OnDestroy` to `implements`, added `ngOnDestroy()` that calls `this.routerSub.unsubscribe()`.

### FIX-04: Drawer could receive focus on desktop if missed by CSS
**Problem:** `display: none` on ≥768px ensures drawer is fully hidden, but the `@ViewChild` refs would still resolve. Focus management code guards with optional chaining (`?.nativeElement`).
**Fix:** Used `?. optional chaining` on all `nativeElement` focus calls to prevent null reference errors.

### FIX-05: Double-close side effect
**Problem:** `closeMobileNav()` would always set `mobileNavOpen = false` and schedule a focus return even if already closed (e.g., NavigationEnd fires on every route change including initial load).
**Fix:** Added early return guard: `if (!this.mobileNavOpen) return;` at top of `closeMobileNav()`.

---

## Pre-existing Issues (Not Introduced by B02)

- autoprefixer warning on add-contact-group.component.scss (line 344-345: `start` value)
- InternalEmployerGuard commented out on dashboard/jobs routes

---

## Status: ALL B02 ISSUES FIXED
