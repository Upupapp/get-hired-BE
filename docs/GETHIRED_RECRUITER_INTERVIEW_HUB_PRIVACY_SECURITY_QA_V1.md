# GetHired Recruiter Interview Hub — Privacy & Security QA V1

**Date:** 2026-06-25

---

## Security Verification

### BOLA (Object-Level Authorization)

| Check | Result |
|-------|--------|
| Company ID sourced from JWT, not query/body | PASS — `getUserCompany(req.user.uid)` pattern |
| Company ID used in WHERE clause as $1 | PASS — `WHERE j.company_id = $1` |
| Array/null check on callerCompany before use | PASS — `if (Array.isArray(callerCompany) \|\| !callerCompany \|\| !callerCompany.companyId)` |
| Returns 403 JSON on unauthorized | PASS — `res.status(403).json({ message: "You don't have permission to do that." })` |
| `verifyAuth` middleware on route | PASS — `router.get("/interview/hub", verifyAuth, getInterviewHub)` |

### Cross-company Data Leak

| Check | Result |
|-------|--------|
| Only jobs owned by caller's company returned | PASS — `JOIN jobs j ON j.job_id = ja.job_id` + `WHERE j.company_id = $1` |
| Archived applications excluded | PASS — `AND ja.is_archived IS DISTINCT FROM true` |
| Video answer URLs not exposed in list | PASS — only `video_answer_count` (integer) returned |

### PII Handling

| Field | Returned? | Rationale |
|-------|-----------|-----------|
| applicantName | Yes | Employer needs to identify applicant |
| applicantEmail | Yes | Employer already has this (hired them via job post) |
| applicantPhotoUrl | Yes | Visible in candidate list already |
| Full profile | No | Deep-link to contacts/candidate-list for that |
| Raw video URLs | No | Never in list endpoints — review is deliberate action |
| Government IDs | No | Never returned outside dedicated profile endpoint |

### SQL Injection

- All dynamic values parameterized (`$1` only)
- `dbSchema` comes from `env.js` (server-side config), not user input

### Rate Limiting

- No express-rate-limit on this endpoint (repo-wide gap, pre-existing)
- Logged in backlog

---

## Privacy

- Protected attributes (gender, age, religion, disability) are never stored in `job_applicants` or `users` tables
- No demographic inference from video answers
- `applicantPhotoUrl` is the user's own uploaded avatar, not a face analysis result
