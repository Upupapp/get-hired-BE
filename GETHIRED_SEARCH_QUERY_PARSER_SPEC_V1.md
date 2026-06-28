# GETHIRED_SEARCH_QUERY_PARSER_SPEC_V1
_Generated: 2026-06-28 | File: services/searchQueryParserService.js_

## Constants
| Constant | Value | Reason |
|---|---|---|
| `MAX_QUERY_LENGTH` | 200 | Prevents degenerate tsquery construction |
| `DEFAULT_PAGE_SIZE` | 20 | Standard pagination size |
| `MAX_PAGE_SIZE` | 50 | Prevents fetching entire table in one call |
| `ALLOWED_SORT_FIELDS` | `relevance`, `newest`, `salary_high` | Whitelist prevents SQL injection via ORDER BY |
| `ALLOWED_WORK_SETUPS` | `remote`, `onsite`, `hybrid` | Whitelist prevents injection via filter |

## Functions

### `sanitiseString(raw)`
- Returns `''` if `raw` is null/undefined/non-string.
- Trims whitespace.
- Truncates to `MAX_QUERY_LENGTH`.
- Does NOT strip characters — `plainto_tsquery` handles special chars safely.

### `parseQuery(raw)`
Returns `sanitiseString(raw)`.

### `parseSort(raw)`
Returns `raw` if in `ALLOWED_SORT_FIELDS`, else `'relevance'`. Never passes raw client string to SQL ORDER BY.

### `parseWorkSetup(raw)`
Returns `raw` if in `ALLOWED_WORK_SETUPS`, else `null`. Null = no work_setup filter.

### `parseEmploymentType(raw)`
Returns `raw` if in `['full-time', 'part-time', 'contractor']`, else `null`.

### `parsePage(raw)`
Returns `Math.max(1, parseInt(raw, 10) || 1)`. Always ≥ 1.

### `parsePublicSearchParams(query)`
Convenience wrapper — calls all parsers, returns `{ q, location, workSetup, employmentType, salaryMin, salaryMax, sort, page, limit, offset }`.

## Security guarantees
- **Sort injection:** `parseSort` whitelists the ORDER BY field. SQL never sees raw client string in sort position.
- **Filter injection:** `parseWorkSetup` and `parseEmploymentType` whitelist filter values. No parameterized value used raw in SQL statement structure.
- **Query injection:** All search queries use `plainto_tsquery($n)` with a bound parameter — user string never concatenated into SQL.
- **Pagination:** `limit` and `offset` are integers computed by the parser — never raw client strings used in LIMIT/OFFSET.
