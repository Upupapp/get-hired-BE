# GETHIRED_SEARCH_TEST_LOG_V1
_Generated: 2026-06-28_

## Build verification
- `npm run build-dev` — clean build, 0 errors, 0 TS errors.
- 1 SCSS rule skipped (selector warning, pre-existing, not related to search changes).
- Build time: ~28s.
- No new bundle budget violations.

## Manual smoke tests (to run after deploy)

### Autocomplete
```
1. Open https://gethiredonline.app/jobs
2. Type "developer" in the search bar
3. Verify: dropdown appears within 300ms with job title suggestions
4. Press ArrowDown → verify item highlights
5. Press Enter → verify navigation to /jobs?q=developer
6. Press Escape → verify dropdown closes, input text preserved
7. Type "wfh" → verify suggestions include "remote" terms (synonym expansion)
8. Type "csr" → verify suggestions include "customer service" terms
```

### Search results
```
1. Navigate to /jobs?q=developer
2. Verify: search mode layout (dark header, filter dropdowns, result cards)
3. Verify: result count shown
4. Verify: each card shows title, company, location, work setup, salary
5. Click "Remote" in work setup filter → URL updates to ?q=developer&workSetup=remote → results refresh
6. Remove the workSetup chip → filter removed, results refresh
7. Click "Next →" → URL updates to ?page=2 → results refresh
8. Navigate browser back → returns to page 1
```

### Browse mode
```
1. Navigate to /jobs (no params)
2. Verify: banner, companies recommended, job posts list, explore users — all present
3. Verify: no search results layout visible
4. Submit search → transitions to search mode with results
```

### Security
```
1. GET /api/search/employer (no token) → expect 401
2. GET /api/search/applicant (no token) → expect 401
3. GET /api/search/public?sort=; DROP TABLE gethired.jobs -- → expect sanitised query, 200 (not an injection vector since plainto_tsquery handles it safely)
4. GET /api/search/public?workSetup=malicious_value → expect filter ignored (whitelist), results as if no workSetup filter
```

## Automated tests (backlog — not yet written)
The following unit/integration tests should be written in a follow-up sprint:

| Test | File | Description |
|---|---|---|
| `parseSort` rejects invalid | `searchQueryParserService.test.js` | `parseSort('DROP TABLE')` → `'relevance'` |
| `expandSynonyms` | `searchSynonymService.test.js` | `expandSynonyms('wfh developer')` → `'remote developer'` |
| `searchPublicJobs` SQL | `searchService.test.js` | Integration test against test DB |
| BOLA guard | `searchController.test.js` | Employer with company_id_A cannot see company_B's jobs |
| Autocomplete rate limit | `searchRoutes.test.js` | 201st anon request → 429 |
| Draft jobs excluded | `searchService.test.js` | `status = 'draft'` job not returned in public search |
