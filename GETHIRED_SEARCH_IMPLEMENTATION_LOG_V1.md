# GETHIRED_SEARCH_IMPLEMENTATION_LOG_V1
_Generated: 2026-06-28_

## Files created (Backend)

| File | Purpose |
|---|---|
| `db/20260628_search_indexes.sql` | 9 production indexes: 4 B-tree (status/company/updated/slug), 2 functional lower() (autocomplete), 2 GIN (FTS), 1 city lower(); ANALYZE on both tables |
| `services/searchQueryParserService.js` | Input sanitisation, whitelist validation, pagination parsing |
| `services/searchSynonymService.js` | Philippine job market synonym expansion (19 word synonyms, 10 phrase synonyms) |
| `services/searchService.js` | PostgreSQL FTS queries: searchPublicJobs, searchPublicCompanies, getJobTitleSuggestions, getCompanySuggestions, getLocationSuggestions, searchEmployerJobs, searchEmployerApplicants, searchApplicantSavedJobs |
| `controllers/searchController.js` | publicSearch, autocomplete, employerSearch, applicantSearch; BOLA guard; privacy presenters; structured error handler |
| `routes/searchRoutes.js` | /public, /autocomplete, /employer, /applicant; rate limiters; auth middlewares |

## Files modified (Backend)

| File | Change |
|---|---|
| `server.js` | +2 lines: `import searchRoutes` + `app.use('/api/search', searchRoutes)` |

## Files created (Frontend)

| File | Purpose |
|---|---|
| `core/services/search.service.ts` | Angular HTTP service; SearchParams/SearchResponse/AutocompleteResponse TypeScript interfaces |
| `shared/components/gh-search/search-autocomplete/search-autocomplete.component.ts` | WAI-ARIA combobox; debounce; switchMap; keyboard nav; scope input; searchSubmit output |
| `shared/components/gh-search/search-autocomplete/search-autocomplete.component.html` | Combobox HTML: input + dropdown (listbox + options grouped by type) |
| `shared/components/gh-search/search-autocomplete/search-autocomplete.component.scss` | Navy header, coral submit, purple focus, white dropdown; reduced-motion |
| `shared/components/gh-search/search-job-card/search-job-card.component.ts` | Job card; formatSalary; getRelativeTime; viewJob; onLogoError; OnPush |
| `shared/components/gh-search/search-job-card/search-job-card.component.html` | Article card: logo, title h3, company button, chip list, View CTA |
| `shared/components/gh-search/search-job-card/search-job-card.component.scss` | Hover lift, salary chip green, setup chip indigo, responsive |
| `shared/components/gh-search/search-skeleton/search-skeleton.component.ts` | Shimmer placeholder; @Input count=5 |
| `shared/components/gh-search/search-skeleton/search-skeleton.component.html` | N shimmer card skeletons |
| `shared/components/gh-search/search-skeleton/search-skeleton.component.scss` | 200% gradient background-size + animation; reduced-motion static |
| `shared/components/gh-search/search-empty-state/search-empty-state.component.ts` | @Input query, hasFilters; @Output clearFilters, browseAll |
| `shared/components/gh-search/search-empty-state/search-empty-state.component.html` | SVG illustration + heading + body + actions + CV Doctor link |
| `shared/components/gh-search/search-empty-state/search-empty-state.component.scss` | Float animation; button variants; reduced-motion |

## Files modified (Frontend)

| File | Change |
|---|---|
| `public/public-list/public-list.component.ts` | Full rewrite: queryParams→switchMap search pipeline; isSearchMode flag; filter/pagination methods |
| `public/public-list/public-list.component.html` | Full rewrite: search mode template + browse mode (#browseMode template preserving original layout) |
| `public/public-list/public-list.component.scss` | Added search-mode CSS block (~195 lines) |
| `public/public-search/public-search.component.ts` | `findJobs()` rewritten to `router.navigate(['/jobs'], { queryParams })` |
| `shared/shared.module.ts` | +4 imports + +4 entries in classesToInclude array |

## Commits
- FE: `9fd7956` (18 files changed, +1649/-62)
- BE: `650869a` (7 files changed, +937 lines)

## Deploy
- BE: git pull + pm2 restart on `/var/www/_work/get-hired-BE` (2026-06-28)
- FE: scp dist/get-hired/ to /var/www/gethired/ (2026-06-28)
- DB: `psql ... -f db/20260628_search_indexes.sql` — 9 CREATE INDEX + 2 ANALYZE (2026-06-28)
