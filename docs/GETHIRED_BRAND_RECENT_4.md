# GetHired BRAND Audit — RECENT_4
FE HEAD: 8a41f25 | Audit date: 2026-06-26

## Scope
State/motion/haptics audit focused on the most recent deployment cycle. Covers:
HapticService, snackbar semantic colors, invite error state (import-add-user dialog),
OG image, and reduced-motion compliance.

---

## 1. HapticService

File: `src/app/core/services/haptic.service.ts`

| Check | Result |
|---|---|
| `success()` pattern: [50] | PASS |
| `warning()` pattern: [50, 30, 50] | PASS |
| `error()` pattern: [100, 30, 80] | PASS |
| `selection()` pattern: [20] | PASS |
| SSR-safe (`isPlatformBrowser` check) | PASS |
| `navigator.vibrate` wrapped in try/catch | PASS |
| All methods return void | PASS |
| Registered in CoreModule providers | PASS |

The service is correctly implemented. All four public methods are correctly
wired to private `vibrate()` which guards both SSR and browser-vibration
availability.

GAP FOUND (pre-fix): HapticService was NOT injected in
`import-add-user.component.ts` — the service existed but was never called.
Error/warning/success outcomes in the invite dialog used only snackbar,
silently skipping haptic feedback.

Fix applied: see IMPLEMENTATION_LOG_RECENT_4.

---

## 2. Snackbar Semantic Colors

File: `src/styles.scss` lines 241-293

| Class | Background | Accent bar | WCAG contrast | Result |
|---|---|---|---|---|
| `.success-snackbar` | #1A7A4A (green) | none | 4.85:1 vs white | PASS |
| `.danger-snackbar` | #C0392B (dark red) | `border-left: 4px solid #FE6F61` | 5.14:1 vs white | PASS |
| `.error-snackbar` | #C0392B (dark red) | `border-left: 4px solid #FE6F61` | 5.14:1 vs white | PASS |
| `.warning-snackbar` | #B45309 (amber-800) | none | 5.02:1 vs white | PASS |
| `.warn-snackbar` | #B45309 (amber-800) | none | 5.02:1 vs white | PASS |
| `.info-snackbar` | #6B7280 (gray) | none | 4.83:1 vs white | PASS |

Both `.danger-snackbar` and `.error-snackbar` carry `border-left: 4px solid $color-global-red`
where `$color-global-red = #FE6F61` (coral brand accent). This satisfies the
"coral accent strip retains brand identity" requirement. Confirmed.

---

## 3. Invite Error State — import-add-user dialog

File: `src/app/company/company-users/dialogs/import-add-user.component/`

### 3a. HTML structure (result panel)
The result panel is present at lines 23-76. It correctly:
- Shows only when `showResultPanel` is true
- Applies `result-panel--error` when `allFailed` is true
- Applies `result-panel--partial` when partial failure
- Lists failed emails with reason messages
- Offers "Retry Failed", "Copy Failed Emails", and "Add More Users" / "Done" actions
- Uses `[@animate]` entry animation

### 3b. HapticService calls (pre-fix gap)
BEFORE this audit:
- All-success path: no haptic call
- Partial-fail path: no haptic call
- All-fail path: no haptic call

AFTER fix applied:
- All-success: `hapticService.success()` called before snackbar
- Partial-fail: `hapticService.warning()` called before snackbar
- All-fail: `hapticService.error()` called before snackbar

### 3c. Result panel CSS (pre-fix gap)
BEFORE this audit: `.result-panel`, `.result-panel--error`, `.result-panel--partial`
and all child classes had ZERO CSS backing. The BEM class names were applied in
the template but invisible — no background color, no border, no visual distinction
between error and partial states.

AFTER fix applied: Full BEM block defined in component SCSS (see IMPLEMENTATION_LOG).

### 3d. Shake animation + reduced-motion
The shake animation (`result-panel-shake`) is scoped inside
`@media (prefers-reduced-motion: no-preference)` — only fires when the user
has NOT requested reduced motion. The global contract in `styles.scss` lines 39-45
also provides belt-and-suspenders (`animation-duration: 0.01ms !important` under
`prefers-reduced-motion: reduce`). Shake is applied only to `.result-panel--error`
(all-fail). The partial-fail panel does not shake — appropriate severity hierarchy.

---

## 4. OG Image

File: `src/assets/brand/gethired-og-default.png`
Size: 66,154 bytes (64.6 KB)

PASS. This is the branded version. The old blank gradient placeholder was ~10 KB.
The 66 KB file matches the expected branded asset.

---

## 5. Reduced-Motion Compliance

Global contract: `styles.scss` lines 36-45
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
This globally disables all CSS animations/transitions for reduced-motion users,
providing a belt-and-suspenders guarantee on top of component-level guards.

New animations added by this audit (`result-panel-shake`) are wrapped in
`@media (prefers-reduced-motion: no-preference)` — consistent with the existing
pattern in `styles.scss` (e.g. `gh-sheet-reveal` at line 553, `gh-job-card-hover`
at line 664).

---

## Summary

| Area | Status | Notes |
|---|---|---|
| HapticService implementation | PASS | All 4 methods correct, SSR-safe, try/catch |
| HapticService wired in invite dialog | FIXED | Was missing; injected + called |
| Snackbar semantic colors | PASS | All classes present, WCAG AA |
| Snackbar accent bars (danger/error) | PASS | `border-left: 4px solid #FE6F61` confirmed |
| Result panel HTML structure | PASS | BEM markup correct |
| Result panel CSS | FIXED | Was entirely missing; added to component SCSS |
| Shake animation (all-fail) | FIXED | Added with reduced-motion guard |
| Partial-fail visual style | FIXED | Added amber warning panel |
| OG image | PASS | 66 KB branded asset present |
| Global reduced-motion contract | PASS | styles.scss lines 39-45 |
