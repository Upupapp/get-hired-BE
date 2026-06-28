# GETHIRED_BRAND_QA_CHECKLIST.md
## BRAND QA Cycle 11 — QA Checklist
_Generated: 2026-06-25_

---

## A. Motion + Reduced-Motion

- [x] Every transition/animation in IH uses `@include motion-safe` or `@include ambient-motion-safe`
- [x] Every transition/animation in mobile drawer uses `@include motion-safe`
- [x] Every transition/animation in Messages Inbox uses `@include motion-safe` or `@include ambient-motion-safe`
- [x] Shimmer animations use `ambient-motion-safe` (removed entirely under reduce)
- [x] Press-scale haptics suppressed under `prefers-reduced-motion`
- [x] SVG hamburger morph suppressed under `prefers-reduced-motion` (static state held)
- [x] No `animation-duration: 1ms` workaround used (all use `animation: none !important`)
- [x] No custom `prefers-reduced-motion` logic — all via established mixins

## B. Interview Hub

- [x] 4 states implemented: loading skeleton, error+retry, empty+CTAs, content
- [x] Skeleton chip dimensions match real filter chip dimensions (~110px × 34px)
- [x] Skeleton card dimensions match real card (padding 18px 20px, border-radius 10px)
- [x] Shimmer gradient applied to skeleton chips (FIX-01 applied this cycle)
- [x] Shimmer gradient applied to skeleton lines (FIX-01 applied this cycle)
- [x] 3 filter chips present: "All applicants", "Video answers", "Under review"
- [x] Filter chips have `aria-pressed`
- [x] Filter group has `role="group"` + `aria-label`
- [ ] Filter chip active state has non-color differentiation (weight/icon) — RISK-01, deferred
- [ ] IH active filter chip contrast ratio ≥ 4.5:1 — RISK-07, needs verification
- [x] Error state has `role="alert"`
- [x] Error state has retry button + back-to-dashboard link
- [x] Empty state has heading + body + 2 CTAs
- [x] Empty icon is `aria-hidden="true"`
- [x] Content card list has `role="list"` + `role="listitem"`
- [x] Card hover: `translateY(-2px)` + box-shadow (compositor-safe)
- [x] Card press: `scale(0.99)` (compositor-safe)
- [x] 6 motion effects present with motion-safe wrapping

## C. Mobile Sidebar Drawer

- [x] 56px sticky top bar (`height: 56px; position: sticky; top: 0`)
- [x] Hamburger → X SVG morph with 3 `<line>` transforms
- [x] SVG morph uses `transform-origin: center`
- [x] Drawer width: 280px
- [x] Drawer animation: `translateX(-100%) → translateX(0)` (compositor-safe)
- [x] Scrim present with `z-index: 1000` (drawer: 1001, top bar: 1001, bottom nav: 999)
- [x] Scrim is `aria-hidden="true"`
- [x] Scrim closes drawer on click
- [x] Hamburger button `aria-expanded` updates on state
- [x] Hamburger button `aria-controls="gh-mobile-drawer"`
- [x] Hamburger button `aria-label` changes on state ("Open/Close navigation menu")
- [x] Drawer `role="navigation"` + `aria-label="Employer navigation"`
- [x] Focus moves into drawer on open (200ms delay → `firstDrawerLink.focus()`)
- [x] Focus returns to hamburger on close (50ms → `mobileMenuBtn.focus()`)
- [x] Escape closes drawer via `@HostListener`
- [x] Route change closes drawer via `NavigationEnd` subscription
- [x] 8 haptic effects present and wrapped in motion-safe
- [x] Drawer hidden on desktop (`@media (min-width: 768px) { display: none !important }`)
- [x] `safe-area-inset-bottom` in drawer footer padding
- [x] All nav items have `aria-current="page"` when active

## D. Messages Inbox Avatar

- [x] `.rm-thread-avatar` has `overflow: hidden` (clips any image overflow)
- [x] `.rm-thread-avatar-img` has `object-fit: cover; border-radius: 50%`
- [x] `<img>` has `alt=""` (decorative — name is in separate element)
- [x] `<img>` has `loading="lazy"`
- [x] `(error)` handler present — sets `_photoError` flag, shows initials fallback
- [x] Initials fallback shows when `applicantPhotoUrl` absent OR `_photoError` is true

## E. Accessibility

- [x] No color-only meaning for any interactive state (all have secondary indicator)
  - Exception: IH filter chip active — color+border, no weight — RISK-01
- [x] All animated states have text equivalents (aria-busy, role=alert, visible text)
- [x] All interactive elements are keyboard accessible
- [x] Focus-visible rings applied to all interactive elements
- [x] Minimum 44×44px tap targets on mobile (hamburger, close btn, nav items, filter chips)

## F. Motion Token Reconciliation

- [x] No new duration values introduced in Interview Hub (all use `$motion-duration-*`)
- [x] No new duration values introduced in mobile drawer (all use `$motion-duration-*`)
- [x] `$gh-lift` token used for card hover lift
- [x] Messages Inbox has minor duration drift (120ms, 140ms vs 160ms token) — RISK-05, deferred
- [x] No new npm animation libraries

## G. No Forbidden Patterns

- [x] No fake AI/product intelligence
- [x] No fake urgency
- [x] No fake counts
- [x] No real email sends
- [x] No auth/payment changes
- [x] No route renames
- [x] No core business logic changes
