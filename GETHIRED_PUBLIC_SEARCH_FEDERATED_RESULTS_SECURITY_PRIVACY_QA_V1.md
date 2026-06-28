# GETHIRED: Federated Search — Security & Privacy QA V1

## Input Validation

| Input | Validation |
|-------|-----------|
| q | `parsePublicSearchParams` strips to 200 chars, sanitizes to alphanumeric+spaces+hyphens |
| type/scope | whitelist: `['all','jobs','companies']` |
| sort | whitelist in `ALLOWED_SORT_FIELDS` |
| limit | capped at 50 |
| page | parsed as integer, min 1 |

## SQL Injection

All queries use parameterized `db.query(sql, [p1, p2, ...])`. No string interpolation of user input into SQL.

## Company Data Privacy

- Company logo URLs: only stored values from companies table, never echoed from user input
- Company slug: read from DB, not constructed from user input
- `open_jobs_count`: computed from jobs table, never taken from request

## BOLA (Broken Object Level Authorization)

Public search is read-only and unauthenticated — no object mutation. `company_id` is never read from the request body; it is only used internally to resolve the company record. No cross-tenant data exposed (all companies in the same schema).

## Public Route Auth

`/search/public` and `/search/autocomplete` use `optionalVerifyAuth` — works for logged-in and anonymous users. Never requires auth.

## Rate Limiting

Inherited from Phase 1: `globalLimiter` covers all `/search/*` routes (100 req/15min per IP).

## Data Disclosed

Company search result discloses: name, slug, industry, city+province, logo URL, open jobs count. All are intentionally public employer data.

## Spotlight

Spotlight company is chosen by matching score — not by a sponsored/paid mechanism. No pay-to-spotlight exists.

## No Fake Claims

- No "verified", "top employer", "featured" labels that aren't backed by real data
- `openJobsCount` is always a real DB count (`COUNT(*) WHERE job_status_id = 2`)
- No follower counts, no ratings, no review scores
