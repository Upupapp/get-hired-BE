# GETHIRED_SEARCH_FIX_LOG_V1
_Generated: 2026-06-28_

## Fixes applied during implementation

### FIX-001: Angular `aria-label` binding on native element
**File:** `search-job-card.component.html`
**Error:** `error NG8002: Can't bind to 'aria-label' since it isn't a known property of 'span'`
**Cause:** In strict Angular templates, `aria-label="static text"` works on native elements, but `aria-label="{{ expression }}"` requires `[attr.aria-label]="expression"` syntax.
**Fix:** Changed `aria-label="Posted {{ getRelativeTime() }}"` → `[attr.aria-label]="'Posted ' + getRelativeTime()"`.
**Also fixed:** `role="list"` added to `.gh-sjc-meta` div; `role="listitem"` added to each chip `<span>` instead of the invalid `[aria-label]` binding.

### FIX-002: esm/Acorn optional chaining prohibition
**Files:** `searchService.js`, `searchController.js`, `searchSynonymService.js`, `searchQueryParserService.js`
**Constraint:** esm v3.2.25 uses Acorn 6/7 which does not support `?.` or `??`.
**Applied throughout:** All null-safety uses `&&`, `||`, ternary, and `coalesce()` in SQL instead.
**Example:** `result.rows[0] && result.rows[0].company_id` instead of `result.rows[0]?.company_id`.

### FIX-003: PublicSearchComponent `findJobs()` rewrite
**Old behavior:** Wrote to sessionStorage + navigated to `/jobs/search/:keyword` + relied on `JobPostsListComponent` doing client-side in-memory filtering.
**New behavior:** Navigates to `/jobs?q=keyword` URL, triggering `PublicListComponent`'s `queryParams` observable which calls the new server-side search API.
**Backward compat:** `/jobs/search/:keyword` route still exists and renders `PublicSearchComponent`. Users who bookmarked or shared those URLs still land on a functional page. The search form on that page now redirects to `/jobs?q=...`.

### FIX-004: FE build script
**Problem:** `npm run build` calls `build:ssr` which doesn't exist in this project.
**Fix (documented):** Use `npm run build-dev` for local builds.

### FIX-005: SCP deployment path
**Problem:** SCP to `dist/get-hired/browser/*` failed — no `browser/` subdirectory in this project's build output.
**Fix:** SCP `dist/get-hired/*` directly (no `browser` subdirectory).

### FIX-006: BE git pull path
**Problem:** `/var/www/get-hired-BE` doesn't exist on Linode.
**Actual path:** `/var/www/_work/get-hired-BE`
**pm2 process name:** `gethired`

## No regressions introduced
- Browse-all mode (`/jobs` with no params) preserves the original `app-public-banner`, `app-public-companies-recommended`, `app-job-posts-list`, `app-public-explore-users` layout exactly.
- Legacy `/jobs/search/:keyword` route still works.
- `SharedModule` additions are purely additive (new declarations added, nothing removed or modified).
