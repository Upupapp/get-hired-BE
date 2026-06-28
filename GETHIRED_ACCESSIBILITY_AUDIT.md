# GETHIRED_ACCESSIBILITY_AUDIT.md
## QA Cycle 11 — Accessibility Audit

### Interview Hub Component

| Check | Status | Detail |
|---|---|---|
| Page landmark `<h1>` | Pass | `.ih-title` renders as `<h1 class="ih-title">Interviews</h1>` |
| Loading state announced | Pass | `aria-busy="true" aria-label="Loading interview activity"` on skeleton wrapper |
| Error state announced | Pass | `role="alert"` on error block — announced immediately by screen readers |
| Empty state heading | Pass | `<h2 class="ih-empty-heading">` under empty block |
| Filter chip `aria-pressed` | Pass | `[attr.aria-pressed]="activeFilter === f.key"` — correct toggled button semantics |
| Filter group label | Pass | `role="group" aria-label="Filter interview activity"` |
| Card list landmark | Pass | `role="list" aria-label="Interview activity list"` |
| Card list items | Pass | `role="listitem"` on each card |
| Video badge | Pass | `aria-label="Video answers submitted"` |
| Action links `<a>` | Pass | All use `routerLink` — rendered as anchor elements with href |
| Status chip screen reader text | Issue | Status chip only shows text from `item.applicationStatus`. Status ID-based CSS class (`ih-status--3`) is visual only — no aria-label on the chip. Acceptable as text is visible. |
| Emoji icons (&#9654; &#128188;) | Issue | Emoji used as icons without `aria-hidden="true"`. Screen readers will announce "black right-pointing triangle" and "briefcase". Add `aria-hidden="true"` spans around emoji icons. |
| Skeleton shimmer animation | Pass | `@include ambient-motion-safe` wraps the shimmer — suppressed under `prefers-reduced-motion: reduce` |
| Button focus rings | Pass | All `.ih-btn` and `.ih-action` inherit focus-visible styling |
| Touch target (buttons) | Pass | `.ih-btn` has `padding: 9px 18px`, `min-height` via padding ≥ 44px rule check needed. `.ih-action` padding `7px 14px` — total height ~32px, below 44px WCAG target |
| Card actions touch target | Issue | `.ih-action` computed height is ~32px — below 44px minimum. Add `min-height: 44px` to `.ih-action`. |

---

### Mobile Sidebar (employer-panel.component)

| Check | Status | Detail |
|---|---|---|
| Hamburger `aria-expanded` | Pass | `[attr.aria-expanded]="mobileNavOpen"` — toggles correctly |
| `aria-controls` wiring | Pass | `aria-controls="gh-mobile-drawer"` + matching `id="gh-mobile-drawer"` |
| `aria-label` on button | Pass | Dynamic: "Open navigation menu" / "Close navigation menu" |
| Focus moves into drawer on open | Pass | `setTimeout(200ms)` → `firstDrawerLinkRef.nativeElement.focus()` |
| Focus returns to hamburger on close | Pass | `setTimeout(50ms)` → `mobileMenuBtnRef.nativeElement.focus()` |
| Escape closes drawer | Pass | `@HostListener('document:keydown.escape')` |
| Drawer nav landmark | Pass | `<nav id="gh-mobile-drawer" role="navigation" aria-label="Employer navigation">` |
| Scrim aria-hidden | Pass | `aria-hidden="true"` on `.gh-mobile-scrim` |
| Active route aria-current | Pass | `[attr.aria-current]="rla0.isActive ? 'page' : null"` on each nav link |
| Touch target (nav items) | Pass | `.gh-drawer-nav-item` height `52px` and `.gh-mobile-menu-btn` 44×44px — meets WCAG 2.5.5 |
| Motion safety | Pass | `@include motion-safe` on drawer slide and hamburger icon transitions |
| Close button in drawer | Pass | `aria-label="Close navigation menu"` + 40×40px — slightly under 44px |

**Issue:** Drawer close button is 40×40px (`width: 40px; height: 40px`). WCAG 2.5.5 target is 44×44px. Upgrade to `min-width: 44px; min-height: 44px`.

**Focus trap concern:** The drawer has `@HostListener` for Escape to close and moves focus to first link on open, but there is **no focus trap** — Tab will eventually leave the drawer and reach content behind the scrim. For a sidebar nav this is a common acceptable trade-off (nav items are the primary focus targets), but a proper `FocusTrap` (Angular CDK) would be best practice. Deferred to backlog.

---

### Recruiter Messages Component

| Check | Status | Detail |
|---|---|---|
| Page section landmark | Pass | `<section aria-label="Messages inbox">` |
| h1 present | Pass | `.rm-page-title` |
| Loading aria-busy | Pass | `aria-busy="true" aria-label="Loading messages"` |
| Error role="alert" | Pass | Present |
| Thread list role | Pass | `<aside aria-label="Conversation list">` + `<ul role="list">` |
| Thread row keyboard | Pass | `tabindex="0"`, `(keydown.enter)`, `(keydown.space)` — full keyboard support |
| Thread row aria-pressed | Pass | `[attr.aria-pressed]="selectedThread?.threadId === t.threadId"` |
| Thread row aria-label | Pass | `[attr.aria-label]="threadLabel(t)"` — rich description with job, time, needs-reply |
| Avatar img alt | Pass | `alt=""` — decorative image, correct |
| Detail pane landmark | Pass | `<main aria-label="Conversation detail">` |
| Back button | Pass | `aria-label="Back to messages list"` |
| Needs-reply badge | Pass | `aria-label="Needs your reply"` |
| filter chip aria-pressed | Pass | Correctly implemented |
| Buttons min height | Pass | `.rm-btn { min-height: 44px }` — explicitly set. Good. |

---

### Summary of Issues

| # | Component | Issue | Severity | Fix |
|---|---|---|---|---|
| A1 | Interview Hub | Emoji icons not aria-hidden | Low | Add `aria-hidden="true"` to emoji spans |
| A2 | Interview Hub | Card action buttons height ~32px | Medium | Add `min-height: 44px` to `.ih-action` |
| A3 | Mobile Sidebar | Close button 40×40px | Low | Increase to 44×44px |
| A4 | Mobile Sidebar | No focus trap in drawer | Low-Medium | Deferred to backlog — CDK FocusTrap |
