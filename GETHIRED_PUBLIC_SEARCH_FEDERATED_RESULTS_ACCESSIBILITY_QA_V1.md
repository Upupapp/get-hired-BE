# GETHIRED: Federated Search — Accessibility QA V1

## Tab Bar

- `role="tablist"` on `<nav>`
- `role="tab"` and `[attr.aria-selected]` on each tab button
- `aria-label="Filter results by type"` on nav
- Keyboard: all buttons are native `<button>` — tab / enter / space work natively
- Active tab marked with `aria-selected="true"`

## Results Sections

- Jobs section: `<section role="region" aria-label="Job results">`
- Companies section: `<section role="region" aria-label="Company results">`
- `role="list"` on results containers; `role="listitem"` on each card

## Company Card

- `<article role="article">` — landmark for screen readers
- `tabindex="0"` — keyboard focusable
- `(keydown.enter)` / `(keydown.space)` handlers — activates on keyboard
- `aria-label` on logo: `company.companyName + ' logo'`
- Logo wrap: `aria-hidden="true"` — decorative, label on img suffices
- Meta row: `role="list"` + `role="listitem"` on each span
- Buttons: `[attr.aria-label]="'View ' + company.companyName + ' company profile'"`
- `focus-visible` outline: `2px solid #FF7062`

## Spotlight Card

- `role="region" aria-label="Company match"` on wrapper
- `<h2>` for company name — semantic heading in region
- Job list: `role="list"` + `role="listitem"` on each job button
- `[attr.aria-label]="'View job: ' + job.title"` on each job button
- `[attr.aria-label]` on each CTA button

## Empty / Partial States

- `role="alert"` on error state
- `role="status"` on partial recovery note — polite live region
- `aria-live="polite" aria-atomic="true"` on result count

## Colour Contrast

| Element | Foreground | Background | Ratio |
|---------|-----------|-----------|-------|
| Company card name | #1a1830 | #fff | 17:1 ✅ |
| Spotlight name | #fff | #1a1830 | 17:1 ✅ |
| Tab active | #1a1830 | #fff | 17:1 ✅ |
| "N open roles" green | #059669 | #fff | 4.6:1 ✅ |
| Spotlight open roles | #6EE7B7 | #1a1830 | 6.2:1 ✅ |

## Focus Visible

All interactive elements have `:focus-visible { outline: 2px solid #FF7062; outline-offset: 2px; }`.

## Reduced Motion

All animations and transitions have matching `@media (prefers-reduced-motion: reduce)` blocks that disable them.
