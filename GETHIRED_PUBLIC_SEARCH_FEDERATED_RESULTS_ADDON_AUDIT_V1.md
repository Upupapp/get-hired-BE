# GETHIRED_PUBLIC_SEARCH_FEDERATED_RESULTS_ADDON_AUDIT_V1
_Generated: 2026-06-28 | Add-on: GETHIRED_PUBLIC_SEARCH_RESULTS_FEDERATED_JOBS_COMPANIES_ADDON_V1_

## Audit findings — existing search system state

### Public search route
`GET /api/search/public` — EXISTS. Handles `scope=all|jobs|companies`. Mounted under `app.use('/api/search', searchRoutes)`.

### Public job portal route
`/jobs` via `PublicListComponent`. Search mode activates when URL has `?q=` or filter params. **Currently shows jobs only** — companies not shown even when `scope=all` is sent.

### Current search API response shape (before add-on)
```json
{
  "query": "developer",
  "scope": "all",
  "filters": { ... },
  "results": [ ...flat mix of job and company objects... ],
  "pagination": { "page": 1, "limit": 20, "total": 38, "hasMore": true },
  "latencyMs": 92
}
```
**Gap:** flat `results` array — no `counts`, no `groups`, no `companySpotlight`, no `topHits`. FE ignores company objects in the array entirely.

### Current scope support
Parser supports `scope=all|jobs|companies`. Controller returns flat mix. FE never passes `scope` — always defaults to `all`. **Gap:** FE doesn't know how to separate jobs from companies in the flat array. It just renders all as job cards.

### Public company pages
`/companies/:slug` — route exists. `PublicCompaniesRecommendedComponent` exists. **Usable for linking.**

### Company search support (existing)
`searchPublicCompanies(params)` in `searchService.js` — EXISTS but:
- Filters only `WHERE c.company_slug IS NOT NULL` (no published-only filter)
- No visibility rule ensuring company has active jobs
- Sort hardcoded to `company_name ASC`
- No relevance scoring
- No top-jobs preview per company
- No industry/location filter support

### Company slugs
`company_slug` column exists on `companies` table. Used in existing queries. Public company profile links will be `/companies/:slug`.

### Company open jobs count
`(SELECT COUNT(*) FROM gethired.jobs j2 WHERE j2.company_id = c.company_id AND j2.job_status_id = 2) AS open_jobs_count` — already computed in `searchPublicCompanies`. Real count, not faked.

### Company profile published flag
No `is_public` or `is_published` boolean on the companies table is visible in current queries. **Safe fallback:** show company only if `company_slug IS NOT NULL` AND has ≥1 active job (`job_status_id = 2`).

### Company public-data safety
`presentPublicCompany` in controller strips to: companyId, companyName, companyLogoUrl, companySlug, industry, location, openJobsCount. No private fields (billing, recruiter contacts, subscription tier, team members) are returned.

### Job cards include company context
YES — `company_name`, `company_logo`, `company_slug` already present in `PUBLIC_JOB_SELECT`.

### Current autocomplete
Returns grouped but flat `suggestions[]` array. Types: `job_title`, `company`, `location`, `shortcut`. **Gap:** no open jobs count on company suggestions, no skills group, no work_setup group.

### Current filters
Jobs: workSetup, employmentType, salary, location, sort (relevance/newest/salary_high). **Gap:** industry filter, experience filter, company filter, date posted filter, hasVideoQuestions, hasScreeningQuestions not implemented.

### Current sort
Jobs: relevance, newest, salary_high. **Gap:** Companies sort (most_open_roles, newest_posted, name_asc) not supported.

### Current result count logic
`COUNT(*) OVER()` window function on first row. Accurate per-query real count.

### Current empty state
`SearchEmptyStateComponent` — exists, shows illustration + suggestions. **Gap:** doesn't handle "jobs found but no companies" / "companies found but no jobs" partial recovery messages.

### Current mobile layout
Sticky header + filter row + cards stacked. **Gap:** no tab bar, no bottom sheet for filters.

### Current accessibility
ARIA combobox on autocomplete input. role=alert on error. aria-live on count. **Gap:** no tabs ARIA pattern.

### Current SEO
Search mode: `noindex, follow`. Browse mode: `index, follow`. Canonical always `/jobs`. **Correct behavior to preserve.**

### Current analytics
None. No events pipeline exists yet.

### Brand assets
- `src/assets/brand/` — exists, contains logo/OG images only
- `src/assets/brand/gethired-brand-assets-v3/` — **DOES NOT EXIST**
- `src/assets/brand/gethired-brand-assets-v4-online-custom/` — **DOES NOT EXIST**
- **Resolution:** use inline SVGs and CSS for all decorative brand elements.

---

## What is missing (gaps to fill in this add-on)

| Gap | Severity | Plan |
|---|---|---|
| Federated response format (counts/groups/companySpotlight) | HIGH | Upgrade `publicSearch` controller |
| Company spotlight detection | HIGH | Add `getCompanySpotlight()` to searchService |
| Company visibility rule (only with active jobs) | HIGH | Add `EXISTS(...)` filter to company query |
| Company relevance sorting | MEDIUM | Add `searchPublicCompaniesRanked()` |
| All/Jobs/Companies tabs in FE | HIGH | Add tab UI to PublicListComponent |
| Company result cards | HIGH | Create `SearchCompanyCardComponent` |
| Company spotlight card | HIGH | Create `SearchSpotlightCardComponent` |
| Federated response types in FE SearchService | HIGH | Update interfaces |
| Partial-results empty state copy | MEDIUM | Update `SearchEmptyStateComponent` inputs |
| Company sort options | MEDIUM | Add to parser + service |
| Autocomplete company open-jobs count | LOW | Update autocomplete response |
| Mobile tab bar | MEDIUM | Add tab SCSS + sticky tab behavior |
| Tab ARIA pattern | MEDIUM | Add role=tablist/tab/tabpanel |
| Haptics/animations for tabs and company cards | LOW | Inline CSS + TS vibrate guard |

## Safe implementation route

1. **Backend:** Upgrade `publicSearch` to federated format. Add company spotlight. Add ranked company search. No schema changes needed.
2. **Frontend:** Add tab UI to `PublicListComponent`. Create company card + spotlight components. Update SearchService types. Register in SharedModule.
3. **Backward compat:** Employer/applicant search endpoints unchanged (flat format preserved).
4. **Risk:** Low. Purely additive. No new routes, no new tables, no breaking changes to existing endpoints.
