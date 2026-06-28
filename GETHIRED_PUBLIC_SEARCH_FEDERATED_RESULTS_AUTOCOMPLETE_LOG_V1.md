# GETHIRED: Federated Search — Autocomplete Log V1

## Upgrades in This Add-on

### Company Suggestions

**Before:** `{ type, label, url }`

**After:** `{ type, label, sublabel, logoUrl, url, slug }`

- `sublabel`: "N open role(s)" — real count from DB, only shown when > 0
- `logoUrl`: `company_logo` column value or null
- `slug`: `company_slug` — used by FE for deep-linking
- Filtered to companies with active published jobs (same rule as company search)

### Response Shape

Added `groups` object to the autocomplete response:

```json
{
  "query": "acc",
  "groups": {
    "jobs":      [ { type: "job_title", label, url } ],
    "companies": [ { type: "company", label, sublabel, logoUrl, url, slug } ],
    "locations": [ { type: "location", label, url } ]
  },
  "suggestions": [ /* flat union of all above + shortcuts */ ]
}
```

The flat `suggestions` array is preserved for backwards compatibility with `SearchAutocompleteComponent` which iterates it. The `groups` object is available for future FE enhancements (grouped dropdown UI).

### Shortcut Additions

- **Career shortcut**: `{ type: "shortcut", label: "Check your CV Health", url: "/user/cv-doctor" }` — shown when query contains career keywords (cv, resume, career, apply, health)
- **Browse companies shortcut**: `{ type: "shortcut", label: "See all companies on GetHired", url: "/jobs?q=...&type=companies" }` — shown when at least 1 company matched

## getCompanySuggestions SQL

```sql
SELECT
  c.company_name, c.company_slug, c.company_logo,
  (SELECT COUNT(*) FROM gethired.jobs j2
   WHERE j2.company_id = c.company_id AND j2.job_status_id = 2) AS open_jobs_count
FROM gethired.companies c
WHERE lower(c.company_name) LIKE lower($1) || '%'
  AND c.company_slug IS NOT NULL
  AND EXISTS (SELECT 1 FROM gethired.jobs jv
              WHERE jv.company_id = c.company_id AND jv.job_status_id = 2)
ORDER BY c.company_name
LIMIT 5
```

Uses `idx_companies_name_lower` GIN index from Phase 1 migration.
