# GETHIRED_SEARCH_FILTER_SPEC_V1
_Generated: 2026-06-28_

## Filter controls (search mode only)

### Work Setup select
| Value | Label | Maps to |
|---|---|---|
| `''` | All setups | No filter |
| `remote` | Remote | `work_setup_name ILIKE 'remote'` |
| `onsite` | Onsite | `work_setup_name ILIKE 'onsite%'` |
| `hybrid` | Hybrid | `work_setup_name ILIKE 'hybrid'` |

### Employment Type select
| Value | Label | Maps to |
|---|---|---|
| `''` | All types | No filter |
| `full-time` | Full-time | `job_type_name ILIKE 'full%'` |
| `part-time` | Part-time | `job_type_name ILIKE 'part%'` |
| `contractor` | Contractor | `job_type_name ILIKE 'contract%'` |

### Sort select
| Value | Label |
|---|---|
| `relevance` | Most relevant |
| `newest` | Newest |
| `salary_high` | Highest salary |

## Filter chip row

Active filters shown as dismissible chips. Each chip shows the filter value and a close button (44px touch target).

- Chip animation: `gh-chip-in` scale 0.9→1 (15ms, disabled if `prefers-reduced-motion`).
- "Clear all" button appears when ≥ 2 active filters.
- Removing a chip updates URL query params → triggers new search.

## URL-driven state

All filters live in the URL:
```
/jobs?q=developer&workSetup=remote&employmentType=full-time&sort=newest&page=2
```

- Browser back/forward navigation works correctly.
- Links are shareable and bookmarkable.
- Filters persist through page refresh.
- No sessionStorage dependency for search state.

## Filter interaction flow

```
User changes select
  → applyFilter(key, value)
    → buildCurrentParams() — merges active q/location/filters
    → router.navigate(['/jobs'], { queryParams: { ...params, page: '1' } })
      → route.queryParams observable fires
        → new search request fires
          → results update
```

## Reset behavior
- "Clear all" → navigate to `/jobs?q=activeQuery` (keeps query, removes all filters).
- "Browse All" → navigate to `/jobs` (no params, exits search mode, shows browse-all layout).
