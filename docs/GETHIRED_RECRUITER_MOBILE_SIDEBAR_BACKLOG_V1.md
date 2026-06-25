# GETHIRED_RECRUITER_MOBILE_SIDEBAR_BACKLOG_V1

## B02 Backlog Items
Date: 2026-06-25

---

## P1 — High Value

### BACKLOG-01: Messages unread badge
**What:** Show real unread message count badge on Messages nav item in drawer.
**Why blocked:** `RecruiterMessagesComponent` loads thread data as component-local state. `EmployerPanelComponent` has no access to thread count.
**How to unblock:**
1. Create `RecruiterMessagesService` with `unreadCount$: Observable<number>`
2. Service calls `GET /api/messages/recruiter/threads` on init + polls/WebSocket
3. Inject service in `EmployerPanelComponent`, bind badge to count
4. Mirror badge on bottom nav Messages item

### BACKLOG-02: Focus trap in drawer
**What:** Implement full focus trap (Tab cycles within drawer while open).
**Why not in B02:** Requires `FocusTrap` from `@angular/cdk/a11y` — CDK likely already in package.json but unused in employer-panel.
**Impact:** Accessibility improvement for keyboard-only users.
**Implementation:** `import { FocusTrapFactory } from '@angular/cdk/a11y'; this.focusTrap = this.focusTrapFactory.create(drawerEl); focusTrap.focusInitialElement();`

---

## P2 — Medium Value

### BACKLOG-03: Nav items shared config
**What:** Extract nav items array to `employer-nav-items.config.ts` and share between drawer and desktop sidebar.
**Why deferred:** Desktop sidebar uses image-based icons (`.png` assets), drawer uses inline SVG. Would require icon strategy unification first.
**Benefit:** Single source of truth for nav labels/routes.

### BACKLOG-04: Post Job quick access
**What:** Add "Post Job" as a secondary action in drawer (not a standalone route — /recruiter/jobs/create is within EmployerJobsModule).
**How:** Add a visually distinct CTA button in drawer pointing to `/recruiter/jobs/create`.
**Note:** Verify `/recruiter/jobs/create` route exists in EmployerJobsModule before adding.

### BACKLOG-05: Interview route in drawer
**What:** Add `/recruiter/interview` to drawer nav items.
**Why deferred:** Not in bottom nav; interview flow is typically reached from job/applicant detail.
**Consider:** If interview is a primary workflow destination for recruiters, promote it.

### BACKLOG-06: User profile / avatar in drawer
**What:** Show logged-in user name + company in drawer (similar to desktop sidebar user card).
**Data available:** `employee` is passed as input to `app-employer-sidebar`. In `EmployerPanelComponent`, `employee$` is available.
**How:** Pass `employee$ | async` to drawer template section.

---

## P3 — Low Value / Nice to Have

### BACKLOG-07: Analytics instrumentation
**What:** Track drawer open/close, nav item taps.
**Blocked by:** No analytics SDK in codebase.

### BACKLOG-08: Unit tests for EmployerPanelComponent
**What:** TestBed unit tests for mobileNavOpen toggle, router subscription cleanup, focus management.
**Blocked by:** SQLite test schema gap (90+ missing migrations) per memory note.

### BACKLOG-09: Swipe-to-close gesture
**What:** Touch swipe left on drawer to close.
**How:** Angular CDK overlay or custom touch event handler.
**Low priority:** Scrim tap covers the essential use case.

### BACKLOG-10: Drawer open from bottom nav long-press
**What:** Long-press on "More" or any bottom nav item opens drawer for full nav.
**Note:** Requires adding a "More" item to bottom nav replacing one current item. Design decision needed.
