# GETHIRED_JOB_READINESS_CHIPS_UI_LOG_V1

## Files Created
- `src/app/job/components/job-readiness-chips/job-readiness-chips.component.ts`
- `src/app/job/components/job-readiness-chips/job-readiness-chips.component.html`
- `src/app/job/components/job-readiness-chips/job-readiness-chips.component.scss`

## Chip Groups (in order)
1. Blocking chips (red) — "Required to publish"
2. Recommended chips (amber) — "Recommended improvements"
3. Complete chips (green) — "Complete"
4. Optional chips (grey) — "Optional for publishing"
5. All-complete banner (green) — when canPublish and no recommendations remaining

## Blocking Chips
- Color: #EF4444 (red) with rgba(8%) background
- Interactive: `<button>` element
- Behavior: click → `onChipClick()` → `jumpToSection.emit(sectionId)` + native scrollIntoView + focus
- Animations: enter (fade + translateY 200ms) + nudge shake (400ms, 250ms delay)
- All guarded with `@include ambient-motion-safe`
- aria-label: "{label} — required to publish. Click to go to this section."
- hover: scale(1.03), guarded motion-safe
- active: scale(0.97)

## Recommended Chips
- Color: #F59E0B amber
- Interactive: `<button>`, same scroll behavior as blocking
- Animation: enter only (no nudge)
- aria-label: "{label} — recommended. Click to go to this section."

## Complete Chips
- Color: #10B981 green
- NOT interactive (plain div with role="listitem")
- aria-label: "{label} — complete"
- Icon: bi-check2

## Optional Chips
- Color: #8D8D8D grey at 80% opacity
- NOT interactive
- Static list: video questions optional, brand details optional, certifications optional, benefits optional

## All-Complete Panel
- Shown when `canPublish && recommendationItems.length === 0`
- role="status" aria-live="polite"
- Enter animation: `jrc-chip-enter` 250ms

## Accessibility
- All interactive chips are `<button type="button">`
- All chip lists use `role="list"` container + `role="listitem"` on each chip
- Group labels use `aria-hidden="true"` (decorative labels alongside programmatic text)
- Jump-to-section: smooth scrolls, then sets tabindex="-1" + focuses the target element

## Performance
- `ChangeDetectionStrategy.OnPush`
- `trackBy: trackByKey` on ngFor

## Mobile
- chips-row uses `flex-wrap: wrap`
- Smaller padding/font-size at max-width 576px
