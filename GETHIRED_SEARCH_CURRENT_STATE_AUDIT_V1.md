# GETHIRED_SEARCH_CURRENT_STATE_AUDIT_V1
_Generated: 2026-06-28 | Command: GETHIRED_COMPREHENSIVE_SEARCH_DISCOVERY_RELEVANCE_FEDERATED_FULLSTACK_V1_

## Pre-Implementation Baseline

### What existed before this command

| Surface | Old behavior |
|---|---|
| Public job list `/jobs` | Client-side: loaded ALL published jobs, did `JSON.stringify(job).includes(keyword)` |
| `/jobs/search/:keyword` | Same — `PublicSearchComponent` wrote keyword to sessionStorage, `JobPostsListComponent` read it and filtered in-memory |
| Autocomplete | None |
| Employer job search | None — scroll through own job list |
| Applicant saved jobs | No search/filter |
| Admin applicant search | None |
| BE search routes | None — `/api/search/*` did not exist |
| DB indexes for search | None — no GIN, no functional lower() |

### Problems found
1. **O(n) scaling** — filtering ran on every job ever published on the platform, in the browser, on every keystroke.
2. **No relevance ranking** — keyword match treated title and description identically; a job titled "Developer" for query "developer" ranked same as one that mentioned the word once in a paragraph.
3. **No partial match / fuzzy** — "devoper" (typo) matched nothing.
4. **No synonym awareness** — "WFH" ≠ "remote", "CSR" ≠ "customer service representative", "fresh grad" ≠ "entry level".
5. **No filter-by-location / work-setup / employment-type** on the server — filters were purely cosmetic client decorations.
6. **Applicant PII in client memory** — all job rows loaded into browser for filtering; future addition of salary/company-contact fields would immediately leak them.
7. **No ARIA autocomplete** — users with screen readers had no search assistance.
8. **URL not shareable** — search state in sessionStorage only, not in URL.
