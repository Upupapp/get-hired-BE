# GETHIRED_RECRUITER_MOBILE_SIDEBAR_CURRENT_STATE_AUDIT_V1

## Phase 1 — Discovery Audit
Date: 2026-06-25
Mission: B02 — Mobile Hamburger Drawer

---

## Files Inspected

1. `src/app/employer-panel/employer-panel.component.ts`
2. `src/app/employer-panel/employer-panel.component.html`
3. `src/app/employer-panel/employer-panel.component.scss`
4. `src/app/employer-panel/employer-panel.module.ts`
5. `src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts`
6. `src/app/employer-panel/employer-sidebar/employer-sidebar.component.html`
7. `src/app/employer-panel/employer-sidebar/employer-sidebar.component.scss`
8. `src/app/shared/guard/auth.guard.ts`
9. `src/assets/styles/colors.scss`
10. `src/assets/styles/_motion.scss`
11. `src/styles.scss`

---

## Current Mobile Navigation State

### Bottom Nav (already shipped B01/B02-V5)
- `<nav class="gh-mobile-nav d-flex d-md-none">` — 5 items fixed
- Items: Dashboard, Jobs, Candidates, Messages, Company
- Billing bar: `.gh-billing-bar d-flex d-md-none` above bottom nav at `bottom: calc(56px + env(safe-area-inset-bottom, 0px))`
- Content push: `@media (max-width: 767px) { #sub-company-component { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) } }`

### Desktop Sidebar
- Wrapped in `<div class="d-none d-md-block" id="sidebar-container">` — hidden on mobile
- `<app-employer-sidebar [user]="employee">` receives employee from resolved employee$
- Sidebar uses `sidebarItems` array in `ngOnChanges` with 6 items: Dashboard, Jobs, Candidates, Messages, Company, Subscription

### Gaps / What B02 Adds
- No hamburger/top bar on mobile (no header-level nav button)
- No modal drawer overlay on mobile
- Bottom nav has 5 items — missing: Post Job, Subscription (accessible via billing bar link)
- No focus-trapping drawer
- No Escape-to-close behavior
- No `aria-expanded` on a toggle button

---

## Framework / Stack Findings

- **Angular 13 NgModule** architecture
- **No Angular Material sidenav/mat-drawer** in employer-panel — MatDialogModule is imported, not mat-sidenav
- **No BreakpointObserver** usage in employer-panel — will use CSS media queries (Bootstrap `d-*` classes consistent with existing pattern)
- **Router**: `Router`, `ActivatedRoute` injected in employer-panel.component.ts
- **MatDialog** already injected — no new imports needed for dialog
- **Animations**: `mainAnimations` imported from `@main/shared/animations/main-animations`
- **Motion tokens** in `_motion.scss`: `$motion-duration-drawer: 260ms`, `$motion-ease-decelerate`, `$motion-ease-standard`, `@mixin motion-safe`

---

## Brand / Color Variables Available

```scss
$color-global-sidebar-employer-user-menu: #444152;   // drawer bg
$color-global-sidebar-employer-route-active: #67627E; // active item bg
$color-global-red-buttons: #FF7062;                   // accent / active indicator
$color-global-sidebar-applicant-gray: #F6F7FB;        // main content bg
$color-global-gray-cancel: #7A637F;                   // user card bg
```

---

## Auth Guard Summary

- `AuthGuard` checks `localStorage.getItem('state') === 'true'` then verifies role
- Role 2 = employer/recruiter
- Wrong role redirected to own panel
- Guest redirected to `/signin`
- Mobile nav is router navigation — guards run on `router.navigate()` calls — no bypass possible

---

## Employer Panel Component State

- `employee$` async pipe — loaded on init
- `isUserLoggedIn` from `coreService.isLoggedIn()`
- `user` from `localStorage.getItem('user')`
- No `mobileNavOpen` state currently
- No `NavigationEnd` subscription for auto-close
- No `ElementRef` for focus return

---

## Summary of Changes Required for B02

1. Add `mobileNavOpen = false` + open/close methods to `employer-panel.component.ts`
2. Add RouterEvents subscription to close drawer on navigation
3. Add `@HostListener` for Escape key
4. Add `@ViewChild` for menu button focus return
5. Add mobile top bar HTML (d-flex d-md-none) to `employer-panel.component.html`
6. Add modal drawer HTML with nav items (routes from sidebar items)
7. Add scrim overlay HTML
8. Add SCSS for topbar, drawer, scrim, nav items with motion tokens
