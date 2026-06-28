# GETHIRED_SEARCH_SEO_SPEC_V1
_Generated: 2026-06-28_

## Page meta strategy

### Browse mode (no URL params, /jobs)
```
title: "Browse Jobs in the Philippines | GetHired Online"
description: "Search thousands of job opportunities in the Philippines. Apply online..."
canonical: https://gethiredonline.app/jobs
robots: index, follow
```
Breadcrumb JSON-LD:
```json
[{"name":"Home","url":"..."}, {"name":"Jobs","url":"..."}]
```

### Search mode (/jobs?q=developer)
```
title: '"developer" Jobs in the Philippines | GetHired Online'
description: 'Find "developer" jobs in the Philippines on GetHired Online...'
canonical: https://gethiredonline.app/jobs  (canonical always points to root /jobs)
robots: noindex, follow
```
Canonical always `/jobs` regardless of params — prevents each unique query from being indexed as a separate page (duplicate content penalty).

`noindex` on paginated/filtered results is intentional and follows Google's guidance for faceted search.

### `/jobs/search/:keyword` (legacy PublicSearchComponent)
```
title: '"keyword" Jobs in the Philippines | GetHired Online'
robots: noindex, follow
canonical: https://gethiredonline.app/jobs
```
Same noindex treatment as search mode. The new `findJobs()` redirects to `/jobs?q=...`, so this route sees reduced traffic over time.

## JSON-LD

Browse mode sets a BreadcrumbList JSON-LD. Search mode does not (dynamic pages shouldn't have misleading static structured data).

Future (backlog): JobPosting JSON-LD for individual job detail pages to enable rich results in Google Search.

## URL canonicalization

All search URLs canonicalize to `/jobs`. This means:
- `/jobs?q=developer`, `/jobs?q=developer&workSetup=remote`, `/jobs?page=2` — all have `canonical: /jobs`
- Only the clean browse-all URL `/jobs` is indexed
- Faceted permutations don't create duplicate-content issues

## Sitemap note
`/jobs` should be in the sitemap. Individual search URLs should NOT be in the sitemap.

## Core Web Vitals impact
- Skeleton loader prevents CLS (Cumulative Layout Shift) during search-mode transitions.
- `loading="lazy" decoding="async"` on company logos prevents LCP blocking.
- SearchAutocompleteComponent uses `ChangeDetectionStrategy.OnPush` — no unnecessary re-renders on scroll.
