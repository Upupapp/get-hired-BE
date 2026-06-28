# GETHIRED_JOB_READINESS_BAR_UI_LOG_V1

## Files Created
- `src/app/job/components/job-readiness-bar/job-readiness-bar.component.ts`
- `src/app/job/components/job-readiness-bar/job-readiness-bar.component.html`
- `src/app/job/components/job-readiness-bar/job-readiness-bar.component.scss`

## Component Behavior
- Input: `result: JobReadinessResult | null`
- When result is null: shows skeleton shimmer (label + bar + sublabel)
- When result present: shows level chip, fill bar, sublabel, next action

## Skeleton
- 3 shimmer elements (label, bar, sub)
- `animation: jrb-shimmer` background gradient sweep
- Guard: `@include ambient-motion-safe` (no shimmer under reduced-motion)
- aria-busy="true" aria-label on skeleton wrapper

## Level Chip
- 4 states: draft (grey) / basic (blue) / strong (amber) / excellent (green)
- Icon + text — not color-only
- One-shot glow animation on level change (box-shadow keyframe, 0.5s)
- Guard: `@include ambient-motion-safe` on glow animation
- `aria-label` with full level label text

## Progress Bar
- CSS `width` transition 600ms ease-out
- Guard: `@include motion-safe` (no transition under reduced-motion)
- `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label`
- Fill color matches level class

## Sub-label
- "X required fields missing" when canPublish false
- "X of Y recommended sections complete" when canPublish true
- "All sections complete" when nothing remaining

## Next Best Action
- Shows first blocking item hint, or first recommended hint
- Icon + text, no external link, no AI copy

## Change Detection
`ChangeDetectionStrategy.OnPush` — only re-renders when `result` input reference changes.
Glow trigger uses `glowActive` boolean + setTimeout(0) for animation re-fire.

## Mobile
- Header row wraps on small screens (flex-wrap)
- Reduced font sizes at max-width 576px
