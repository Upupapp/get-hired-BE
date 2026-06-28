# GETHIRED_SEARCH_EMPLOYER_SPEC_V1
_Generated: 2026-06-28_

## Employer search scope

Employers (recruiters) logged into `/recruiter/*` can search within their own company's data only.

### Company scoping (BOLA guard)
```javascript
async function getCompanyForUser(uid) {
  const result = await db.query(
    'SELECT company_id FROM company_users WHERE uid = $1 LIMIT 1',
    [uid]
  );
  return result.rows.length > 0 ? result.rows[0].company_id : null;
}
```
This resolves company_id from the authenticated user's JWT `uid` → DB lookup. The `company_id` from `req.query` is **ignored**.

### Job search for employers
`GET /api/search/employer?q=developer&status=published`

| Param | Values | Notes |
|---|---|---|
| `q` | string | Full-text search within company's jobs |
| `status` | `published`, `draft`, `closed`, `all` | Employer can see their own draft/closed jobs |
| `sort` | `newest`, `relevance`, `applicants_high` | Relevance by title; applicants_high by applicant count |
| `page` | integer | Pagination |

Response fields added vs. public:
- `status` (published/draft/closed/archived)
- `applicantCount` (from job_applications table)
- `viewCount` (if tracked)
- `draftLabel` when status=draft

### Applicant search for employers (Phase 2)
`GET /api/search/employer?scope=applicants&q=nurse&jobId=xxx`

Currently deferred — `searchEmployerApplicants()` is implemented in `searchService.js` but not exposed in the routing. Will be wired when the employer applicant list page is redesigned.

## What employers CANNOT see
- Other companies' jobs or applicants (company_id scoping).
- Applicant's raw CV URL, video file, protected characteristics.
- Other employers' account information.
