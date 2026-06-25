# GetHired Recruiter Interview Hub — Best Practices Plan V1

**Date:** 2026-06-25

---

## Architecture Decisions

### 1. Thin BE endpoint, not FE aggregation
Per-job queries in the FE would require N calls (one per job). A single company-scoped endpoint is more efficient and easier to secure. Matches existing employer dashboard pattern.

### 2. No component-scoped service
`RecruiterInterviewHubService` uses `providedIn: 'root'` — consistent with other employer services in this codebase. No module-scoped provider injection needed.

### 3. Lazy-loaded via existing employer-interview module
The route path `/recruiter/interview` was already lazy-loaded. Reusing the same module avoids touching `employer-panel.module.ts` routes (lower risk of breaking existing routing).

### 4. `interview_answers.applicant_id` → `applicants_profile.applicant_profile_id` join
This is the correct FK path. Directly joining `interview_answers.applicant_id` to `job_applicants.candidate_id` would be wrong — they are different identifier types.

### 5. `LIMIT 200` on hub query
Prevents unbounded result sets for high-volume employers. Pagination can be added as a backlog item.

### 6. `is_archived IS DISTINCT FROM true`
Handles `NULL` correctly — `is_archived` can be NULL (old rows) or false, both meaning "not archived". Standard PostgreSQL idiom.

---

## BOLA Pattern Compliance

All controller functions in this codebase follow:
```js
const callerCompany = await getUserCompany(req.user.uid)
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." })
}
```
`getInterviewHub` follows this pattern exactly.

---

## Error Response Shape

All error responses use `res.status(N).json({ message: "..." })` — consistent with post-STITCH hardened controllers. No bare strings.
