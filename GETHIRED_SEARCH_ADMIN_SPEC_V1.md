# GETHIRED_SEARCH_ADMIN_SPEC_V1
_Generated: 2026-06-28_

## Admin search scope (deferred)

Admin search across all companies, all applicants, all jobs — including drafts, archived, and closed — is architecturally supported but not yet surfaced in the routing.

### Current admin behavior
- Admin users calling `/api/search/public` receive the same public results as anonymous visitors (published jobs only).
- No special admin-only search endpoint exists yet.

### Planned (backlog)

`GET /api/search/admin?q=...&scope=jobs|applicants|companies|all&status=all`

Admin scope gates:
1. Verify Firebase token has admin role claim (or check `admin_users` table).
2. Remove `WHERE status = 'published'` — admin sees all statuses.
3. Remove company_id scoping — admin sees all companies.
4. Support `scope=applicants` — returns applicant profiles (admin use case: finding a specific candidate).

### Privacy constraints even for admins
- Even admin search should not return raw CV file URLs in the search result list — serve via signed URL in detail view.
- Audit log every admin search query (who searched what, when) — not implemented yet.

### Why deferred
No admin search UI exists. The admin dashboard doesn't have a search bar. This is a future feature.

## Estimated implementation effort
- BE: 2h — add `isAdmin(uid)` check, add admin-scope branch in `searchPublicJobs` with no status filter.
- FE: 1 day — admin search UI, result table, admin-specific fields.
- Tests: 2h.
Total: ~2 days.
