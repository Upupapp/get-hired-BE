# GETHIRED_SEARCH_EMPTY_STATE_SPEC_V1
_Generated: 2026-06-28 | Component: SearchEmptyStateComponent_

## Trigger conditions

| State | When shown |
|---|---|
| Empty results | `!searchLoading && !searchError && searchResults.length === 0` |
| Error | `!searchLoading && searchError` — separate error state above results area |

## Empty state content

### With query (`query` input is non-empty)
**Illustration:** floating SVG magnifying glass (3s ease-in-out loop, disabled for `prefers-reduced-motion`)
**Heading:** `No results for "{{query}}"`
**Body:** `Try different keywords, or check for typos. Philippine job market tip: try abbreviations like "WFH", "CSR", or "VA".`
**Actions:**
1. "Clear filters" button (primary coral) — emits `clearFilters` output. Only shown if `hasFilters`.
2. "Browse all jobs" button (secondary purple) — emits `browseAll` output.

### Without query (filter-only search)
**Heading:** `No jobs match these filters`
**Body:** `Try removing some filters to see more results.`
**Actions:** Same buttons.

### CV Doctor link (always)
At bottom: `Having trouble finding the right fit? Try CV Doctor →` (links to `/applicant/cv-doctor`)

## Outputs
| Output | Emitted when |
|---|---|
| `(clearFilters)` | User clicks "Clear filters" |
| `(browseAll)` | User clicks "Browse all jobs" |

## Error state (in PublicListComponent, not in empty-state component)
```
Search is temporarily unavailable. Please try again in a moment.
[Try again]  ← calls onSearchSubmit(activeQuery)
```
Error state uses `role="alert"` — announced immediately to screen readers.

## Loading state
`SearchSkeletonComponent` renders 5 (default) shimmer placeholders while `searchLoading = true`. Each placeholder mimics the exact card dimensions to prevent layout shift.
