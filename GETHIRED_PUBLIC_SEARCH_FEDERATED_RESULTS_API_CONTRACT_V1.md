# GETHIRED: Federated Search — API Contract V1

## GET /search/public

### Query Parameters

| Param | Type | Values | Notes |
|-------|------|--------|-------|
| q | string | any | search query |
| type | string | all\|jobs\|companies | tab / result type (alias: scope) |
| scope | string | all\|jobs\|companies | legacy alias, still accepted |
| location | string | any | city/province filter |
| workSetup | string | remote\|onsite\|hybrid | |
| employmentType | string | full-time\|part-time\|contractor | |
| salaryMin | number | | |
| salaryMax | number | | |
| sort | string | relevance\|newest\|salary_high\|most_open_roles\|newest_posted\|name_asc | |
| page | number | ≥1 | |
| limit | number | max 50 | |

### Response Shape (Federated)

```json
{
  "query": "accenture",
  "type": "all",
  "counts": {
    "all": 47,
    "jobs": 43,
    "companies": 4
  },
  "groups": {
    "jobs": {
      "items": [ /* SearchJobResult[] */ ],
      "total": 43,
      "hasMore": true,
      "page": 1,
      "limit": 12
    },
    "companies": {
      "items": [ /* SearchCompanyResult[] */ ],
      "total": 4,
      "hasMore": false,
      "page": 1,
      "limit": 4
    }
  },
  "companySpotlight": {
    "companyId": "uuid",
    "companyName": "Accenture",
    "companyLogoUrl": "https://...",
    "companySlug": "accenture",
    "industry": "IT Services",
    "location": "Makati City, Metro Manila",
    "openJobsCount": 43,
    "topJobs": [
      { "jobId": "uuid", "title": "Software Engineer", "location": "Makati", "workSetup": "Hybrid", "employmentType": "Full-time" }
    ]
  },
  "appliedFilters": {
    "location": null,
    "workSetup": null,
    "employmentType": null,
    "salary": { "min": null, "max": null },
    "sort": "relevance"
  },
  "emptyRecovery": null,
  "latencyMs": 42
}
```

### SearchJobResult Shape

```json
{
  "type": "job",
  "jobId": "uuid",
  "title": "Software Engineer",
  "companyName": "Accenture",
  "companyLogoUrl": "https://...",
  "companySlug": "accenture",
  "location": "Makati City",
  "workSetup": "Hybrid",
  "employmentType": "Full-time",
  "salary": { "isPublic": true, "min": 50000, "max": 80000, "currency": "PHP" },
  "postedAt": "2026-06-20T00:00:00Z",
  "updatedAt": "2026-06-25T00:00:00Z",
  "jobBanner": null
}
```

### SearchCompanyResult Shape

```json
{
  "type": "company",
  "companyId": "uuid",
  "companyName": "Accenture",
  "companyLogoUrl": "https://...",
  "companySlug": "accenture",
  "industry": "IT Services",
  "location": "Makati City, Metro Manila",
  "openJobsCount": 43
}
```

### emptyRecovery Shape

```json
{
  "type": "jobs_missing|companies_missing|empty",
  "message": "No matching jobs found. Showing companies only."
}
```

---

## GET /search/autocomplete

### Query Parameters

| Param | Type | Notes |
|-------|------|-------|
| q | string | min 2 chars |

### Response Shape (enriched)

```json
{
  "query": "acc",
  "groups": {
    "jobs": [
      { "type": "job_title", "label": "Accountant", "url": "/jobs?q=Accountant" }
    ],
    "companies": [
      {
        "type": "company",
        "label": "Accenture",
        "sublabel": "43 open roles",
        "logoUrl": "https://...",
        "url": "/companies/accenture",
        "slug": "accenture"
      }
    ],
    "locations": [
      { "type": "location", "label": "Alabang", "url": "/jobs?location=Alabang" }
    ]
  },
  "suggestions": [
    /* flat array of all items above + shortcuts */
  ]
}
```

---

## Pagination Rules

| Tab | Default limit | Notes |
|-----|--------------|-------|
| All — jobs | 12 | separate from companies |
| All — companies | 4 | |
| Jobs tab | 20 | standard job pagination |
| Companies tab | 12 | |

---

## Company Visibility Rule

Companies appear in results ONLY when:
1. `company_slug IS NOT NULL`
2. `EXISTS (SELECT 1 FROM jobs WHERE company_id = c.company_id AND job_status_id = 2)`

Published job status = 2.
