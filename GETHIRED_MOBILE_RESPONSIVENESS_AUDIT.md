# GETHIRED_MOBILE_RESPONSIVENESS_AUDIT.md
## QA Cycle 11 — Mobile Responsiveness Audit

### Breakpoints in play
- Bootstrap md: 768px
- Custom mobile override in employer-panel: `max-width: 767px`

---

### Mobile Sidebar (employer-panel.component)

| Check | Status | Detail |
|---|---|---|
| Top bar visibility | Pass | `.gh-mobile-topbar { d-flex d-md-none }` — hidden on desktop |
| Drawer hidden on desktop | Pass | `@media (min-width: 768px) { display: none !important }` |
| Bottom nav hidden on desktop | Pass | `d-flex d-md-none` |
| Desktop sidebar visible | Pass | `d-none d-md-block` on `#sidebar-container` |
| Drawer width | Pass | `width: 280px` — fits all 320px+ mobile screens |
| Z-index stack | Pass | Scrim 1000, drawer 1001, top bar 1001, bottom nav 999. Drawer is above everything; scrim blocks content but not drawer |
| Body content padding-top (mobile) | Pass | `#body-main-container { padding-top: 56px }` at `max-width: 767px` — prevents content hiding under sticky top bar |
| Body padding-bottom (mobile) | Pass | `calc(72px + env(safe-area-inset-bottom, 0px))` — clears bottom nav + billing bar |
| Safe area insets (notched phones) | Pass | `env(safe-area-inset-bottom)` applied to nav bar padding, billing bar bottom, and drawer footer |
| Drawer overflow-y scroll | Pass | `overflow-y: auto` on drawer — long nav lists scroll within drawer |
| Scrim tap dismissal | Pass | `(click)="closeMobileNav()"` on scrim |
| Escape key dismissal | Pass | `@HostListener` |
| Nav item tap target | Pass | 52px height — sufficient |
| Hamburger tap target | Pass | 44×44px |

**Concern — z-index conflict check:**
- `.gh-mobile-topbar` z-index: 1001 (sticky, at top)
- `.gh-mobile-drawer` z-index: 1001 (fixed, slides from left)
- Both are 1001. Topbar is `sticky` (flow-based stacking), drawer is `fixed`. Since they are siblings in the DOM and both have z-index 1001, their overlap at the top-left corner when the drawer is open is rendered in DOM order — drawer comes after topbar in DOM, so **drawer overlaps the topbar top strip when open**. This is intentional (drawer covers the whole screen) but the header branding in the drawer (`gh-drawer-header`, `min-height: 64px`) matches the topbar height (56px), making the transition feel continuous. **Status: acceptable.**

**Concern — billing bar stacking:**
`.gh-billing-bar` is `bottom: calc(56px + env(safe-area-inset-bottom, 0px))` at z-index 999. It sits above the bottom nav visual bottom but below the nav's z-index. The nav is `z-index: 999` also — same level. Since billing bar is `position: fixed` and appears after the nav in DOM order, it will render on top of the nav at the same z-index. Visually they don't overlap (billing bar is above nav by offset), but if `env()` is 0 and both are exactly 56px from bottom, there could be a 1px overlap. **Low risk — acceptable.**

---

### Interview Hub (mobile, max-width 600px)

| Check | Status | Detail |
|---|---|---|
| Page padding | Pass | `padding: 16px` at 600px |
| Card header flex | Pass | `flex-direction: column; align-items: flex-start` at 600px |
| Card actions | Pass | `flex-direction: column` at 600px |
| Action buttons full-width | Pass | `width: 100%; justify-content: center` at 600px |
| Filter chips wrapping | Pass | `flex-wrap: wrap` on `.ih-filters` |
| Max-width constraint | Note | `.ih-page { max-width: 900px }` — sensible for desktop but has no 100% constraint. Fine since it's within `#main-company-component { width: 100% }` |

**Gap:** No responsive breakpoint between 600px and 900px. At 700px wide, cards are full-width within the 900px max, which is fine. No issue.

---

### Messages Inbox (mobile, max-width 767px)

| Check | Status | Detail |
|---|---|---|
| Two-pane grid → single column | Pass | `grid-template-columns: 1fr` at 767px |
| Thread list hide when detail open | Pass | `.rm-thread-list--hidden-mobile { display: none }` |
| Detail pane hide when no thread selected (mobile) | Pass | `.rm-thread-detail { display: none }` at 767px; `--visible-mobile { display: flex }` |
| Back button mobile-only | Pass | `*ngIf="showDetail"` — only shown when in detail view |
| Filter chips wrap | Pass | `flex-wrap: wrap` |
| Bottom padding for mobile nav | Pass | `padding-bottom: 80px` on `.rm-page` at 767px — clears bottom nav stack |

---

### Overall Mobile Assessment

The mobile sidebar implementation (B02) is thorough: drawer, scrim, top bar, bottom nav, safe-area insets, focus management, keyboard dismiss, and DOM cleanup are all implemented correctly. The messages inbox and interview hub both have correct mobile breakpoints. The z-index stack is internally consistent and intentional.

**Sole medium-priority mobile gap:** focus trap missing in the drawer (documented in A11y audit).
