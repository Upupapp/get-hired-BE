# GETHIRED TEST REPORT — RECENT DEPLOYMENT V3
## Scope: Federated Search Phase 2 (BE 3f6561c / FE 3542388) + Alignment Fix + Employer Portal V4

---

## BUILD STATUS
- Angular build: PASS (0 errors, 2 pre-existing autoprefixer warnings in unrelated file)
- BE: node --check: PASS (no syntax errors)

---

## UNIT / INTEGRATION TEST COVERAGE

### BE — searchController.js

| Scenario | Status | Notes |
|---|---|---|
| `publicSearch` with `type=all` returns federated response | NEEDS TEST | No test file for searchController yet |
| `publicSearch` with `type=jobs` returns jobs only | NEEDS TEST | |
| `publicSearch` with `type=companies` returns companies only | NEEDS TEST | |
| `autocomplete` with company matches returns grouped response | NEEDS TEST | |
| `getCompanySpotlight` score=100 (exact match) | NEEDS TEST | |
| `getCompanySpotlight` score=60 (prefix match) | NEEDS TEST | |
| `getCompanySpotlight` score=30 (FTS only, below gate) | NEEDS TEST | |
| `publicSearch` returns `emptyRecovery` on zero-jobs result | NEEDS TEST | |

### BE — searchService.js

| Scenario | Status | Notes |
|---|---|---|
| `searchPublicCompaniesRanked` — sort by `most_open_roles` | NEEDS TEST | |
| `searchPublicCompaniesRanked` — sort by `newest_posted` | NEEDS TEST | |
| `searchPublicCompaniesRanked` — sort by `name_asc` | NEEDS TEST | |
| `getCompanySuggestions` — filters companies with `EXISTS` active job | NEEDS TEST | |
| `getCompanySuggestions` — prefix < 2 chars returns [] | NEEDS TEST | |

### FE — SearchService

| Scenario | Status | Notes |
|---|---|---|
| `searchPublic` with `type=companies` sets correct URL params | NEEDS TEST | |
| `catchError` returns `EMPTY_FEDERATED` shape (never undefined) | NEEDS TEST | |
| `AutocompleteSuggestion` alias === `AutocompleteSuggestionGroup` | NEEDS TEST | |

### FE — PublicListComponent

| Scenario | Status | Notes |
|---|---|---|
| Tab switch updates `?type=` query param in URL | NEEDS TEST | |
| `visibleJobs` returns [] when `activeTab=companies` | NEEDS TEST | |
| `visibleCompanies` returns [] when `activeTab=jobs` | NEEDS TEST | |
| `showSpotlight` true only when `activeTab=all` and spotlight exists | NEEDS TEST | |
| `isAllEmpty` true only after load and both counts=0 | NEEDS TEST | |

---

## MANUAL SMOKE TESTS (PRODUCTION)

### Federated Search

| Test | Expected | Status |
|---|---|---|
| `GET /api/search/public?q=nurse` | `{ counts.all > 0, groups.jobs.items.length > 0 }` | MANUAL REQUIRED |
| `GET /api/search/public?q=nurse&type=jobs` | jobs only | MANUAL REQUIRED |
| `GET /api/search/public?q=nurse&type=companies` | companies only | MANUAL REQUIRED |
| `GET /api/search/public?q=meralco` | `companySpotlight` returned | MANUAL REQUIRED |
| `GET /api/search/autocomplete?q=nur` | `groups.jobs`, `groups.companies`, `groups.locations` in response | MANUAL REQUIRED |
| `/jobs` — All tab shows both jobs + companies | Tabs visible, counts correct | MANUAL REQUIRED |
| `/jobs?type=companies` — Companies tab active | Only company cards shown | MANUAL REQUIRED |
| `/jobs?type=jobs` — Jobs tab active | Only job cards shown | MANUAL REQUIRED |
| Company spotlight appears when exact company name searched | Dark branded card | MANUAL REQUIRED |

### Employer Subscription Widget

| Test | Expected | Status |
|---|---|---|
| Pulse stats: "0 Active jobs | 1 Admin users | ✓ Video responses" | All 3 items equal height, dividers between them, ✓ vertically centered | MANUAL REQUIRED |

### Employer Portal V4

| Test | Expected | Status |
|---|---|---|
| `/employers` loads without JS error | Page renders | MANUAL REQUIRED |
| All 9 sections visible on desktop | Hero, trust strip, snapshot, USP, banners, problems, features, hiw, faq, final CTA | MANUAL REQUIRED |
| Mobile: hero renders full width without horizontal scroll | No overflow | MANUAL REQUIRED |
| "Start hiring" CTA routes to `/signup?role=2` | Correct route | MANUAL REQUIRED |
| "Sign in" routes to `/signin` | Correct route | MANUAL REQUIRED |
| FAQ expands items | Correct state toggle | MANUAL REQUIRED |

---

## TEST GAPS (DEFERRED)
- No automated E2E tests (Cypress/Playwright not set up in this project)
- No automated API contract tests for search endpoints
- No regression snapshots for tab/filtering state

## VERDICT
Build PASS. All new logic needs manual smoke tests on production. Automated test coverage gap is pre-existing across the project.
