# GetHired — Application Completeness Badge Component Log V2

**Date:** 2026-06-24  
**Phase:** 6

---

## Component Created

**Selector:** `app-application-completeness-badge`  
**Path:** `src/app/shared/components/application-completeness-badge/`

### Files
- `application-completeness-badge.component.ts`
- `application-completeness-badge.component.html`
- `application-completeness-badge.component.scss`

### Inputs
| Input | Type | Default | Purpose |
|-------|------|---------|---------|
| level | string \| null | null | Completeness level from API |
| score | number \| null | null | 0–100 score from API |
| loading | boolean | false | True while batch request in-flight |
| compact | boolean | true | Reserved for size variant (currently always true) |

### States
1. **loading** — skeleton shimmer pill (90px wide, 20px height, `acb-shimmer` keyframe)
2. **unavailable** — grey "Unavailable" pill when level=null and score=null and not loading
3. **scored** — colored pill with level label + optional "· score%" separator

### Level → Color Mapping
| Level | BG | Text |
|-------|----|------|
| excellent | #e6faf7 | #04A08B (teal) |
| strong | #e6faf7 | #04A08B (teal) |
| basic | #fff7ed | #b45309 (dark amber) |
| incomplete | #fff1f0 | #FE6F61 (coral) |
| unavailable | #f3f4f6 | #9ca3af (grey) |

### "incomplete" → "Getting started" relabeling
Implemented in `displayLevel` getter. Consistent with pre-existing inline badge.

### Accessibility
- `aria-label` from `accessibleLabel` getter: "Application completeness: Strong, 82 percent"
- `role="status"` + `aria-label` on loading skeleton
- Text never color-only: label always accompanies pill

### Animation
- `@keyframes acb-shimmer` — 1.4s ambient shimmer, `@include ambient-motion-safe`
- `@keyframes acb-fadein` — 160ms opacity-only reveal, `@include motion-safe`
- Unique keyframe names prevent global collision

### Declaration
Added to `SharedModule` declarations + exports.
