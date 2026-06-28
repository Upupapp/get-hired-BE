# GETHIRED_SEARCH_ROLE_SCOPE_MATRIX_V1
_Generated: 2026-06-28_

## Role × Endpoint matrix

| Role | `/search/public` | `/search/autocomplete` | `/search/employer` | `/search/applicant` |
|---|---|---|---|---|
| **Anonymous visitor** | ✅ published jobs only | ✅ (rate limited 200/15min) | ✗ 401 | ✗ 401 |
| **Authenticated applicant** | ✅ published jobs only | ✅ (no rate limit) | ✗ 403 | ✅ own saved/applied jobs |
| **Authenticated employer** | ✅ published jobs only | ✅ (no rate limit) | ✅ company-scoped only | ✗ 403 |
| **Admin** | ✅ all results | ✅ (no rate limit) | ✅ any company (future) | ✅ any user (future) |

## company_id scoping for employers

```
verifyAuth → uid from Firebase token
  → getCompanyForUser(uid) → SELECT company_id FROM company_users WHERE uid = $1
  → SQL WHERE j.company_id = $companyId (hardcoded, not from request body)
```

The company_id is **never** taken from `req.body`, `req.params`, or `req.query`. It is always resolved from the authenticated user's JWT → DB lookup. This prevents BOLA (Broken Object Level Authorization) — employer cannot see another company's jobs/applicants by spoofing a company_id.

## Draft / unpublished job visibility

| Status | Public | Employer (own) | Admin |
|---|---|---|---|
| `published` | ✅ | ✅ | ✅ |
| `draft` | ✗ | ✅ | ✅ |
| `closed` | ✗ | ✅ | ✅ |
| `archived` | ✗ | ✅ | ✅ |

Public search always adds `WHERE j.status = 'published'`. No client parameter can override this.

## Applicant data isolation

- Applicant `/search/applicant` returns only jobs saved/applied by **that** user (uid from JWT).
- No applicant search that returns other applicants' profiles. Cross-applicant search is an admin-only future feature.
- Employer `searchEmployerApplicants()` is company-scoped: `WHERE ja.company_id = $companyId` where `$companyId` comes from JWT → DB, never from the request.
