# GETHIRED: Federated Search — Company Search Log V1

## Company Visibility Rule

Companies are surfaced in public search ONLY when:
- `company_slug IS NOT NULL` — they have a public profile slug
- `EXISTS (SELECT 1 FROM gethired.jobs WHERE company_id = c.company_id AND job_status_id = 2)` — they have at least one published/active job

Rationale: showing companies with zero active jobs frustrates job seekers. Only actively hiring companies appear.

## SQL Pattern (searchPublicCompaniesRanked)

```sql
SELECT
  c.company_id, c.company_name, c.company_slug, c.company_logo,
  i.industry_name,
  CONCAT_WS(', ', c.city, c.province) AS location,
  (SELECT COUNT(*) FROM gethired.jobs j2
   WHERE j2.company_id = c.company_id AND j2.job_status_id = 2) AS open_jobs_count
FROM gethired.companies c
LEFT JOIN gethired.industries i ON i.industry_id = c.industry_id
WHERE
  c.company_slug IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM gethired.jobs jv
    WHERE jv.company_id = c.company_id AND jv.job_status_id = 2
  )
  AND (
    to_tsvector('english', coalesce(c.company_name, '')) @@ plainto_tsquery('english', $1)
    OR to_tsvector('english', coalesce(i.industry_name, '')) @@ plainto_tsquery('english', $1)
    OR lower(c.company_name) LIKE lower($1) || '%'
  )
ORDER BY
  ts_rank_cd(to_tsvector('english', coalesce(c.company_name, '')), plainto_tsquery('english', $1)) DESC,
  open_jobs_count DESC,
  c.company_name ASC
LIMIT $2 OFFSET $3
```

## Company Sort Options

| sort param | ORDER BY |
|-----------|---------|
| relevance (default) | ts_rank DESC, open_jobs DESC, name ASC |
| most_open_roles | open_jobs_count DESC, name ASC |
| name_asc | c.company_name ASC |
| newest_posted | MAX(created_at of active jobs) DESC NULLS LAST |

## Response Fields

| Field | Source |
|-------|--------|
| companyId | companies.company_id |
| companyName | companies.company_name |
| companyLogoUrl | companies.company_logo |
| companySlug | companies.company_slug |
| industry | industries.industry_name |
| location | CONCAT_WS(city, province) |
| openJobsCount | COUNT(jobs WHERE status=2) — real DB count, never faked |

## Pagination

- All tab: 4 companies per page
- Companies tab: 12 companies per page
- Total count returned from separate COUNT(*) query
