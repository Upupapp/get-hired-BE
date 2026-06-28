# GETHIRED: Public Search Federated Results — Product Contract V1

## Feature

`GETHIRED_PUBLIC_SEARCH_RESULTS_FEDERATED_JOBS_COMPANIES_ADDON_V1`

Add-on to the existing search system (Phase 1 shipped: `GETHIRED_COMPREHENSIVE_SEARCH_DISCOVERY_RELEVANCE_FEDERATED_FULLSTACK_V1`). Public search now returns **both jobs AND companies** in a single federated response.

---

## User Stories

| # | As a… | I can… | So that… |
|---|-------|--------|---------|
| 1 | Public visitor | search and see All/Jobs/Companies tabs | I choose the result type that matters to me |
| 2 | Job seeker | see company spotlight when I type a company name | I can jump straight to their open roles |
| 3 | Job seeker | see company cards with open role counts | I can discover employers before picking a specific job |
| 4 | Job seeker | type a company name in autocomplete and see how many roles are open | I can shortlist by employer |
| 5 | Job seeker | see partial-results notes when one type is empty | I'm not confused by an empty tab |
| 6 | Any user | tab-switch without losing search text or filters | state is preserved in URL |

---

## Acceptance Criteria

- AC1: `/jobs?q=...` default tab = All; shows jobs AND companies
- AC2: `/jobs?q=...&type=jobs` shows only jobs
- AC3: `/jobs?q=...&type=companies` shows only companies
- AC4: Company spotlight appears on All tab only when a strong (score≥60) company-name match exists
- AC5: Companies section shows only companies with ≥1 published active job
- AC6: Autocomplete company items include sublabel with open role count
- AC7: Zero fake counts, zero fake ratings, zero fake follower counts
- AC8: All existing routes (Apply, Job Detail, CV Doctor, MATCH, Company pages) unaffected
- AC9: Empty states explain which type has results; full-empty state shows when both are empty
- AC10: All tab UI, animations, haptics are mobile-first and reduced-motion safe

---

## Non-goals

- No automatic job application on company click
- No trending/popular/featured company labels (fake data)
- No company rating or review display
- No company follower counts

---

## Status

**SHIPPED** — BE 3f6561c, FE 3542388, deployed to production 2026-06-28.
