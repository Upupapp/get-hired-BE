# GETHIRED MOBILEVIEW — FIX LOG V6
**Date:** 2026-07-01 | **Safe fixes only (CSS/SCSS layout, touch targets, overflow)**

---

## Fix Summary

| ID | Severity | File | Change | WCAG / Standard |
|---|---|---|---|---|
| MV6-F1 | MEDIUM | employer-company-setup-success-modal.component.scss | `overflow-wrap: break-word; word-break: break-word` on `.gh-setup-modal__company-name` | Prevents overflow on 320px |
| MV6-F2 | HIGH | employer-company-setup-success-modal.component.scss | `min-height: 44px; display: inline-flex; align-items: center` on `.gh-setup-modal__dashboard-link` | WCAG 2.5.5 touch target |
| MV6-F3 | MEDIUM | styles.scss | `app-linkedin-button { width: 100%; display: block; }` inside `.gh-google-btn-row` | Layout consistency |
| MV6-F4 | LOW | linkedin-complete.component.scss | `@media (max-width: 375px) { padding: 40px 24px; }` on `.li-complete-card` | 320px breathing room |
| MV6-F5 | MEDIUM | styles.scss + employer-settings.component.ts | `.gh-bottom-sheet-pane` CSS rule + `panelClass` array in dialog opener | `:has()` browser compat fallback |

---

## Detailed Fix Records

### MV6-F1 — Company name overflow-wrap
**File:** `src/app/employer-panel/employer-settings/employer-company-setup-success-modal/employer-company-setup-success-modal.component.scss`
**Line:** After `.gh-setup-modal__company-name { color: $gh-azure; }`
**Change:**
```scss
.gh-setup-modal__company-name {
  color: $gh-azure;
  // MV6-F1: Long company names (30+ chars) can overflow at 320px.
  overflow-wrap: break-word;
  word-break: break-word;
}
```
**Why:** "Tech Innovations Group Ltd" (26 chars) at 20px bold on 280px content area (320px - 20px padding * 2) would overflow without break-word. The `overflow-wrap` property is well-supported and safe.
**Risk:** None. Purely additive.

---

### MV6-F2 — Dashboard link touch target
**File:** `src/app/employer-panel/employer-settings/employer-company-setup-success-modal/employer-company-setup-success-modal.component.scss`
**Line:** `.gh-setup-modal__dashboard-link` block
**Change:** Added `min-height: 44px; display: inline-flex; align-items: center;`
**Before:** `padding: 4px 0` + `font-size: 13px` ≈ 8px + ~20px line-height = ~28px
**After:** `min-height: 44px` forces minimum 44px regardless of line-height
**Why:** WCAG 2.5.5 requires all interactive controls to have a minimum target size of 44×44px. "Go to dashboard" is a button that navigates users away from the modal — it must be easily tappable.
**Risk:** None. The `inline-flex + align-items: center` maintains text vertical alignment; footer layout unchanged.

---

### MV6-F3 — LinkedIn button full-width in auth row
**File:** `src/styles.scss`
**Line:** Inside `.gh-google-btn-row` block
**Change:**
```scss
app-linkedin-button {
  width: 100%;
  display: block;
}
```
**Why:** The `.gh-google-btn-row` container already sets `app-google-signin-button { width: 100%; display: block; }` but was missing the equivalent for `app-linkedin-button`. Without it, the Angular custom element host defaults to `display: inline`, and the `--full` modifier's `max-width: 400px` would center within the row rather than filling it.
**Risk:** None. Matches the existing pattern for the Google button.

---

### MV6-F4 — LinkedIn complete card padding at 375px
**File:** `src/app/auth/linkedin-complete/linkedin-complete.component.scss`
**Line:** After `.li-complete-card { ... }` block
**Change:**
```scss
@media (max-width: 375px) {
  padding: 40px 24px;
}
```
**Why:** The base `padding: 48px 40px` leaves only 240px content width at 320px. Reducing side padding to 24px at ≤375px gives 272px content width — more comfortable for long error messages like "Your LinkedIn account must have a verified email address."
**Risk:** None. Purely a spacing adjustment inside an existing block.

---

### MV6-F5 — :has() fallback for bottom-sheet modal
**File 1:** `src/styles.scss` — Added `.gh-bottom-sheet-pane` rule inside `@media (max-width: 560px)`:
```scss
.gh-bottom-sheet-pane {
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  max-width: 100% !important;
  width: 100% !important;
}
```
**File 2:** `src/app/employer-panel/employer-settings/employer-settings.component.ts` — Changed `panelClass`:
```typescript
// Before:
panelClass: 'gh-setup-success-dialog',
// After:
panelClass: ['gh-setup-success-dialog', 'gh-bottom-sheet-pane'],
```
**Why:** The existing `.cdk-overlay-pane:has(.gh-setup-success-dialog)` selector controls bottom-sheet behavior but `:has()` is not supported in Chrome <105, Firefox <103, Safari <15.4. Adding `gh-bottom-sheet-pane` directly as a `panelClass` on the CDK overlay pane element achieves the same bottom-sheet positioning without requiring `:has()`.
**Risk:** Low. The `panelClass` change is additive — `gh-setup-success-dialog` is still present for the MatDialog container styling. The `gh-bottom-sheet-pane` rule only activates at ≤560px so it has no effect on desktop.

---

## Files Changed

1. `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\employer-panel\employer-settings\employer-company-setup-success-modal\employer-company-setup-success-modal.component.scss` (MV6-F1, MV6-F2)
2. `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\styles.scss` (MV6-F3, MV6-F5 CSS)
3. `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\auth\linkedin-complete\linkedin-complete.component.scss` (MV6-F4)
4. `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\employer-panel\employer-settings\employer-settings.component.ts` (MV6-F5 TS)

**Total: 4 frontend files changed, 5 targeted fixes.**
