# GETHIRED F-08 — JOB UPDATE AUTHORIZATION CONTRACT
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## Caller Types × Job States → Expected Behavior

### Route: PUT /job/updatejobs

| Caller | Job Ownership | Job State | Expected Result |
|--------|--------------|-----------|-----------------|
| Unauthenticated | N/A | Any | 403 "Unauthorized" (verifyAuth blocks) |
| Authenticated employer — own company | Caller's company | Draft (status=1) | 200 — update succeeds |
| Authenticated employer — own company | Caller's company | Published (status=2) | 200 — update succeeds |
| Authenticated employer — own company | Caller's company | Expired (status=3) | 200 — update succeeds |
| Authenticated employer — own company | Caller's company | Archived (status=4) | 200 — update succeeds |
| Authenticated employer — WRONG company | Different company | Any | 403 "You don't have permission to update this job." |
| Authenticated employer — no company row | N/A | Any | 403 "You don't have permission to update this job." |
| Sequential ID guess (valid job, wrong company) | Different company | Any | 403 (same as wrong company) |
| Spoofed company_id in body | Different company | Any | 403 — body company_id ignored; server derives from JWT |
| Non-existent job ID | N/A | N/A | 403 (zero rows from WHERE clause — safe 404 behavior) |
| Company_id in body for own company | Caller's company | Any | 200 — body value ignored, JWT-derived value used |

---

### Route: PUT /job/changestatus

| Caller | Ownership | Expected Result |
|--------|-----------|-----------------|
| Unauthenticated | N/A | 403 (verifyAuth) |
| Employer — own job | Own | 200 — status updated |
| Employer — other company job | Other | 403 |
| Employer — missing company | N/A | 403 |
| Zero rows in UPDATE | N/A | FORBIDDEN thrown → 403 |

---

### Route: DELETE /job/deleteinterviewquestion

| Caller | Ownership | Expected Result |
|--------|-----------|-----------------|
| Unauthenticated | N/A | 403 |
| Employer — own question | Own company | 200 |
| Employer — other company question | Other | 403 (company_id subquery fails) |

---

## Security Invariants

1. `company_id` in the WHERE clause is ALWAYS derived from `getUserCompany(JWT.uid)` — never from body/query
2. A zero-row UPDATE result always returns 403 regardless of reason (job not found vs wrong company — no distinction leaked)
3. `interviewQuestionsUpdate` is only ever reached after the parent ownership-scoped UPDATE succeeds
4. `saveJobArray` is only ever reached after parent ownership-scoped UPDATE returns a row
5. The `callerCompany.companyId` is now propagated through to `updateQuestionById` for defence-in-depth

---

## Public/Applicant/Admin Flow Boundaries

| Route | Auth Required | Company Scoped |
|-------|--------------|----------------|
| GET /job/published | No | No (shows all published) |
| GET /job/details | No | No (public job detail) |
| GET /job/sharelink | No | No |
| PUT /job/updatejobs | Yes | Yes — JWT company |
| PUT /job/changestatus | Yes | Yes — JWT company |
| GET /job/applicants | Yes | Yes — JWT company |
| GET /job/applicantdetails | Yes | Yes — JWT company |
| DELETE /job/deleteinterviewquestion | Yes | Yes — JWT company |
