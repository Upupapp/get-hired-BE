# GETHIRED_SEARCH_ANALYTICS_PLAN_V1
_Generated: 2026-06-28_

## Current state
No search analytics are captured today. There is no event pipeline to track search queries, click-through, zero-result rates, or filter usage.

## Phase 1 — Basic signals (deferred, backlog)

These events should be tracked in a future sprint:

| Event | Trigger | Properties |
|---|---|---|
| `search_query` | User submits a search | `q`, `workSetup`, `employmentType`, `sort`, `result_count`, `page`, `role` (anon/applicant/employer) |
| `search_autocomplete_select` | User selects a suggestion | `suggestion_type`, `suggestion_label`, `position` |
| `search_result_click` | User clicks a job card | `job_id`, `position`, `q`, `page` |
| `search_zero_results` | Search returns 0 results | `q`, `workSetup`, `employmentType` |
| `search_filter_applied` | Filter dropdown changed | `filter_key`, `filter_value`, `q` |
| `search_filter_cleared` | Clear all or remove chip | `cleared_keys`, `q` |

## Implementation option: BE logging
Add a lightweight `search_events` table:
```sql
CREATE TABLE gethired.search_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(64),
  query VARCHAR(200),
  filters JSONB,
  result_count INTEGER,
  uid VARCHAR(128),  -- nullable (anon)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
Write async (don't block the search response) via a fire-and-forget `db.query(insert...)` with no `await`.

## Why no fake signals
- Never pre-populate `result_count` or `popular_searches` with fake data.
- Never fabricate "trending" labels based on assumptions.
- All "popular" or "trending" UI must be backed by real aggregate query data.
- Until the events table exists, remove any hardcoded "Popular searches" shortcuts from the autocomplete or clearly label them as "Suggested searches (editor's picks)".

## Phase 2 — Relevance feedback (future)
Once search events exist:
- Track `result_click` per `job_id` per query.
- Use click-through rate to boost frequently-clicked jobs for that query (must be careful not to create rich-get-richer feedback loops).
- A/B test relevance weight adjustments.
