# GETHIRED_SEARCH_PERFORMANCE_SPEC_V1
_Generated: 2026-06-28_

## Performance targets

| Metric | Target | Notes |
|---|---|---|
| Autocomplete API P95 latency | < 100ms | ILIKE + LIMIT 8 per type, all indexed |
| Public search API P95 latency | < 300ms | FTS + 3 joins + COUNT OVER + LIMIT 20 |
| FE time-to-first-result | < 500ms | API + JSON parse + Angular render |
| Largest Contentful Paint | < 2.5s | Skeleton prevents empty LCP |
| Cumulative Layout Shift | < 0.1 | Skeleton matches card dimensions |

## DB performance

### Autocomplete queries
```sql
-- title autocomplete: uses idx_jobs_title_lower
WHERE lower(job_title) LIKE lower($1) || '%' LIMIT 8
-- No full-table scan: index-only scan possible
```

### Full-text search
```sql
-- uses idx_jobs_title_fts and idx_companies_name_fts (GIN)
WHERE tsvector @@ plainto_tsquery('english', $1)
-- GIN index: O(log N) for ts_query match
```

### COUNT(*) OVER() window function
Returns total result count in the same query as the result rows — avoids a second `SELECT COUNT(*)` round-trip. Adds ~5ms at P99 vs. two queries saving ~10ms round-trip.

## FE performance

### Debounce
220ms debounce on autocomplete — reduces API calls by ~70% vs. no debounce.

### switchMap
Cancels previous in-flight HTTP request when user types. Prevents out-of-order response rendering.

### ChangeDetectionStrategy.OnPush
- `SearchJobCardComponent`: OnPush — only re-renders when `[job]` reference changes.
- `SearchSkeletonComponent`: OnPush — purely static rendering.
- `SearchEmptyStateComponent`: OnPush — renders once per show.

### Lazy-loaded logos
`loading="lazy" decoding="async"` on company logos — below-the-fold logos don't block initial render.

### Bundle impact
New search components add ~12KB gzipped to the main bundle. No new lazy modules were created — components are in SharedModule which is already eagerly loaded for the public page. This is acceptable.

## Performance-related choices deferred
- Redis cache for hot autocomplete queries (e.g., top 100 query prefixes).
- CDN-caching of `/api/search/autocomplete` responses (low TTL, anonymous only).
- pg_trgm fuzzy indexes (adds ~30MB RAM for 50K jobs; deferred until needed).
