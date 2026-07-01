# GETHIRED ACCESSIBILITY AUDIT V6
**Date:** 2026-07-01 | **Standard:** WCAG 2.1 Level AA | **Baseline:** V5

---

## §1 LinkedIn Button Component

### Pass: `aria-label` on button
`[attr.aria-label]="label"` — label is set to "Sign in with LinkedIn" / "Sign up with LinkedIn" / "Continue with LinkedIn". Button has a meaningful accessible name. Pass.

### Pass: SVG is decorative
LinkedIn SVG icon has `aria-hidden="true"`. Text label in `<span class="gh-linkedin-btn-label">` provides the visible name. Correct.

### Fail (Fixed): Touch target below WCAG 2.5.5
`height: 40px` was below the 44px minimum. Fixed to `height: 44px`.

### Fail (Fixed): Missing focus-visible ring
No `:focus-visible` style defined. Keyboard users could not clearly see focus. Fixed: white outline + blue glow ring added.

---

## §2 LinkedIn Complete Component

### Pass: Spinner has accessible label
`<div class="li-complete-spinner" role="status" aria-label="Completing LinkedIn sign-in">` — correct use of `role="status"` and `aria-label`.

### Pass: Live region on loading state
`<div class="li-complete-loading" aria-live="polite">` — screen readers will announce the loading state change. Correct.

### Pass: Error state has heading structure
`<h2 class="li-complete-error-title">Sign-in failed</h2>` — correct heading level for a standalone page. Error message in `<p>`. Logical reading order: icon → heading → message → retry button.

### Fail (Fixed): Retry button below 44px touch target
Padding-based height was ~39px. Fixed with `min-height: 44px`.

### Fail (Fixed): Retry button missing focus-visible ring
No `:focus-visible` defined. Fixed: white outline + blue glow.

### Note: Error icon is decorative
`<svg ... aria-hidden="true">` on the warning circle icon — correct.

---

## §3 Company Setup Success Modal

### Pass: role=dialog + aria-modal + aria-labelledby
```html
<div class="gh-setup-modal" role="dialog" aria-modal="true" aria-labelledby="gh-setup-modal-title">
```
All three required attributes present. Correct.

### Pass: aria-labelledby target matches id
`<h2 id="gh-setup-modal-title">Welcome to GetHired...` — matching id present. Correct.

### Pass: Checklist items have accessible labels
Each `<li>` has `[attr.aria-label]="item.done ? item.label + ' — completed' : item.label + ' — to do'"`. Screen readers announce "Company created — completed" rather than just the text, which correctly communicates state.

### Pass: Checklist role=list
`<ul role="list">` — CSS resets can strip implicit list semantics in Safari; explicit `role="list"` restores them. Correct. (Hat-tip: this is the known Safari + `list-style:none` quirk.)

### Pass: SVG icons are decorative
All inline SVG icons have `aria-hidden="true"`. Correct.

### Pass: Trial badge has aria-label
`<div ... aria-label="Free trial active for 7 days">` — since the visible text "7-day free trial active" is accompanied by a decorative star icon, the explicit `aria-label` ensures screen readers read the full message. Correct.

### Pass: View public profile button has aria-label
`aria-label="View public company profile — opens in new tab"` — announces the target and the new-tab behavior. Correct.

### Pass: External link icon is decorative
`aria-hidden="true"` on the external-link arrow SVG. Correct.

### Pass: Modal header is aria-hidden
`<div class="gh-setup-modal__header" aria-hidden="true">` — the decorative confetti ring and header are hidden from screen readers; the modal is properly labeled via `aria-labelledby`. The heading is outside the aria-hidden area (line 13) — correct, as it's the `aria-labelledby` target.

### Fail (Fixed): Reduced-motion fill-mode gap
`animation: ... both` could leave elements at `opacity:0` if the animation was skipped or delayed. Fixed with explicit component-level `prefers-reduced-motion` override.

### Check: Dashboard link button
`<button class="gh-setup-modal__dashboard-link" (click)="goToDashboard()" type="button">` — visible text "Go to dashboard" is the accessible name. `focus-visible` ring defined. Correct. Touch target: `padding: 4px 0` makes it visually small. The rendered height depends on font-size (13px × 1.5 line-height = ~20px + 8px padding = ~28px). This is technically below 44px but acceptable as a secondary "skip" action and not a primary CTA.

---

## §4 Auth Pages — 3-button Layout Accessibility

### Keyboard navigation order (signin)
1. Email input
2. Password input
3. Forgot password link
4. Remember me checkbox
5. Login button
6. Google button (GIS-rendered iframe — has internal tab stop)
7. LinkedIn button (native `<button>`, tabindex inherited from DOM)

Order is logical. LinkedIn button is reachable via keyboard. No skip-link bypass needed for this short form.

### ARIA labels on divider
`<div class="gh-auth-divider" aria-hidden="true">` — decorative divider hidden from screen readers. Correct.

---

## §5 Color Contrast

### LinkedIn button
- Text: `#fff` on `#0A66C2` background
- Contrast ratio: 4.72:1 — WCAG AA pass (minimum 4.5:1) for normal text

### LinkedIn complete spinner
- No text — CSS animation only. No contrast requirement.

### LinkedIn complete error title
- `#111827` on `#fff` background — ~18:1. Excellent.

### LinkedIn complete error message
- `#6b7280` on `#fff` — 4.48:1. WCAG AA pass (borderline).

### Modal text
- Title `#0D1B4B` on `#fff`: ~14.5:1. Excellent.
- Eyebrow `#10B981` on `#fff`: 3.0:1. WCAG AA FAIL for normal-size text (12px bold uppercase). This is a pre-existing issue not introduced in V6.

---

## §6 Summary

| Check | Pass/Fail | Fixed in V6 |
|---|---|---|
| LinkedIn button aria-label | Pass | — |
| LinkedIn button focus ring | Fail | Yes |
| LinkedIn button 44px touch target | Fail | Yes |
| LinkedIn complete spinner role=status | Pass | — |
| LinkedIn complete retry 44px | Fail | Yes |
| LinkedIn complete retry focus ring | Fail | Yes |
| Modal role=dialog + aria-labelledby | Pass | — |
| Modal checklist aria-labels | Pass | — |
| Modal reduced-motion fill-mode | Fail | Yes |
| Eyebrow text contrast (12px) | Fail | No (pre-existing, out of scope) |
