# GETHIRED_RECRUITER_MOBILE_DRAWER_UI_LOG_V1

## Phase 4b/4e — Mobile Drawer UI Implementation Log
Date: 2026-06-25

---

## Drawer Structure

```
gh-mobile-drawer (nav, id=gh-mobile-drawer, role=navigation, aria-label="Employer navigation")
  ├── gh-drawer-header
  │     ├── logo img
  │     └── close button (X icon, aria-label="Close navigation menu")
  ├── gh-drawer-nav (ul, role=list)
  │     ├── li > a#firstDrawerLink  → /recruiter/dashboard
  │     ├── li > a                  → /recruiter/jobs
  │     ├── li > a                  → /recruiter/contacts
  │     ├── li > a                  → /recruiter/messages
  │     ├── li > a                  → /recruiter/company/details
  │     └── li > a                  → /recruiter/subscription
  └── gh-drawer-footer
        └── settings link           → /recruiter/company/settings
```

---

## Drawer CSS

- `position: fixed; top: 0; left: 0; bottom: 0; width: 280px; z-index: 1001`
- `transform: translateX(-100%)` → `translateX(0)` via `--open` class
- `transition: transform 260ms cubic-bezier(0.0, 0.0, 0.2, 1)` (decelerate ease)
- `box-shadow: 4px 0 24px rgba(0,0,0,0.28)` — depth separation from content
- `display: none !important` on `min-width: 768px` — never visible on desktop
- `@include motion-safe` — transition removed under prefers-reduced-motion

---

## Scrim CSS

- `position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000`
- `background: rgba(0,0,0,0.48)`
- `opacity: 0; pointer-events: none` by default
- `opacity: 1; pointer-events: auto` via `--visible` class
- `transition: opacity 260ms` with standard ease
- `@include motion-safe` — transition removed under reduced motion

---

## Nav Item Design

Each nav item is a `<a>` with `routerLink` (no `href` fallback needed — app is SPA):
- Height: 52px (generous touch target)
- Left border rail: `border-left: 3px solid transparent` → `$color-global-red-buttons` when active
- Active background: `$color-global-sidebar-employer-route-active` (#67627E)
- Hover background: `rgba(255,255,255,0.07)`
- `:active` haptic: `transform: scale(0.97)` + `rgba($color-global-red-buttons, 0.1)` background
- Icon: 20×20 inline SVG, `aria-hidden="true"`
- Label: 14px Manrope 500

---

## Focus Management (Phase 4f)

- On open: `openMobileNav()` calls `setTimeout(() => firstDrawerLinkRef.focus(), 200)` — waits for drawer slide animation
- On close: `closeMobileNav()` calls `setTimeout(() => mobileMenuBtnRef.focus(), 50)`
- Escape key: `@HostListener('document:keydown.escape')` — calls `closeMobileNav()`
- Close button: `(click)="closeMobileNav()"`
- Scrim tap: `(click)="closeMobileNav()"`
- NavigationEnd: router subscription → `closeMobileNav()`

---

## Nav Item Shared Source

Items are defined inline in the template (not shared array from sidebar).
Reason: `sidebarItems` lives in `EmployerSidebarComponent.ngOnChanges` — not a service.
Items match exactly the module routes verified in nav contract.

---

## Status: IMPLEMENTED
