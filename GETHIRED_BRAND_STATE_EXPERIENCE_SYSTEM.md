# GETHIRED_BRAND_STATE_EXPERIENCE_SYSTEM.md
## BRAND QA Cycle 11 — State Experience System
_Generated: 2026-06-25_

---

## State Coverage Matrix

| Component | Loading | Error+Retry | Empty+CTAs | Content | Offline |
|---|---|---|---|---|---|
| Interview Hub | PASS — skeleton | PASS — retry btn + back-to-dash | PASS — icon + h2 + body + 2 CTAs | PASS — filter chips + card list | NOT PRESENT (acceptable) |
| Messages Inbox | PASS — skeleton rows | PASS — retry + back-to-dash | PASS — global empty + filter empty | PASS — thread list + detail | NOT PRESENT (acceptable) |
| Employer Panel shell | PASS — `<app-loading>` | PASS — `.gh-fallback-page` | n/a | PASS | n/a |

## State Transition Rules Applied

- **Loading → Content**: `*ngIf="loading"` → `*ngIf="!loading && !error && items.length > 0"` — CORRECT (mutual exclusion)
- **Loading → Error**: `*ngIf="!loading && error"` — CORRECT
- **Content → Empty**: `*ngIf="items.length === 0"` — CORRECT
- **Error retry**: Calls `loadHub()` / `retry()` which resets `loading=true` and `error=false` — CORRECT

## State Text Equivalents (Accessibility Requirement)

All animated states include text equivalents:
- Loading skeleton: `aria-busy="true"` + `aria-label="Loading interview activity"` (IH) / `"Loading messages"` (RM)
- Error: `role="alert"` — announced to screen readers on appearance
- Empty: heading + body text, no animation dependency
- Content: role="list" + role="listitem" on card list (IH); role="list" on thread list (RM)

## Gaps

1. **Interview Hub shimmer is visually no-op**: `.ih-skeleton-chip` and `.ih-skeleton-line` have `background: #e5e7eb` (solid) and animate `background-position`, but no gradient `background-image` is defined. Shimmer moves position of a non-existent gradient. See FIX-01.
2. **Messages skeleton** correctly uses `background: linear-gradient(90deg, ...)` — shimmer is functional.
3. No `aria-live` region for filter-empty states (Interview Hub: "No candidates match this filter", Messages: filter empty). These appear/disappear based on user action and should be announced. Acceptable risk under AA — user initiated the filter, so discovery is expected.
