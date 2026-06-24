# GetHired — Application Completeness: Techy Visual System Log V2

**Date:** 2026-06-24

---

## 1. Design Language

GetHired uses a "Techy" visual language established in the BRAND command:
- Coral accent: `$color-global-red` (#FE6F61), `$color-global-red-buttons` (#FF7062)
- Green success: `$color-green-secondary` (#04A08B) — used for teal/excellent
- Sharp corners → `border-radius: 6-10px` for cards; `999px` for pills/chips
- Card shadows: `border: 1px solid rgba(0,0,0,0.06)` — subtle, no heavy shadows
- Motion: decelerate easing, card duration 220ms, shimmer 1.4s ambient

---

## 2. Badge Component Styling

### Pill shape
- `border-radius: 999px`
- `padding: 2px 10px`
- `font-size: 11px; font-weight: 600`
- Letter spacing: `0.04em`
- Display: `inline-flex; align-items: center; gap: 4px`

### Colors (CSS custom properties via classes, not Bootstrap)
- `.acb-level--excellent, .acb-level--strong`: `background: #e6faf7; color: #04A08B`
- `.acb-level--basic`: `background: #fff7ed; color: #b45309` (dark amber for contrast)
- `.acb-level--incomplete`: `background: #fff1f0; color: #FE6F61`
- `.acb-level--unavailable`: `background: #f3f4f6; color: #9ca3af`

### Skeleton
- `@keyframes acb-shimmer` (unique name, avoids gh-app-shimmer collision)
- `width: 90px; height: 22px; border-radius: 999px`
- `@include ambient-motion-safe`

### Reveal
- `@keyframes acb-fadein` (unique name)
- `from: opacity 0; to: opacity 1`  
- Duration: `$motion-duration-micro` (160ms) — faster than card, appropriate for chip
- `@include motion-safe`

---

## 3. Card Component Styling

### Progress Bar
- Container: `height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden`
- Fill: dynamic width via `[style.width.%]="snapshot.completenessScore"`
- Fill color: matches level (teal/amber/coral based on level)
- Transition: `width $motion-duration-meter-fill $motion-ease-decelerate`
- `@include motion-safe`

### Section blocks
- Required (amber): `background: #fff7ed; border-left: 3px solid #f59e0b`
- Recommended (sky): `background: #f0f9ff; border-left: 3px solid #38bdf8`
- Positive (teal): `background: #e6faf7; border-left: 3px solid #04A08B`
- Pre-deployment (grey): `background: #f9fafb; border-left: 3px solid #e5e7eb`
- Error: `background: #fff1f0; border-left: 3px solid #FE6F61`

### Card skeleton
- `@keyframes acdc-shimmer` (unique name for card skeleton — `acdc` = "app completeness detail card")
- Three shimmer elements: label line (60%), badge pill (90px), progress bar (100%)
- `@include ambient-motion-safe`

### Card reveal
- `@keyframes acdc-fadein`
- `from: opacity 0, translateY(4px); to: opacity 1, translateY(0)`
- Duration: `$motion-duration-card` (220ms)
- `@include motion-safe`

---

## 4. @keyframes Name Registry (this session)

| Name | Component | Purpose |
|------|-----------|---------|
| gh-app-shimmer | applicant-applications.component | List skeleton shimmer (pre-existing) |
| app-snapshot-fadein | applicant-applications.component | Score reveal (pre-existing) |
| acb-shimmer | application-completeness-badge | Badge loading shimmer (NEW) |
| acb-fadein | application-completeness-badge | Badge reveal (NEW) |
| acdc-shimmer | application-completeness-card | Card skeleton shimmer (NEW) |
| acdc-fadein | application-completeness-card | Card content reveal (NEW) |

All names are scoped — no global collision risk.

---

## 5. Icon Strategy

No external icon library exists in this project. Inline SVG icons are used:
- Check circle (positive state): inline SVG, `currentColor`, 16x16
- No other icons needed for MVP
- Section icons for tip list items: not in MVP (text-only list, same as existing)
