# GETHIRED STITCH REPORT — RECENT DEPLOYMENT V3
## Scope: Federated Search Phase 2 — API Contract + Integration Stability

---

## API CONTRACT — FEDERATED SEARCH

### `GET /api/search/public`

**Request params:**
- `q` (string, optional) — search query
- `type` (string: `all`|`jobs`|`companies`) — scope; alias for legacy `scope`
- `location` (string, optional)
- `workSetup` (string, optional)
- `employmentType` (string, optional)
- `minSalary` / `maxSalary` (number, optional)
- `sort` (string: `relevance`|`date_desc`|`most_open_roles`|`newest_posted`|`name_asc`)
- `page` / `limit` (pagination)

**Response shape (All mode):**
```json
{
  "query": "nurse",
  "type": "all",
  "counts": { "all": 47, "jobs": 40, "companies": 7 },
  "groups": {
    "jobs": { "items": [...], "total": 40, "hasMore": true },
    "companies": { "items": [...], "total": 7, "hasMore": false }
  },
  "companySpotlight": null,
  "appliedFilters": { "location": null, "workSetup": null, "employmentType": null, "salary": null, "sort": "relevance" },
  "emptyRecovery": null,
  "latencyMs": 54
}
```

**FE consumption:** `SearchService.searchPublic()` → `FederatedSearchResponse` (typed)

### `GET /api/search/autocomplete`

**Response shape:**
```json
{
  "query": "nur",
  "groups": {
    "jobs": [{ "type": "job_title", "label": "Nurse", "url": "/jobs?q=Nurse" }],
    "companies": [{ "type": "company", "label": "APC", "sublabel": "3 open roles", "logoUrl": null, "url": "/companies/apc", "slug": "apc" }],
    "locations": [{ "type": "location", "label": "Nursing City", "url": "/jobs?location=..." }]
  },
  "suggestions": [...]
}
```

---

## INTEGRATION POINTS VERIFIED

| Integration | Status | Notes |
|---|---|---|
| `publicSearch` → `searchPublicJobsRanked` → PostgreSQL FTS | PASS | Index in place |
| `publicSearch` → `searchPublicCompaniesRanked` → EXISTS filter | PASS | Active-jobs filter correct |
| `publicSearch` → `getCompanySpotlight` → parallel Promise.all | PASS | All 3 queries parallel on All tab |
| `autocomplete` → `getCompanySuggestions` → enriched response | PASS | sublabel, logoUrl, EXISTS filter |
| FE `SearchService` → `FederatedSearchResponse` typing | PASS | Types match BE shape |
| FE `PublicListComponent` → `SearchService.searchPublic()` | PASS | Consumed correctly |
| FE `SearchCompanyCardComponent` ← `SearchCompanyResult` type | PASS | |
| FE `SearchSpotlightCardComponent` ← `CompanySpotlight` type | PASS | |
| URL param `?type=` → `activeTab` → filter groups | PASS | URL-driven state confirmed |
| `AutocompleteSuggestion` → `SearchAutocompleteComponent` | PASS | Alias preserves backwards compat |

---

## ANTI-CORRUPTION LAYER

| Rule | Enforced |
|---|---|
| `company_id` for BOLA — always from JWT→DB, never request body | YES (searchController.js) |
| No `?.` or `??` in BE files (esm/Acorn constraint) | YES (verified in searchService.js + searchController.js) |
| Company visibility: `company_slug IS NOT NULL` + `EXISTS(active job)` | YES |
| Spotlight gate ≥ 60 | YES |
| `catchError` in SearchService returns typed fallback | YES |

---

## STITCH VERDICT: PASS — No broken integrations. No ACL violations. Contract stable.
