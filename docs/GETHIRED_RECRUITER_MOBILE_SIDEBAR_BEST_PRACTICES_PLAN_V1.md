# GETHIRED_RECRUITER_MOBILE_SIDEBAR_BEST_PRACTICES_PLAN_V1

## Phase 3 — Best Practices Plan
Date: 2026-06-25

---

## Approach Decisions

### 1. Drawer Implementation
**Decision: Custom CSS drawer, NOT Angular Material mat-sidenav**
- Reason: `MatSidenavModule` is not imported in `employer-panel.module.ts`. Adding it requires importing the module and risks breaking existing layout (mat-sidenav-container takes over the host layout).
- Custom drawer uses `position: fixed` overlay pattern — zero layout disruption to existing desktop sidebar and content area.
- Pure CSS transitions driven by Angular class binding `[class.gh-mobile-drawer--open]="mobileNavOpen"`.

### 2. Breakpoint Strategy
**Decision: CSS media queries + Bootstrap `d-*` classes**
- Consistent with existing bottom nav pattern (`d-flex d-md-none`, `d-none d-md-block`).
- md breakpoint = 768px (Bootstrap v5 default, consistent with existing `@media (max-width: 767px)` in SCSS).
- No BreakpointObserver needed — reduces Angular CDK dependency footprint.
- Mobile-only elements use `d-flex d-md-none` or `d-md-none` in HTML; drawer is positioned fixed so it's harmless on desktop even if not hidden.

### 3. Desktop Sidebar
**Unchanged.** Remains `d-none d-md-block`, `position: sticky`, width 250px. B02 adds no styles that affect `#sidebar-container` or `app-employer-sidebar`.

### 4. Mobile Top Bar
- Sticky top bar: `position: sticky; top: 0; z-index: 1001`
- Only shown `d-flex d-md-none`
- Height: 56px
- Contains: hamburger button (left) + "GetHired" or "Employer Portal" title (center)
- Background: `$color-global-sidebar-employer-user-menu` (matching drawer)
- Does NOT replace existing `<app-header>` — the header is already inside `#main-company-component`. The mobile top bar is PREPENDED above the router-outlet on small screens only.

### 5. Focus Management
- `@ViewChild('mobileMenuBtn')` — `ElementRef` reference to hamburger button
- On open: `setTimeout(() => firstDrawerLink?.focus(), 200)` after CSS transition
- On close (Escape or scrim click): `this.mobileMenuBtnRef.nativeElement.focus()`
- Tab cycle: natural DOM order within drawer (no full focus trap — acceptable for nav drawer, matching Material sidenav behavior)
- Escape: `@HostListener('keydown.escape')` in employer-panel.component.ts

### 6. Active State
- Use `routerLinkActive` directive on each drawer nav item link
- `routerLinkActiveOptions` set per nav contract
- `[attr.aria-current]="rla.isActive ? 'page' : null"` using template variable `#rla="routerLinkActive"`

### 7. Motion
- Drawer slide: `transform: translateX(-100%)` → `translateX(0)`, duration `$motion-duration-drawer` (260ms), ease `$motion-ease-decelerate`
- Scrim fade: `opacity: 0` → `1`, duration `$motion-duration-drawer`, ease `$motion-ease-standard`
- Menu button press: `transform: scale(0.93)` on `:active`
- Nav item tap: `transform: scale(0.97)` on `:active`
- All transitions wrapped in `@include motion-safe` (resolves to `transition: none !important` under `prefers-reduced-motion: reduce`)

### 8. Nav Item Shared Source
- Will use inline nav items in the template rather than sharing `sidebarItems[]` from `EmployerSidebarComponent`
- Reason: `sidebarItems` is built in `ngOnChanges` of the sidebar component — it's not a service/store. Extracting to shared config would require a new service or constant file.
- The 6 drawer items map directly to the routes in module; no drift risk for this codebase size.
- BACKLOG: extract to `employer-nav-items.config.ts` if nav items proliferate

### 9. Router Close-on-Navigate
- Subscribe to `router.events.pipe(filter(e => e instanceof NavigationEnd))` in `ngOnInit`
- Call `closeMobileNav()` on each NavigationEnd
- Unsubscribe in `ngOnDestroy` (store ref in `private sub: Subscription`)

### 10. Z-index Stack
- Existing: `gh-mobile-nav` z-index 999, `gh-billing-bar` z-index 999
- Scrim: z-index 1000 (above bottom nav, below drawer)
- Drawer: z-index 1001 (above scrim)
- Mobile top bar: z-index 1001 (same as drawer, sticky)
- Note: `mat-dialog-container` in styles.scss is `z-index: 99999` — dialogs still appear above drawer

### 11. What is NOT changed
- `auth.guard.ts` — untouched
- `employer-panel.module.ts` routes — untouched
- `employer-sidebar.component.*` — untouched
- Payment/subscription route and component — untouched
- MATCH scoring — untouched
- Interview/video-answer components — untouched
- Public jobs portal — untouched
- Applicant portal — untouched
- Admin portal — untouched
