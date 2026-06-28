# GETHIRED: Federated Search — Backend Implementation Log V1

## Files Modified

### `controllers/searchController.js`
- `publicSearch()` replaced with federated version
- All mode: parallel `Promise.all([searchPublicJobsRanked, searchPublicCompaniesRanked, getCompanySpotlight])`
- Jobs tab: delegates to `searchPublicJobsRanked` alone
- Companies tab: delegates to `searchPublicCompaniesRanked` alone
- `emptyRecovery` logic: `jobs_missing` (jobs=0, companies>0), `companies_missing` (companies=0, jobs>0), `empty` (both=0)
- `counts.all = counts.jobs + counts.companies`
- Latency timer: `Date.now()` before queries, `latencyMs` in response
- Autocomplete: company suggestions now include `sublabel`, `logoUrl`; response includes `groups` object + `suggestions` flat array; added browse-companies shortcut when companies matched

### `services/searchService.js`
- `searchPublicCompaniesRanked(params)`: new function
  - WHERE: `company_slug IS NOT NULL` AND `EXISTS(active published job)`
  - Relevance sort: `ts_rank_cd(to_tsvector(...), plainto_tsquery(...)) DESC`
  - Sort options: `most_open_roles`, `newest_posted`, `name_asc`
  - `open_jobs_count` via subquery
- `getCompanySpotlight(q)`: new function
  - Aborts if `q.length < 2` or `> 80` or words > 5
  - Scores: exact match = 100, prefix match = 60, FTS = 30
  - Returns spotlight only if score ≥ 60
  - Fetches top 3 active jobs from spotlight company
- `getCompanySuggestions(prefix)`: updated
  - Now returns `open_jobs_count`, `company_logo`
  - Filters by EXISTS(active job) — only companies actively hiring
- Exports updated: `searchPublicCompaniesRanked`, `getCompanySpotlight`

### `services/searchQueryParserService.js`
- `ALLOWED_SORT_FIELDS`: added `most_open_roles`, `newest_posted`, `name_asc`
- `parsePublicSearchParams`: reads `query.type || query.scope` for the scope/tab param

## Esm/Acorn Constraint Maintained
All new BE code uses `&&`, `||`, ternary — zero `?.` or `??` operators.

## BOLA Maintained
Company results use `company_id` resolved from DB, never from request body.

## Commits
- BE: `3f6561c` — "feat(search): federated public search — companies + autocomplete enrichment"
