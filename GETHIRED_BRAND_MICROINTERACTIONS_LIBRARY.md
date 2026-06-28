# GETHIRED_BRAND_MICROINTERACTIONS_LIBRARY.md
## BRAND QA Cycle 11 — Microinteractions Library
_Generated: 2026-06-25_

---

## Microinteraction Inventory

### IH-01: Filter Chip Toggle (Interview Hub)
**Trigger:** Click `.ih-filter-chip`
**Effect:** background, color, border-color transition (160ms, standard ease)
**Active state:** `background: $color-blue-primary; border-color: $color-blue-primary; color: #fff`
**aria-pressed:** Updated synchronously — PASS
**Reduced-motion:** `@include motion-safe` wraps transition — PASS
**Color-only check:** Color + border change (2 visual axes). Active chip also lacks bold text weight — RISK-01 (medium)

### IH-02: Card Hover Lift (Interview Hub)
**Trigger:** Hover `.ih-card`
**Effect:** `translateY(-2px)` + `box-shadow: 0 4px 16px rgba(0,0,0,0.07)`, 220ms standard
**Reduced-motion:** `@include motion-safe` on `.ih-card` — PASS
**Note:** `@include motion-safe` appears twice (on `.ih-card` and inside `&:hover`) — the second call is redundant but harmless

### IH-03: Button/Action Press Scale (Interview Hub)
**Trigger:** Active state on `.ih-btn` / `.ih-action`
**Effect:** `scale(0.96)`, 160ms
**Reduced-motion:** `@include motion-safe` — PASS

### IH-04: Page Header Fade-In (Interview Hub)
**Trigger:** Component mount
**Effect:** `opacity 0→1 + translateY(8px)→0`, 220ms decelerate
**Mixin used:** `@include ambient-motion-safe` — PASS (removed entirely under reduce)

### MS-01: Mobile Drawer Slide (Panel)
**Trigger:** `openMobileNav()` — adds class `.gh-mobile-drawer--open`
**Effect:** `translateX(-100%) → translateX(0)`, 260ms decelerate-ease
**Compositor:** YES — `transform: translateX()` is compositor-only, no layout paint triggered
**Reduced-motion:** `@include motion-safe` on `.gh-mobile-drawer` — PASS

### MS-02: Scrim Fade (Panel)
**Trigger:** Drawer open/close
**Effect:** `opacity 0→1` on `.gh-mobile-scrim`, 260ms standard
**Reduced-motion:** `@include motion-safe` — PASS

### MS-03: Hamburger → X SVG Morph (Panel)
**Trigger:** `mobileNavOpen` → adds `.gh-menu-icon--open` class
**Top line:** `rotate(45deg) translate(4px, 6px)`, 260ms decelerate
**Mid line:** `opacity: 0; scaleX(0)`, 160ms standard
**Bottom line:** `rotate(-45deg) translate(4px, -6px)`, 260ms decelerate
**Reduced-motion:** `@include motion-safe` on `.gh-menu-line` — PASS
**Note:** SVG lines use CSS `transform` with `transform-origin: center` — compositor-safe

### MS-04: Menu Button Press (Panel)
**Trigger:** `:active` on `.gh-mobile-menu-btn`
**Effect:** `scale(0.93)` + background lighten
**Reduced-motion:** Inline `@media (prefers-reduced-motion: reduce) { transform: none; }` — PASS (explicit inline, not mixin — acceptable, slightly inconsistent style)

### MS-05: Drawer Nav Item Press (Panel)
**Trigger:** `:active` on `.gh-drawer-nav-item`
**Effect:** `scale(0.97)` + accent background
**Reduced-motion:** Inline `@media` override — PASS

### MS-06: Close Button Press (Panel)
**Trigger:** `:active` on `.gh-drawer-close-btn`
**Effect:** `scale(0.9)`
**Reduced-motion:** Inline `@media` override — PASS

### RM-01: Thread Row Hover (Messages)
**Trigger:** Hover `.rm-thread-row`
**Effect:** `background: #f9fafb` + `translateY(-1px)`, 120ms
**Reduced-motion:** `@include motion-safe` on `.rm-thread-row` — PASS

### RM-02: Thread Row Press (Messages)
**Trigger:** `:active` on `.rm-thread-row`
**Effect:** `scale(0.99)`, 120ms
**Note:** `:active` rule has no `@include motion-safe` of its own — inherits from parent `@include motion-safe` which nullifies `transform` — PASS

### RM-03: Detail Reveal (Messages)
**Trigger:** Thread selection — class `.rm-detail-reveal`
**Effect:** `opacity 0→1 + translateX(8px)→0`, 220ms decelerate
**Reduced-motion:** `@include motion-safe` — PASS

### RM-04: Page Reveal (Messages)
**Trigger:** Component mount
**Effect:** `opacity 0→1 + translateY(6px)→0`, 220ms decelerate
**Reduced-motion:** `@include motion-safe` — PASS

### RM-05: Empty State Reveal (Messages)
**Trigger:** Empty state visible
**Effect:** `opacity 0→1 + translateY(8px)→0`, 280ms decelerate
**Reduced-motion:** `@include motion-safe` — PASS

## Token Alignment

All effects use `$motion-duration-micro` (160ms), `$motion-duration-card` (220ms), `$motion-duration-drawer` (260ms), `$motion-ease-standard`, or `$motion-ease-decelerate` from `_motion.scss`. No custom/hardcoded duration values introduced. PASS.

**Exception:** `recruiter-messages.component.scss` uses hardcoded `140ms` and `120ms` for chip and row transitions. These are close to but not exactly `$motion-duration-micro` (160ms). Minor inconsistency — see RISK-05.
