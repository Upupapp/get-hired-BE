# GETHIRED_SEARCH_RELEVANCE_MODEL_V1
_Generated: 2026-06-28_

## Ranking function: `ts_rank_cd`

PostgreSQL's `ts_rank_cd` (cover density) is used over plain `ts_rank` because:
- It penalises documents where matched terms are spread far apart (lower "density").
- This means "Software Developer" for query "software developer" outranks a job description that mentions "software" once and "developer" once in different paragraphs.

## Weight assignment

```sql
setweight(to_tsvector('english', coalesce(j.job_title,'')), 'A')  -- weight 1.0
|| setweight(to_tsvector('english', coalesce(c.company_name,'')), 'B')  -- weight 0.4
|| setweight(to_tsvector('english', coalesce(j.city,'')), 'C')  -- weight 0.2
|| setweight(to_tsvector('english', coalesce(j.job_description,'')), 'D')  -- weight 0.1
```

`ts_rank_cd` default weights: `{0.1, 0.2, 0.4, 1.0}` for `{D, C, B, A}`.

## Tie-breaking
When `ts_rank_cd` scores are equal (e.g., multiple jobs titled exactly "Nurse"), ties are broken by `j.updated_at DESC` — most recently updated jobs appear first.

## Sort options

| Sort value | SQL ORDER BY |
|---|---|
| `relevance` (default) | `rank DESC, j.updated_at DESC` |
| `newest` | `j.updated_at DESC` (rank still computed but ignored for ordering) |
| `salary_high` | `j.salary_max DESC NULLS LAST, rank DESC` |

## Known limitations
1. **No personalisation** — rank is purely textual. A logged-in user's saved skills or location don't boost results. (Deferred to Phase 2.)
2. **No click-through signal** — results aren't boosted by past application volume. (Deferred — requires analytics pipeline.)
3. **English stemmer only** — Tagalog words are not stemmed. "Trabahador" and "trabaho" don't match each other.
4. **No fuzzy/typo tolerance** — "Sofware" (typo) won't match "Software". pg_trgm similarity search is in the backlog.
5. **Description weight D is low by design** — prevents keyword-stuffed job descriptions from outranking genuinely titled jobs.

## Calibration log
| Date | Change | Reason |
|---|---|---|
| 2026-06-28 | Initial: A=1.0, B=0.4, C=0.2, D=0.1 | PostgreSQL defaults; no calibration data yet |
