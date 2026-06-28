# GETHIRED_BRAND_BACKLOG.md
## BRAND QA Cycle 11 — Backlog
_Generated: 2026-06-25_

---

## Priority: MEDIUM (address in next BRAND cycle)

### RISK-01: Interview Hub Filter Chip — Active State Non-Color Differentiation
**File:** `recruiter-interview-hub.component.scss` (`.ih-filter-chip--active`)
**Issue:** Active filter chip uses background+border+color but no `font-weight` change or checkmark icon. Under BRAND rules, active state should have at least 2 independent visual axes beyond color.
**Fix:** Add `font-weight: 600` to `.ih-filter-chip--active` (currently `font-weight: 500` on base).
**Effort:** 1 line of SCSS

### RISK-07: Interview Hub Filter Chip — Contrast Ratio
**File:** `recruiter-interview-hub.component.scss`
**Issue:** Active chip shows `color: #fff` on `background: $color-blue-primary (#168DBD)`. Estimated contrast ratio ~3.7:1 — below WCAG AA 4.5:1 for small text.
**Fix options:**
1. Use `$color-blue-dark (#2E7A95)` as background — estimated ~4.8:1 (verify)
2. Use `font-weight: 700` (bold counts as large text at 14px+ — changes threshold to 3:1)
3. Use a darker background color
**Effort:** 1 SCSS change + contrast verification

---

## Priority: LOW (address in next consolidation cycle)

### RISK-04: Import Path Inconsistency for `_motion.scss`
**Issue:** 3 different import syntaxes across 3 components
**Fix:** Standardize all to `@import "src/assets/styles/_motion"` (absolute, with underscore)
**Files:** `recruiter-messages.component.scss` (change `~assets/styles/motion`), `employer-panel.component.scss` (change `src/assets/styles/motion`)
**Effort:** 2 line changes

### RISK-05: Duration Token Drift in Messages Inbox
**File:** `recruiter-messages.component.scss`
**Issue:** Uses hardcoded `140ms` (chip transition) and `120ms` (thread row transition) instead of `$motion-duration-micro` (160ms)
**Fix:** Replace with `$motion-duration-micro` or introduce `$motion-duration-fast: 120ms` if 120ms is intentional
**Effort:** 4 line changes

---

## Priority: ENHANCEMENT (future BRAND cycle)

### BACKLOG-E1: Interview Hub Filter Empty — Recovery CTA
**Issue:** "No candidates match this filter." has no way to clear the filter inline
**Fix:** Add a "Show all applicants" button to `.ih-filter-empty` that calls `setFilter('all')`
**Effort:** HTML + SCSS

### BACKLOG-E2: Interview Hub Empty State — Entry Animation
**Issue:** `.ih-empty` appears instantly while Messages `.rm-empty-state--reveal` has an entry animation
**Fix:** Add `animation: ih-fadein 280ms $motion-ease-decelerate both; @include motion-safe;` to `.ih-empty`
**Effort:** 2 SCSS lines

### BACKLOG-E3: Card List Entry Animation
**Issue:** Cards appear instantly when content loads; no staggered entry
**Fix:** Add `animation: ih-fadein Nms` with `animation-delay: N * 60ms` per card
**Note:** Requires Angular `*ngFor` with index and inline style binding
**Effort:** Medium (HTML + SCSS)

### BACKLOG-S1: Semantic Success Snackbar Color
**Issue:** `.success-snackbar` uses brand red (`$color-global-red-buttons`) — semantically an action color, not success green
**Fix:** Add `.success-snackbar--semantic { background-color: $color-green-secondary; }` and migrate callers
**Effort:** Medium (requires audit of all `success-snackbar` usages)

### BACKLOG-O1: Offline-Specific Error Copy
**Issue:** `navigator.onLine === false` shows same generic error as server errors
**Fix:** Check `navigator.onLine` in loadHub/retry before HTTP call; show tailored copy
**Effort:** Low–Medium per component

### BACKLOG-O2: Global Network Status Service
**Issue:** No app-wide offline detection
**Fix:** Create `NetworkStatusService` with `isOnline$` observable from `window.addEventListener('online'/'offline')`; add subtle banner in `employer-panel.component.html`
**Effort:** Medium

### BACKLOG-C1: Interview Hub Filter Empty CTA Copy
**Already covered by BACKLOG-E1**

### BACKLOG-C2: Replace Unicode Play Triangle with SVG
**File:** `recruiter-interview-hub.component.html`
**Issue:** `&#9654;` (play triangle) may render inconsistently across OS/font
**Fix:** Replace with inline SVG play icon
**Effort:** Low

### BACKLOG-C3: Replace Unicode Briefcase Emoji with SVG
**File:** `recruiter-interview-hub.component.html`
**Issue:** `&#128188;` (briefcase emoji) may render inconsistently
**Fix:** Replace with inline SVG briefcase icon matching existing nav icons
**Effort:** Low

### BACKLOG-M1: Mobile Detail Pane Slide Animation
**File:** `recruiter-messages.component.scss`
**Issue:** Mobile thread→detail transition is `display: none` swap (abrupt)
**Fix:** Add `transform: translateX(100%) → translateX(0)` CSS slide using Angular animation or class toggle
**Effort:** Medium

### BACKLOG-M2: Consolidate Reveal Keyframes
**Issue:** `ih-fadein`, `rm-page-reveal`, `rm-empty-reveal` are near-identical
**Fix:** Create global `@keyframes gh-reveal` in `_motion.scss` with consistent 8px Y offset; replace all 3
**Effort:** Low (SCSS change) + Medium (template/component updates)
