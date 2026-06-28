# GETHIRED: Federated Search — Company Spotlight Log V1

## What Is Spotlight

A dark branded card shown at the top of All-tab results when the user's query is a strong company name match. It surfaces the company's profile + top open roles without requiring the user to click through to a company page.

## Trigger Conditions

1. Query length ≥ 2 characters
2. Query length ≤ 80 characters (anti-abuse)
3. Query word count ≤ 5 (company names are short; longer queries are job searches)
4. Best-match score ≥ 60

## Scoring Algorithm (getCompanySpotlight)

```sql
SELECT
  c.*,
  CASE
    WHEN lower(c.company_name) = lower($1) THEN 100  -- exact match
    WHEN lower(c.company_name) LIKE lower($1) || '%' THEN 60  -- prefix
    ELSE 30  -- FTS only
  END AS match_score
FROM gethired.companies c
WHERE (
  lower(c.company_name) = lower($1)
  OR lower(c.company_name) LIKE lower($1) || '%'
  OR to_tsvector('english', coalesce(c.company_name,'')) @@ plainto_tsquery('english', $1)
)
AND c.company_slug IS NOT NULL
AND EXISTS (SELECT 1 FROM gethired.jobs jv WHERE jv.company_id = c.company_id AND jv.job_status_id = 2)
ORDER BY match_score DESC
LIMIT 1
```

Returns null if no company matches or best score < 60.

## Top Jobs Fetch

After finding spotlight company, fetches top 3 active published jobs:

```sql
SELECT job_id, job_title, city, work_setup, employment_type
FROM gethired.jobs
WHERE company_id = $1 AND job_status_id = 2
ORDER BY created_at DESC
LIMIT 3
```

## Rendering

- Shown only on All tab, never on Jobs/Companies tabs
- `showSpotlight` getter: `activeTab === 'all' && !!companySpotlight`
- Placed above the Jobs section heading
- FE component: `SearchSpotlightCardComponent`
- Dark gradient background (`#1a1830 → #2d2b5e`) distinguishes it from job cards
- Entrance animation: `gh-spotlight-in` (fade + 6px slide down), disabled with `prefers-reduced-motion`
