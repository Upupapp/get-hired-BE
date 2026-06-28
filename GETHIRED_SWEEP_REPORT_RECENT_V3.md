# GETHIRED SWEEP REPORT — RECENT DEPLOYMENT V3
## Scope: Phase 2 Federated Search (BE 3f6561c, FE 3542388) + Alignment Fix

---

## DEPLOYMENT SUMMARY

| Artifact | Before | After |
|----------|--------|-------|
| BE | 650869a | 3f6561c |
| FE | 9fd7956 | 3542388 |

---

## NEW FILES / CHANGES AUDITED

### BE: `controllers/searchController.js`
- `publicSearch()` — federated response; parallel queries (Promise.all)
- `autocomplete()` — enriched company suggestions; grouped response shape

### BE: `services/searchService.js`
- `searchPublicCompaniesRanked()` — new; ranked company search with EXISTS filter
- `getCompanySpotlight()` — new; exact/prefix/FTS scoring, top 3 jobs
- `getCompanySuggestions()` — updated; +open_jobs_count, +company_logo, +EXISTS filter

### BE: `services/searchQueryParserService.js`
- `type=` alias for `scope=`
- Company sort fields: most_open_roles, newest_posted, name_asc

### FE: `src/app/core/services/search.service.ts`
- Full rewrite with FederatedSearchResponse, AutocompleteSuggestion alias

### FE: `src/app/public/public-list/public-list.component.ts`
- Full rewrite — tabs, federated rendering, spotlight, URL-driven state

### FE: `src/app/public/public-list/public-list.component.html`
- Tab bar, company spotlight, jobs section, companies section

### FE: `src/app/shared/components/gh-search/search-company-card/` (NEW)
- ts / html / scss

### FE: `src/app/shared/components/gh-search/search-spotlight-card/` (NEW)
- ts / html / scss

### FE: `src/app/shared/shared.module.ts`
- +SearchCompanyCardComponent, +SearchSpotlightCardComponent

### FE: `employer-subscription.component.scss` (alignment fix)
- `.gh-sub-hero__pulse-item`: flex:1, equal-width, divider between items
- `.gh-sub-hero__pulse-val`: min-height:29px, display:flex, align-items:center

---

## FINDINGS

### P0 (Blocking) — None found

### P1 (High)
- **getCompanySpotlight**: If PostgreSQL FTS returns 0 rows but ILIKE prefix matches 1 company, the function returns spotlight correctly. However, the LIKE pattern uses `lower($1) || '%'` — this is a dynamic concatenation inside SQL but it's still parameterized via `$1`, so no SQL injection risk. ✅
- **Autocomplete company suggestions**: New `EXISTS` filter may exclude companies whose last active job was just closed. This is acceptable behavior — we want "actively hiring" companies only.

### P2 (Medium)
- `counts.all = counts.jobs + counts.companies` — this is additive. If the same company name matches a job title, a user sees both counts. Expected and correct.
- Autocomplete browse-companies shortcut fires for `companies.length > 0` — could produce a shortcut even for 1 company match. Low risk, acceptable.
- FE tab `activeTab` defaults to `'all'` even when `?type=xyz` (unknown value) is passed — falls back to `'all'`. Safe, correct.
- `catchError` in SearchService returns `EMPTY_FEDERATED` with `query: params.q || ''` — all consumers will see empty groups. Verified safe.

### P3 (Low)
- `.gh-sub-hero__pulse-item` sibling selector uses `+` combinator — works correctly in all modern browsers. IE11 not supported.
- Spotlight card entrance animation: `gh-spotlight-in` fires each time spotlight appears. If user switches tab back to All, spotlight re-animates. Acceptable behavior.

---

## WHAT'S NOT BROKEN
- Apply flow: unchanged
- Job detail: unchanged
- CV Doctor routes: unchanged
- MATCH engine: unchanged
- Auth guards: unchanged
- Employer dashboard: unchanged
- Autocomplete backwards compat: `AutocompleteSuggestion` alias preserves type
- Browse mode in PublicListComponent: unchanged (`browseMode` template block)
