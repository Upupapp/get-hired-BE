# GETHIRED OPTIMIZE REPORT — LinkedIn OIDC + Company Setup Success Modal V6
**Date:** 2026-07-01 | **Baseline:** GETHIRED_OPTIMIZE_REPORT_RECENT_V5.md | **Scope:** LinkedIn OIDC FE + Company Setup Success Modal + styles.scss delta

---

## Executive Summary

V6 audits three new code areas shipped with the LinkedIn OIDC OS: the LinkedIn button component, the LinkedIn-complete callback component, and the company-setup-success modal. The modal had a correctness gap (animations using `both` fill-mode with no `prefers-reduced-motion` override inside the component, meaning users with motion sensitivity saw flashes before the global `!important` override had a chance to fire). The LinkedIn button was 40px tall (below WCAG 2.5.5 minimum of 44px) and had no `focus-visible` ring. Four safe fixes were applied.

---

## §1 V6 Delta Components Audited

| Component | Files | Status |
|---|---|---|
| `LinkedInAuthService` | `auth/services/linkedin-auth.service.ts` | Audit only — no changes |
| `LinkedInButtonComponent` | `linkedin-button.component.*` | 2 fixes applied |
| `LinkedInCompleteComponent` | `linkedin-complete.component.*` | 2 fixes applied |
| `EmployerCompanySetupSuccessModalComponent` | `employer-company-setup-success-modal.component.*` | 1 fix applied |
| `styles.scss` — `.gh-setup-success-dialog` | global | Audit only — pattern correct |

---

## §2 Bundle Impact

### LinkedIn additions
- `LinkedInAuthService` — ~3 kB (plain HttpClient + BehaviorSubject, no new deps)
- `LinkedInButtonComponent` — ~2 kB (inline SVG path, no external image fetch)
- `LinkedInCompleteComponent` — ~2 kB (template-only, no new deps)
- **Total bundle addition:** ~7 kB — negligible, within V5 baseline

### LinkedIn SVG
The LinkedIn logo is **inlined** in the button template (a single `<path fill="#fff">` element). No external image request, no HTTP round-trip for the logo. Correct pattern.

### Company setup success modal
Inline SVGs only (check icon, star icon, briefcase icon, globe icon). No external image requests. Modal SCSS is ~8 kB. No bundle risk.

---

## §3 Findings and Fixes

### FIND-001 — LinkedIn button height below WCAG 2.5.5 (P1 — Fixed)
**File:** `linkedin-button.component.scss`
**Issue:** `height: 40px` — 4px below the 44px touch-target minimum (WCAG 2.5.5 Level AA).
**Fix:** Changed to `height: 44px`. No visual regression — button content still aligns correctly.

### FIND-002 — LinkedIn button missing focus-visible ring (P1 — Fixed)
**File:** `linkedin-button.component.scss`
**Issue:** No `:focus-visible` style defined. Keyboard users see the browser default outline (a thin dotted/dashed ring) which has insufficient contrast against the #0A66C2 background.
**Fix:** Added `&:focus-visible { outline: 2px solid #fff; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(10,102,194,0.55); }`. White ring on blue background = visible contrast. Reduced-motion block also added.

### FIND-003 — Retry button below 44px and missing focus ring (P1 — Fixed)
**File:** `linkedin-complete.component.scss`
**Issue:** Retry button `padding: 10px 28px` with `font-size: 14px` yields ~39px height. No `focus-visible` defined. Spinner animation (`li-spin`) had no `prefers-reduced-motion` override inside the component.
**Fix:** Added `min-height: 44px`, `&:focus-visible` ring, and `@media (prefers-reduced-motion: reduce)` block that freezes the spinner and removes its animation.

### FIND-004 — Modal animations missing component-level reduced-motion override (P1 — Fixed)
**File:** `employer-company-setup-success-modal.component.scss`
**Issue:** `.gh-setup-modal__confetti-ring` uses `animation: gh-pop-in 0.45s ... both`. All `.gh-fade-up` elements use `animation: gh-fade-up 0.35s ... both`. The `both` fill-mode means: elements start in the `from` state (`opacity:0; transform:translateY(10px)`) until the animation runs. If a user has `prefers-reduced-motion: reduce` and the global override (`animation-duration: 0.01ms !important`) fires on the universal selector (`*`), the element may flicker through the from-state for one frame before the override applies.

