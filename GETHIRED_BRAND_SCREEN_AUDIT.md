# GETHIRED_BRAND_SCREEN_AUDIT.md
## BRAND QA Cycle 11 — Screen Audit
_Generated: 2026-06-25_

---

## Screen 1: Interview Hub (`/recruiter/interview`)

### Layout
- Max-width: 900px — appropriate for card list
- Padding: 24px 28px desktop, 16px mobile — PASS
- Responsive: breakpoint at 600px, card-actions become column — PASS

### States
| State | Present | Animation | Motion-safe | Verdict |
|---|---|---|---|---|
| Loading skeleton | YES | ih-shimmer (broken) | ambient-motion-safe | FIX-01 required |
| Error + retry | YES | None | n/a | PASS |
| Empty + CTAs | YES | None | n/a | PASS (animation recommended in backlog) |
| Content | YES | ih-fadein header | ambient-motion-safe | PASS |

### Filter Chips
- 3 chips: "All applicants", "Video answers", "Under review"
- Active: `background: $color-blue-primary; color: #fff; border-color: $color-blue-primary`
- `aria-pressed` updated dynamically — PASS
- Color-only active indicator: YES — both color and border change, but no bold/weight/icon change. RISK-01

### Cards
- 3 fields: name (bold, 0.9375rem), job title (0.875rem), meta (date + video badge)
- Status chip: 6 status IDs with color-coded backgrounds — each has `border-bottom: 2px solid` as second indicator — PASS (not color-only)
- Actions: "View applicants" (primary), "Review responses" (conditional on video), "Message" (ghost)
- Hover lift: `translateY(-2px)` — PASS
- Mobile: card-actions become column (full-width) — PASS

### CLS Assessment (Interview Hub)
- Skeleton filter chips: 110px × 34px vs real chips (~112px × 34px) — MATCH (within 2px)
- Skeleton cards: padding 18px 20px, border 1px, border-radius 10px vs real `.ih-card`: IDENTICAL — NO CLS

---

## Screen 2: Mobile Sidebar Drawer

### Top Bar
- Height: 56px sticky — PASS
- `z-index: 1001` — above scrim (1000) and bottom nav (999) — PASS
- Brand color: `$color-global-sidebar-employer-user-menu (#444152)` — consistent with desktop sidebar

### Hamburger Button
- 44×44px tap target — PASS (WCAG 2.5.5)
- `aria-expanded` + `aria-label` update on state — PASS
- `aria-controls="gh-mobile-drawer"` — PASS

### Drawer
- Width: 280px — PASS
- Transform: `translateX(-100%) → translateX(0)` — compositor-safe — PASS
- z-index: 1001 — PASS
- Hidden on desktop: `@media (min-width: 768px) { display: none !important; }` — PASS
- `safe-area-inset-bottom` in footer padding — PASS (notch-aware)
- Scroll: `overflow-y: auto` — handles long nav lists on small phones — PASS

### Scrim
- z-index: 1000 (below drawer, above content) — PASS
- `pointer-events: none` by default, `auto` when visible — PASS
- `aria-hidden="true"` — PASS

### Focus Management
- Open: focus moves to first nav link (200ms delay) — PASS
- Close: focus returns to hamburger button (50ms delay) — PASS
- Escape: closes from anywhere — PASS

### SVG Hamburger → X
- 3 `<line>` elements in a single SVG — PASS
- Transform-origin: center — PASS
- Reduced-motion: `@include motion-safe` on lines, static state shows X — PASS

---

## Screen 3: Messages Inbox (`/recruiter/messages`)

### Avatar Photo
**Audit question:** Does `.rm-thread-avatar` have `overflow: hidden`?
- `.rm-thread-avatar`: `overflow: hidden` — YES, PRESENT — PASS
- `.rm-thread-avatar-img`: `object-fit: cover; border-radius: 50%` — PASS
- The `overflow: hidden` on the parent ensures any image that doesn't perfectly match the circular clip is still clipped by the container

**Broken image behavior:**
- When `applicantPhotoUrl` is set but 404s: `<img alt="">` will render a broken-image indicator inside the circular container
- `overflow: hidden` on `.rm-thread-avatar` clips the broken-image icon — the circle shape is preserved
- But a broken-image browser icon (small square with X) may appear inside the otherwise-styled circle
- `alt=""` means no alt text announced — correct for decorative
- **FIX-02 required:** Add `onerror` handler to hide broken image and show initials instead

### Thread List
- `rm-thread-list`: max-height 700px, overflow-y auto — PASS (prevents unbounded list)
- Thread rows: `min-height 44px` (via padding 14px 16px + content) — near WCAG 2.5.5 minimum
- Selected state: `background: #F5F3FF; border-left: 3px solid #7B61FF` — color + border rail — not color-only — PASS

### Two-Pane Layout
- Grid: `340px 1fr` desktop — PASS
- Mobile: `1fr` single column — PASS
- Mobile detail visibility toggled via CSS display (no animation) — backlog item

---

## Screens Not Changed in QA11 (No Regression Check Required)
- Dashboard, Jobs, Candidates, Company, Subscription, Settings
