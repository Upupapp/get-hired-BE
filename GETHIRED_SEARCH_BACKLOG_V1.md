# GETHIRED_SEARCH_BACKLOG_V1
_Generated: 2026-06-28_

## P1 — Near-term (next sprint)

| Item | Effort | Notes |
|---|---|---|
| Write automated test suite for search (see TEST_LOG) | 2d | Unit + integration; see GETHIRED_SEARCH_TEST_LOG_V1 for test list |
| Visual QA on iPhone SE (375px) autocomplete dropdown | 2h | Check for clip/overflow |
| Employer job search UI — wire `SearchService.searchEmployer()` to employer job list | 1d | BE ready; FE integration needed |
| Redis-backed rate limiter | 4h | Replace in-memory rate-limit store before multi-instance deploy |

## P2 — Medium-term

| Item | Effort | Notes |
|---|---|---|
| pg_trgm fuzzy matching | 4h | `CREATE EXTENSION pg_trgm; CREATE INDEX ... USING GIN (job_title gin_trgm_ops)`. Handles typos e.g. "Sofware Developer" → "Software Developer". |
| Search analytics events table | 1d | `search_events` table + async BE logging; enables zero-result tracking and query trending |
| Tagalog synonym expansion | 3d | "trabaho" → "job", "guro" → "teacher". Needs crowdsourced or curated dictionary. |
| Applicant saved-jobs search UI | 4h | Wire `searchApplicant()` to saved-jobs list component |
| Salary range filter UI | 4h | Add min/max salary sliders to filter row; BE already supports `salaryMin`/`salaryMax` params |
| Location autocomplete tied to city list | 1d | Instead of free-text location, offer a city picker from a known-cities table |
| Admin search endpoint | 2d | See GETHIRED_SEARCH_ADMIN_SPEC_V1 |

## P3 — Future / Phase 2

| Item | Effort | Notes |
|---|---|---|
| Personalised ranking | 2w | Boost jobs matching applicant's saved skills / location; requires authenticated signal pipeline |
| Click-through signal boosting | 1w | Track which jobs get clicked for a query; feed back into ranking |
| Semantic / embedding search | 1m | pgvector + OpenAI embeddings for "find me jobs like this one" — justify cost before adding |
| Job alerts — save search queries | 1w | Allow users to subscribe to a search query; email when new matching jobs posted |
| "Similar jobs" on job detail page | 3d | Use FTS on existing job's title as query |
| Faceted filters: salary range, experience level | 3d | More filter dimensions on the search results page |
| Multi-language search (Tagalog) | 2w | Requires a Tagalog PostgreSQL text search configuration |
| Employer applicant search UI | 1d | Wire employer-side applicant search; BE service already has `searchEmployerApplicants()` |
| Elasticsearch upgrade path | — | Revisit when job count > 500K rows or DB search latency > 300ms P95 |

## Will NOT do
- Adding Elasticsearch/OpenSearch without explicit product/owner approval.
- Pre-populating "popular searches" with fake/hardcoded data.
- Returning applicant private data (CV URLs, video transcripts) in search results.
- Trusting client-supplied `company_id` for employer-scoped search.
