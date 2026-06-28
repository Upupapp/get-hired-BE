# GETHIRED_SEARCH_APPLICANT_SPEC_V1
_Generated: 2026-06-28_

## Applicant search scope

Authenticated applicants can search/filter their own saved jobs and applications.

### User scoping
`uid` is always taken from the Firebase JWT — never from request body/params.

### Endpoint
`GET /api/search/applicant?q=developer&scope=saved&page=1`

| Param | Values | Notes |
|---|---|---|
| `q` | string | Searches within saved/applied job titles and company names |
| `scope` | `saved`, `applied`, `all` | Filters by saved status; `all` = union |
| `sort` | `newest`, `relevance` | newest = by savedAt/appliedAt DESC |
| `page` | integer | Pagination |

### Response fields
All public job fields (title, company, location, salary, workSetup) plus:
- `savedAt` — when applicant saved this job
- `appliedAt` — when applicant applied (null if only saved)
- `applicationStatus` — `pending`, `reviewed`, `shortlisted`, `rejected`, `hired` (null if only saved)

### What is NOT returned
- Other applicants' data.
- Employer notes/comments about this applicant's application.
- Internal scoring or ranking signals.
- Interview feedback.

## Frontend integration (deferred)
The `searchApplicant(params)` method in `SearchService` (FE) is implemented and ready. The applicant jobs page (`/applicant/jobs` or saved-jobs view) should call this instead of loading all saved jobs. This integration is in the backlog — the service and BE endpoint are ready, the FE integration just needs to be wired to the applicant-side jobs list component.

## Why deferred
The current applicant saved-jobs list is small enough that client-side filtering is acceptable. As the platform grows and applicants accumulate dozens of saved jobs, the server-side search becomes valuable. The infrastructure is ready; the UI wiring is a low-priority follow-up.
