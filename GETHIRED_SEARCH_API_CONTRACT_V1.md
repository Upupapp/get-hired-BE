# GETHIRED_SEARCH_API_CONTRACT_V1
_Generated: 2026-06-28 | Routes: routes/searchRoutes.js_

## Endpoints

### GET /api/search/public
Public job search. Open to anonymous users and authenticated users.

**Auth:** `optionalVerifyAuth` — presence of valid Firebase token enriches results; absence is allowed.

**Query params:**
| Param | Type | Max | Default | Notes |
|---|---|---|---|---|
| `q` | string | 200 chars | — | Full-text query. Synonyms expanded before tsquery. |
| `location` | string | 200 chars | — | ILIKE match on city column |
| `workSetup` | enum | — | — | `remote`, `onsite`, `hybrid` — whitelisted |
| `employmentType` | enum | — | — | `full-time`, `part-time`, `contractor` — whitelisted |
| `salaryMin` | integer | — | — | Min salary filter |
| `salaryMax` | integer | — | — | Max salary filter |
| `sort` | enum | — | `relevance` | `relevance`, `newest`, `salary_high` — whitelisted |
| `page` | integer | — | 1 | 1-based page number |

**Response 200:**
```json
{
  "results": [
    {
      "jobId": "uuid",
      "title": "string",
      "companyName": "string",
      "companySlug": "string",
      "companyLogoUrl": "string|null",
      "location": "string|null",
      "workSetup": "string|null",
      "employmentType": "string|null",
      "salaryMin": 25000,
      "salaryMax": 50000,
      "salaryCurrency": "PHP",
      "postedAt": "2026-06-28T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "hasMore": true,
    "totalPages": 8
  }
}
```

**Fields never returned:** `job_description` full text, applicant count, internal notes, draft fields, employer contact details.

---

### GET /api/search/autocomplete
Federated suggest: job titles + company names + locations.

**Auth:** `optionalVerifyAuth`  
**Rate limit:** 200 requests / 15 minutes for **anonymous** requests only. Authenticated users skip the rate limiter.

**Query params:**
| Param | Required | Notes |
|---|---|---|
| `q` | yes | 1–200 chars |
| `scope` | no | `jobs` (default), `companies` |

**Response 200:**
```json
{
  "suggestions": [
    { "type": "job_title", "label": "Software Developer", "count": 24 },
    { "type": "company", "label": "Accenture", "logoUrl": "...", "slug": "accenture" },
    { "type": "location", "label": "Cebu City" }
  ]
}
```
Grouped by type. Max 8 per type. Empty array if `q` < 1 char.

---

### GET /api/search/employer
Company-scoped job search for logged-in employer/recruiter.

**Auth:** `verifyAuth` required. `company_id` resolved from JWT → DB (`company_users` table), never from request body.

**Query params:** `q`, `status` (`published|draft|closed|all`), `sort`, `page`

**Response:** same shape as `/public` but includes `status`, `applicantCount`, `viewCount`. Never includes other companies' data.

---

### GET /api/search/applicant
Authenticated applicant's saved/applied jobs search.

**Auth:** `verifyAuth` required. `user_id` resolved from JWT, never from body.

**Query params:** `q`, `scope` (`saved|applied|all`), `page`

**Response:** job cards same shape as public + `savedAt`, `appliedAt`, `applicationStatus`.

---

## Error responses (all endpoints)
```json
{ "error": "INVALID_QUERY", "message": "Query must not exceed 200 characters" }
{ "error": "INVALID_SORT", "message": "Sort must be one of: relevance, newest, salary_high" }
{ "error": "UNAUTHORIZED", "message": "Authentication required" }
{ "error": "FORBIDDEN", "message": "Not authorized for this resource" }
{ "error": "INTERNAL_ERROR", "message": "Search temporarily unavailable" }
```
Raw SQL errors are **never** returned. `INTERNAL_ERROR` is the terminal fallback for unexpected DB failures.
