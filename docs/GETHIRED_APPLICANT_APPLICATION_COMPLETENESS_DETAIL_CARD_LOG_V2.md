# GetHired — Application Completeness Detail Card Component Log V2

**Date:** 2026-06-24  
**Phase:** 7

---

## Component Created

**Selector:** `app-application-completeness-card`  
**Path:** `src/app/shared/components/application-completeness-card/`

### Files
- `application-completeness-card.component.ts`
- `application-completeness-card.component.html`
- `application-completeness-card.component.scss`

### Inputs / Outputs
| Name | Direction | Type | Purpose |
|------|-----------|------|---------|
| snapshot | Input | any \| null | Snapshot object from batch endpoint |
| loading | Input | boolean | True while batch in-flight |
| error | Input | boolean | True if batch errored |
| retryClick | Output | EventEmitter<void> | Emitted on "Try again" click |

### State Machine (5 states)
1. **loading** — 5-element skeleton (label, badge, progress, 2 lines)
2. **error** — coral left-border block with "Try again" button
3. **null snapshot** — soft italic unavailable message
4. **pre-deployment** (`!hasSnapshot`) — grey left-border note
5. **full view** (`hasSnapshot=true`) — score header + progress bar + tips + disclaimer

### Full View Sections
- Score label + percentage (`acdc-score-pct`) + badge (reuses `ApplicationCompletenessBadgeComponent`)
- Progress bar with `role="progressbar"` + aria-valuenow/min/max
- Positive state (teal block, inline SVG check, no CTA) when both missing arrays empty
- Required tips (amber block, `ul`, profile CTA)
- Recommended tips (blue block, `ul`, profile CTA)
- Disclaimer note + privacy note

### Progress Bar
- Fill: width driven by `[style.width.%]="snapshot.completenessScore"`
- Transition: `$motion-duration-meter-fill` (650ms) `$motion-ease-decelerate`
- Color by level: teal/amber/coral/grey
- `@include motion-safe` guards the transition

### Skeleton Keyframes
- `@keyframes acdc-shimmer` — unique name
- `@keyframes acdc-fadein` — card reveal (opacity + 4px translateY)

### sectionLabel() Method
Maps reason strings to section names for tip list display:
`work experience → Work Experience`, `education → Education`, etc.
CTA always routes to `/user/profile/edit` (no deep links exist).

### Accessibility
- Outer `role="region"` + `aria-label`
- Skeleton: `role="status"` + `aria-label`
- Progress bar: `role="progressbar"` + `aria-valuenow/min/max`
- CTA: `:focus-visible` ring (WCAG 2.4.7)
- Error retry button: `:focus-visible` ring
- `aria-hidden="true"` on decorative arrow in CTA

### Declaration
Added to `SharedModule` declarations + exports.
RouterModule added to SharedModule imports + exports to enable `routerLink` in template.
