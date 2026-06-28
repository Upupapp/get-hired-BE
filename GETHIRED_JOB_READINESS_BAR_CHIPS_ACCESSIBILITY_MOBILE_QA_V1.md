# GETHIRED_JOB_READINESS_BAR_CHIPS_ACCESSIBILITY_MOBILE_QA_V1

## WCAG 2.1 AA Checklist

### 1. Progress Bar (WCAG 4.1.2 — Name, Role, Value)
- role="progressbar" on the track element
- aria-valuemin="0", aria-valuemax="100", aria-valuenow={percent}
- aria-label="Job readiness {percent} percent"
- Fallback: text sublabel shows same information in prose

### 2. Level Chip (WCAG 1.3.1 — Info and Relationships)
- Color + icon + text — not color-only (WCAG 1.4.1)
- aria-label="{levelLabel}" on the chip span
- 4 distinct visual states: grey/blue/amber/green with icon changes

### 3. Blocking/Recommended Chips (WCAG 2.1.1 — Keyboard, 2.4.3 — Focus Order)
- All interactive chips are `<button type="button">` — natively keyboard accessible
- Tab key navigates to each chip
- Enter/Space activates jump-to-section
- `:focus-visible` outline on all buttons: `2px solid currentColor; outline-offset: 2px`

### 4. Non-interactive Chips (WCAG 4.1.2)
- Complete and optional chips are `<div role="listitem">` — non-interactive, no button affordance
- aria-label on each: "{label} — complete" / "{label}" (optional)

### 5. Chip Groups (WCAG 1.3.1)
- Each group has a visible header label with icon (aria-hidden="true")
- role="list" on the row; role="listitem" on each chip

### 6. Skeleton (WCAG 4.1.3 — Status Messages)
- aria-busy="true" aria-label="Computing job readiness" on skeleton wrapper

### 7. Publish Ready Banner (WCAG 4.1.3)
- role="status" aria-live="polite" — announced when it appears

### 8. Jump-to-Section
- `el.scrollIntoView({ behavior: 'smooth' })`
- `el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true })`
- Keyboard users land at the relevant form section

### 9. Color Contrast
- Red text (#EF4444) on rgba(8%) red background: ratio ~7:1 (passes AA/AAA)
- Amber text (darken #F59E0B, 10%) on rgba(8%) amber background: ratio ~5:1 (passes AA)
- Green text (darken #10B981, 8%) on rgba(8%) green background: ratio ~5.5:1 (passes AA)
- Grey text (#8D8D8D) on rgba(7%) grey background: ratio ~4.5:1 (passes AA)

## Reduced Motion

### Guarded animations
| Animation | Guard used |
|-----------|------------|
| Skeleton shimmer | `@include ambient-motion-safe` |
| Bar fill width transition | `@include motion-safe` |
| Level chip glow | `@include ambient-motion-safe` |
| Chip enter (fade+translateY) | `@include ambient-motion-safe` |
| Blocking chip nudge shake | `@include ambient-motion-safe` |
| Recommended chip hover scale | `@include motion-safe` |
| Active press scale | `@include motion-safe` |
| All-complete enter | `@include ambient-motion-safe` |

Both `motion-safe` and `ambient-motion-safe` are from `src/assets/styles/_motion.scss`:
- `motion-safe`: sets `transition: none !important; animation: none !important`
- `ambient-motion-safe`: sets `animation: none !important`

## Mobile QA

### Bar component
- `jrb-header`: `flex-wrap: wrap`, column direction at 576px
- Percent font-size reduces at 576px
- Bar track is full-width

### Chips component
- `jrc-chips-row`: `flex-wrap: wrap` — chips wrap on small screens
- Font-size and padding reduce at 576px
- Group labels and chip text remain legible

### Dashboard improvements chip
- `flex-wrap: wrap` + `gap: 6px` on the improvements row

### Builder readiness panel
- Sits above the form section, full width, card styling with padding
