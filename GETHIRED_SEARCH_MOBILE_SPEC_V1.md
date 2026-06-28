# GETHIRED_SEARCH_MOBILE_SPEC_V1
_Generated: 2026-06-28_

## Breakpoints

| Breakpoint | Layout change |
|---|---|
| ≥ 768px (tablet+) | Controls row filters inline with sort |
| < 768px (mobile) | Controls row wraps, selects stack |
| < 640px | Result count hidden (saves space) |

## Search header (sticky)
- `position: sticky; top: 0; z-index: 100` — stays visible while scrolling.
- On mobile: full-width input.
- On desktop: constrained to `max-width: 760px; margin: 0 auto`.

## Autocomplete dropdown
- `position: absolute`, `width: 100%` — always full-width below input.
- `max-height: 360px; overflow-y: auto` — scrollable on mobile when many results.
- `min-width: 280px` — always readable.

## Touch targets
- All interactive elements: `min-height: 44px` (Apple HIG / WCAG 2.5.5 AAA recommendation).
- Chip remove button: `min-width: 22px; min-height: 22px` (small but surrounded by 8px chip padding — effective touch area ≥ 44px).

## Filter controls on mobile
- Selects have `min-height: 38px` — comfortable for thumb touch.
- Sort select uses `margin-left: auto` on desktop; drops to normal flow on mobile.

## Pagination on mobile
- Previous / Next buttons full-width below results on very small screens (not yet implemented — deferred to Phase 2 since "Next →" button wraps naturally in flex layout).

## Keyboard on mobile (virtual keyboard)
- Input has `type="search"` implicit behavior (shows "Search" on mobile keyboard return key).
- Autocomplete dropdown appears above keyboard on iOS if space is tight — relies on `position: absolute` within a non-overflow-hidden parent (standard browser behavior).

## Known mobile gap (backlog)
- Autocomplete dropdown on very small screens (<375px) may clip the submit button. Visual QA on iPhone SE (375px) should be performed in the next sprint.
