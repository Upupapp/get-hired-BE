# GETHIRED: Federated Search — Blended Ranking Log V1

## Architecture

The federated response does **not** blend jobs and companies into a single ranked list. They are returned in separate groups to preserve clarity and allow independent pagination. The FE renders them in distinct sections.

## Job Ranking (unchanged from Phase 1)

1. PostgreSQL FTS: `to_tsvector('english', job_title || ' ' || description || ...) @@ plainto_tsquery($q)`
2. `ts_rank_cd(...)` for weighted relevance
3. Fallback (no query): `ORDER BY updated_at DESC`
4. Synonym expansion via `expandSynonyms(q)` before query

## Company Ranking

1. FTS on company name + industry name
2. Prefix ILIKE fallback for partial name matches
3. Score order: `ts_rank_cd DESC, open_jobs_count DESC, company_name ASC`
4. Alternate sorts: `most_open_roles`, `name_asc`, `newest_posted`

## Company Spotlight Scoring

Triggered only for All-tab queries with `q.length >= 2` and `words <= 5`.

| Match type | Score |
|-----------|-------|
| Exact case-insensitive match | 100 |
| Prefix match (LIKE `q%`) | 60 |
| FTS match only | 30 |

Spotlight is shown only when score ≥ 60. Score 30 (FTS only) is too ambiguous to spotlight.

The spotlight card shows:
- Company header (logo, name, industry, location, open role count)
- Top 3 active published jobs from that company
- Links to company profile and filtered jobs

## All-Tab Pagination

| Group | Default limit | Rationale |
|-------|--------------|-----------|
| Jobs | 12 | Primary result type — more shown |
| Companies | 4 | Secondary — just enough to surface employers |

Job and company pages are independently paginated in their respective tabs.
