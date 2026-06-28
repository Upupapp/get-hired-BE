# GETHIRED_SEARCH_DB_SCHEMA_V1
_Generated: 2026-06-28 | Migration: db/20260628_search_indexes.sql_

## Indexes Created

### Filter + sort indexes (B-tree)
| Index | Table | Column(s) | Purpose |
|---|---|---|---|
| `idx_jobs_status` | `gethired.jobs` | `status` | Filter `status = 'published'` |
| `idx_jobs_company_status` | `gethired.jobs` | `(company_id, status)` | Employer scope filter |
| `idx_jobs_updated_at` | `gethired.jobs` | `updated_at DESC` | "Newest" sort |
| `idx_companies_slug` | `gethired.companies` | `slug` | Company detail lookup |

### Autocomplete indexes (lower() functional B-tree)
| Index | Table | Expression | Purpose |
|---|---|---|---|
| `idx_jobs_title_lower` | `gethired.jobs` | `lower(job_title)` | ILIKE prefix: `lower(job_title) LIKE lower($1) || '%'` |
| `idx_companies_name_lower` | `gethired.companies` | `lower(company_name)` | ILIKE prefix on company name |
| `idx_jobs_city_lower` | `gethired.jobs` | `lower(city)` | Location suggestion autocomplete |

### Full-text search indexes (GIN)
| Index | Table | Expression | Purpose |
|---|---|---|---|
| `idx_jobs_title_fts` | `gethired.jobs` | `to_tsvector('english', coalesce(job_title,''))` | ts_rank_cd weight A |
| `idx_companies_name_fts` | `gethired.companies` | `to_tsvector('english', coalesce(company_name,''))` | Company FTS |

## tsvector Weight Mapping (ts_rank_cd)

| Weight | Field | Rationale |
|---|---|---|
| A (highest) | `job_title` | Most signal — a title match is almost always what user wants |
| B | `company_name` | "Find jobs at Google" search pattern |
| C | `city` | Location searches when city name overlaps job category |
| D (lowest) | `job_description` | Broad context; low precision if this alone matches |

## Queries (search mode)

```sql
-- Public job search (simplified)
SELECT j.id, j.job_title, j.city, j.salary_min, j.salary_max, j.updated_at,
       c.company_name, c.logo_url, c.slug,
       wt.work_setup_name, jt.job_type_name,
       ts_rank_cd(
         setweight(to_tsvector('english', coalesce(j.job_title,'')), 'A') ||
         setweight(to_tsvector('english', coalesce(c.company_name,'')), 'B') ||
         setweight(to_tsvector('english', coalesce(j.city,'')), 'C') ||
         setweight(to_tsvector('english', coalesce(j.job_description,'')), 'D'),
         plainto_tsquery('english', $1)
       ) AS rank,
       COUNT(*) OVER() AS total_count
FROM gethired.jobs j
JOIN gethired.companies c ON c.id = j.company_id
LEFT JOIN gethired.work_types wt ON wt.id = j.work_setup_id
LEFT JOIN gethired.job_types jt ON jt.id = j.job_type_id
WHERE j.status = 'published'
  AND (
    to_tsvector('english',
      coalesce(j.job_title,'') || ' ' || coalesce(c.company_name,'') || ' ' ||
      coalesce(j.city,'') || ' ' || coalesce(j.job_description,'')
    ) @@ plainto_tsquery('english', $1)
  )
ORDER BY rank DESC, j.updated_at DESC
LIMIT $limit OFFSET $offset
```

## ANALYZE run
Both `gethired.jobs` and `gethired.companies` were ANALYZEd after index creation so the query planner has fresh statistics.