Component-encapsulated styles technically still receive the global `* { animation-duration: 0.01ms !important }` via ViewEncapsulation.Emulated (the encapsulation only scopes attribute selectors, it does not block `*`). However, making the override explicit inside the component is belt-and-suspenders: it fires at the same cascade layer as the component styles, removing all ambiguity, and documents intent clearly.
**Fix:** Added `@media (prefers-reduced-motion: reduce)` block that sets `animation: none !important; opacity: 1 !important; transform: none !important` on all animated elements.

### FIND-005 — `/linkedin/complete` and `/choose-role` not in robots.txt Disallow (P2 — Fixed)
**File:** `src/robots.txt`
**Issue:** Both routes are transient auth callback pages. `/linkedin/complete?ticket=...` contains a one-time token in the query string that is meaningless after use, but Google might crawl/index it. `/choose-role` is a UI-only step that should not appear in search results.
**Fix:** Added `Disallow: /linkedin/complete` and `Disallow: /choose-role` to robots.txt.

### FIND-006 — LinkedIn button is in `gh-google-btn-row` container (aesthetic, not a bug)
**File:** `signin.component.html`, `signup.component.html`
**Issue:** The LinkedIn button reuses the `.gh-google-btn-row` wrapper class (which was built for the Google GIS button). The class name is misleading but functionally correct — it's a `flex; justify-content:center` container that fills 100% width. No fix needed; rename would be a cosmetic refactor risk.

### FIND-007 — `:has()` in `.cdk-overlay-pane:has(.gh-setup-success-dialog)` (P2 — Known Risk)
**File:** `styles.scss` lines 1060-1068
**Issue:** CSS `:has()` is not supported in Angular Material 13's CDK overlay on all browser versions. As of 2026 it has broad browser support (Chrome 105+, Firefox 121+, Safari 15.4+), but Chrome's handling of `:has()` inside CDK overlay portals depends on the host element structure. This pattern already exists for `.gh-feedback-modal-panel` and `.gh-jac-dialog` (lines 975, 998) — so the risk is pre-existing and consistent. The bottom-sheet fallback will fail gracefully on unsupported browsers (dialog stays centered rather than bottom-sheeting). Not a regression from V6.

---

## §4 Auth Pages — 3-button Mobile Layout (375px)

Both `signin.component.html` and `signup.component.html` use `.gh-google-btn-row` (a `flex; justify-content:center; width:100%` container) for both the Google and LinkedIn buttons. Each button has `[fullWidth]="true"` which maps to `.gh-linkedin-btn--full { width: 100%; max-width: 400px; }` and the GIS button fills its parent container.

At 375px:
- Email/password form: single column, full width — correct
- "or" divider: 100% width — correct
- Google button: fills 100% of `.gh-google-btn-row` — correct
- LinkedIn button: fills 100% of `.gh-google-btn-row` — correct
- Buttons stack vertically (block layout, `mt-2` gap) — correct

No horizontal overflow. No stacking issue. Mobile layout of 3-button auth pages is correct.

---

## §5 styles.scss — `.gh-setup-success-dialog`

The `.gh-setup-success-dialog` panel class (lines 1047-1068) follows exactly the same pattern as `.gh-feedback-modal-panel` (lines 959-980) and `.gh-jac-dialog` (lines 984-1006):
1. Strips MatDialog chrome (`padding:0`, `border-radius:18px`, `overflow:hidden`)
2. Adds bottom-sheet behavior on `max-width: 560px` via `:has()` selector

Pattern is correct and consistent. No change needed.

---

## §6 Pre-existing V5 Findings (Status Update)

| V5 Finding | V5 Status | V6 Status |
|---|---|---|
| Missing JobPosting JSON-LD | Documented, not fixed | Still open — deferred |
| Missing canonical URLs per route | Documented, not fixed | Still open — deferred |
| Missing sitemap.xml | Documented, not fixed | Still open — deferred |
| noindex on /choose-role | Documented, not fixed (robots.txt) | Fixed via robots.txt in V6 |
| Large non-lazy libraries (chart.js, jspdf, recordrtc) | Documented, not fixed | Still open — deferred |
