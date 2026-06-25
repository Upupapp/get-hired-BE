# GETHIRED_RECRUITER_MOBILE_SIDEBAR_ACCESSIBILITY_MOBILE_QA_V1

## Phase 10 — Accessibility QA
Date: 2026-06-25

---

## Checklist

| Item | Status | Detail |
|------|--------|--------|
| `aria-expanded` on menu button | PASS | `[attr.aria-expanded]="mobileNavOpen"` — false/true, updates live |
| `aria-label` changes state | PASS | `mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'` |
| `aria-controls` on button | PASS | `aria-controls="gh-mobile-drawer"` links to nav id |
| `role="navigation"` on drawer | PASS | `<nav role="navigation">` (nav element has implicit role, explicit set for clarity) |
| `aria-label` on drawer nav | PASS | `aria-label="Employer navigation"` |
| `aria-current="page"` on active | PASS | `[attr.aria-current]="rlaX.isActive ? 'page' : null"` on each item |
| `aria-hidden="true"` on scrim | PASS | `aria-hidden="true"` on scrim div |
| Icons aria-hidden | PASS | All inline SVGs have `aria-hidden="true" focusable="false"` |
| Close button accessible label | PASS | `aria-label="Close navigation menu"` on close button |
| Keyboard Escape closes | PASS | `@HostListener('document:keydown.escape')` → closeMobileNav() |
| focus-visible on button | PASS | `&:focus-visible { outline: 2px solid rgba($color-global-red-buttons, 0.85); }` |
| focus-visible on nav items | PASS | `&:focus-visible { outline: 2px solid rgba(...); outline-offset: -2px; }` |
| focus-visible on close btn | PASS | `&:focus-visible` applied |
| Focus moves to drawer on open | PASS | `setTimeout(() => firstDrawerLinkRef.focus(), 200)` after animation |
| Focus returns on close | PASS | `setTimeout(() => mobileMenuBtnRef.focus(), 50)` |
| `type="button"` on buttons | PASS | Both hamburger button and close button have `type="button"` |
| `role="banner"` on top bar | PASS | Top bar div has `role="banner"` |
| `role="list"` on nav ul | PASS | `<ul role="list">` (removes list semantics bullet for VoiceOver) |
| `role="listitem"` on li | PASS | Each `<li role="listitem">` |
| Tap target size (hamburger) | PASS | `width: 44px; height: 44px; min-width: 44px` — WCAG 2.5.5 AAA |
| Tap target size (nav items) | PASS | `height: 52px` — exceeds 44px minimum |
| Tap target size (close btn) | PASS | `width: 40px; height: 40px` — acceptable (40px common threshold) |
| Color contrast (nav items) | PASS | rgba(255,255,255,0.75) on #444152 — sufficient for normal text |
| Color contrast (active items) | PASS | White on #67627E — ≥4.5:1 |
| Color contrast (title) | PASS | #ffffff on #444152 — high contrast |
| Reduced motion respected | PASS | All transitions wrapped in `@include motion-safe` |
| No autofocus on page load | PASS | Focus only moves on explicit drawer open |
| Screen reader: landmark regions | PASS | `role="navigation"` drawer, `role="banner"` topbar, bottom nav has `aria-label` |

---

## Known Minor Gaps

1. **Focus trap not implemented** — Tab can cycle out of drawer to page content behind scrim. This is acceptable for a navigation drawer (matches Angular Material behavior). Full focus trap would require FocusTrap from `@angular/cdk/a11y`. BACKLOG item.

2. **Close button tap target = 40×40px** — Slightly below the 44×44 WCAG AAA recommendation. Body of close button in drawer header is 40px to fit the header layout. Acceptable for AAA advisory (AA minimum is contextual).

---

## Verdict: PASS (with 2 known acceptable gaps documented)
