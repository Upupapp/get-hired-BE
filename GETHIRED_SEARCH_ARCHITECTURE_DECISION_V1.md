# GETHIRED_SEARCH_ARCHITECTURE_DECISION_V1
_Generated: 2026-06-28 | Command: GETHIRED_COMPREHENSIVE_SEARCH_DISCOVERY_RELEVANCE_FEDERATED_FULLSTACK_V1_

## Decision: PostgreSQL Full-Text Search (Not Elasticsearch/OpenSearch)

### Options considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **PostgreSQL FTS** (chosen) | Already present, no new infra, GIN indexes built-in, ts_rank_cd relevance, maintenance-free | Limited to English stemmer for non-English content | ✅ CHOSEN |
| Elasticsearch | Best-in-class relevance, analyzers, semantic | New infra ($100+/mo), ops complexity, sync lag, overkill at current scale | ✗ Rejected |
| OpenSearch (AWS) | AWS-managed | Same overkill concern; vendor lock-in | ✗ Rejected |
| Typesense | Simple, fast, modern | New dependency, sync overhead, paid at scale | ✗ Rejected |
| MeiliSearch | Good DX | New dependency, not justified yet | ✗ Rejected |

### Rationale
- GetHired currently has <50K published jobs. PostgreSQL GIN indexes handle millions of tsvector rows without full-text search engines.
- `ts_rank_cd` provides weighted relevance (title A > company B > location C > description D).
- Synonym expansion pre-processes the query string before passing to `plainto_tsquery`, bridging the gap between Philippine job market slang and stored English terms.
- Zero additional cost, zero new ops surface, trivially deployable — a `git pull + psql -f` migration.
- **Revisit when:** job count exceeds 500K rows or latency on complex faceted queries exceeds 200ms on the DB server.

## Search Architecture Overview

```
Browser
  └── SearchAutocompleteComponent (Angular)
        ↓ debounce 220ms
  GET /api/search/autocomplete?q=...
        ↓ optionalVerifyAuth + rate-limit (200/15min anon only)
  searchController.autocomplete()
        ↓ parseQuery → expandSynonyms
  searchService.getJobTitleSuggestions() + getCompanySuggestions() + getLocationSuggestions()
        ↓ PostgreSQL lower() ILIKE prefix + LIMIT 8 per type
  federated AutocompleteResponse → browser

Browser
  └── PublicListComponent (Angular) — URL ?q=...&workSetup=...
        ↓ on queryParams change
  GET /api/search/public?q=...&workSetup=...&sort=...&page=...
        ↓ optionalVerifyAuth
  searchController.publicSearch()
        ↓ parsePublicSearchParams → sanitise → expandSynonyms → to_tsquery
  searchService.searchPublicJobs()
        ↓ PostgreSQL FTS + ts_rank_cd + filters + COUNT(*) OVER() + LIMIT/OFFSET
  presentPublicJob() presenter strips private fields
  SearchResponse { results, pagination } → browser
```

## Layer responsibilities

| Layer | File | Responsibility |
|---|---|---|
| Query parsing | `searchQueryParserService.js` | Sanitise, validate, whitelist sort/scope/setup |
| Synonym expansion | `searchSynonymService.js` | PH-specific term → standard English |
| DB queries | `searchService.js` | Parameterised SQL only, no string concat |
| Business logic | `searchController.js` | Auth, BOLA guard, privacy presenter, pagination |
| Routes | `searchRoutes.js` | Rate limit, auth middleware assignment |
| Indexes | `db/20260628_search_indexes.sql` | GIN + lower() + status + slug |
| Frontend state | `SearchService` (TS) | HTTP client, typed interfaces |
| UI components | `gh-search/*` | Autocomplete, job card, skeleton, empty state |
| Page integration | `PublicListComponent` | URL param → search mode toggle |
