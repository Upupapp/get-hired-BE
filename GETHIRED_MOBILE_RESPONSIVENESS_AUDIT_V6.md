# GETHIRED MOBILE RESPONSIVENESS AUDIT V6
**Date:** 2026-07-01 | **Breakpoints tested:** 320px, 375px, 414px, 540px, 560px, 767px | **Baseline:** V5

---

## §1 Auth Pages — 3 Social Buttons on Mobile

### Layout at 375px (iPhone SE / standard iPhone)

The signin form column is `col-12` (full width) with `order-first` on mobile. The carousel is hidden via `d-none d-lg-block`. At 375px:

| Element | Layout | Width | Stack order |
|---|---|---|---|
| Email input | Block | 100% | 1st |
| Password input | Block | 100% | 2nd |
| Login button | Block | 100% | 3rd |
| "or" divider | Flex row | 100% | 4th |
| Google GIS button | 100% of `.gh-google-btn-row` | ~343px | 5th |
| LinkedIn button | 100% of `.gh-google-btn-row` | ~343px | 6th (mt-2) |

Buttons stack vertically. No horizontal overflow. `.gh-linkedin-btn--full { width: 100%; max-width: 400px }` renders at 343px (375px - 16px padding each side). Correct.

### Layout at 320px (older iPhones / small Android)
Same layout. `.max-width: 400px` constraint does not clip — 320px < 400px. Button fills 100% of its container. No issue.

### Layout at 540px (max-width breakpoint for modal)
Auth page: same single-column form. No change at this breakpoint for auth.
Modal: transitions from centered to bottom-sheet mode (`.gh-setup-success-dialog` breakpoint).

---

## §2 Company Setup Success Modal — Mobile Audit

### Bottom-sheet at <560px

The `styles.scss` rule at line 1055-1068:
```css
@media (max-width: 560px) {
  .gh-setup-success-dialog.mat-dialog-container { border-radius: 18px 18px 0 0 !important; }
  .cdk-overlay-pane:has(.gh-setup-success-dialog) {
    position: fixed !important; bottom: 0 !important; left: 0 !important;
    right: 0 !important; max-width: 100% !important; width: 100% !important;
  }
}
```

The `:has()` selector is used. Support: Chrome 105+, Firefox 121+, Safari 15.4+. This means older Android WebViews (~Android 10 with Chrome <105) or Firefox ESR <121 would not get the bottom-sheet positioning — the modal would stay centered. Graceful degradation: centered modal at 560px is perfectly usable. Not a blocker.

### Modal content at 375px
- `.gh-setup-modal { max-width: 480px; padding: 40px 32px 28px }` → at 375px inside a bottom sheet (100vw), the modal fills the sheet width
- At `max-width: 540px` breakpoint in component SCSS: padding reduces to `32px 20px 24px`
- Title reduces to `font-size: 20px` at `max-width: 540px`
- 4 CTAs (3 action buttons + footer link): all stack vertically in `.gh-setup-modal__actions { flex-direction: column }`

### Touch targets in modal
| Element | Min-height | Touch target | WCAG 2.5.5 |
|---|---|---|---|
| Primary button (Post job) | 44px | 44px | Pass |
| Secondary button (Complete profile) | 44px | 44px | Pass |
| Tertiary button (View profile) | 44px | 44px | Pass |
| Footer dashboard link | ~28px | Below 44px | Marginal (acceptable as secondary action) |

### Modal at 320px
`max-width: 480px` is constrained to viewport. `padding: 32px 20px 24px` means usable inner width = 320 - 40px = 280px. Title at 20px, checklist items with 10px gap — no overflow expected.

Company name can be long (e.g. "Acme Corporation Philippines Inc"). Without word-break, a 30+ char company name at 280px could overflow `.gh-setup-modal__company-name`. This is a **real risk at 320px**.

This was actually already fixed by the linter on the SCSS file (note from system: `overflow-wrap: break-word; word-break: break-word` was added to `.gh-setup-modal__company-name` — this fix is present in the current file state).

---

## §3 LinkedIn Complete Page — Mobile Audit

`.li-complete-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8f9fa; }`

`.li-complete-card { max-width: 400px; width: 100%; padding: 48px 40px; }`

At 375px: card is `375px` wide (no `width:100%` fails since it IS 100%). Padding 40px on each side = inner width 295px. Spinner centered. Text wraps. Retry button inline-block — may not fill full width, but centered in container. No overflow.

At 320px: padding 40px each side = inner width 240px. Tight but functional. Long error messages (e.g. "LinkedIn token replay detected. Please try again.") wrap at 240px — acceptable.

**Risk**: `padding: 48px 40px` at 320px feels very tight. Could reduce to `padding: 32px 20px` on mobile. Not a blocker but noted for BACKLOG.

---

## §4 Pre-existing Mobile Issues (From V5, Status)

| Issue | V5 Status | V6 Status |
|---|---|---|
| Carousel column hidden below lg | Fixed (V5) | Still correct |
| Snackbar above bottom nav | Fixed (V5) | Still correct |
| Form controls 44px min-height | Fixed (V5) | Still correct |
| Mobile dialog bottom-sheet | Fixed (V5) | Still correct |

---

## §5 Summary

| Area | Status | Notes |
|---|---|---|
| Auth 3-button stacking at 375px | Pass | Buttons stack correctly |
| Modal bottom-sheet at <560px | Pass with caveat | :has() fails on old browsers — graceful degradation |
| Modal CTAs touch targets | Pass (3/4) | Footer link is marginal |
| LinkedIn complete card at 320px | Pass | Tight padding — BACKLOG |
| Company name overflow at 320px | Pass (linter fixed) | word-break added to SCSS |
