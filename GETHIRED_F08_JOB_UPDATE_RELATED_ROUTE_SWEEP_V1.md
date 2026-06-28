# GETHIRED F-08 — RELATED ROUTE SWEEP
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## All Job State-Changing Routes Audited

### PUT /job/updatejobs — updateJob()
- verifyAuth: YES
- getUserCompany: YES
- WHERE company_id: YES (AND company_id=$20)
- Zero-row check: YES
- **Status: SECURE**

### PUT /job/changestatus — updateStatusOfJob()
- verifyAuth: YES
- getUserCompany: YES (calls getUserCompany, derives companyId from JWT)
- WHERE company_id: YES — `updateJobStatus()` uses `WHERE job_id=$2 AND company_id=$3`
- Zero-row check: YES — throws "FORBIDDEN" on zero rows → 403
- **Status: SECURE** (fixed in prior QA7 sprint)

### POST /job/create — createJobs()
- verifyAuth: YES
- getUserCompany: YES — companyId derived from JWT, never body
- No ownership check needed (creating, not updating)
- **Status: SECURE** (fixed in prior QA8 sprint)

### DELETE /job (commented out route)
- Route `router.delete("/jobs/delete", deleteJob)` is COMMENTED OUT
- Active delete route does not exist
- `deleteJob()` function exists and has ownership check (AND company_id=$2)
- **Status: N/A — Route inactive**

### DELETE /job/deleteinterviewquestion — deleteInterviewQuestion()
- verifyAuth: YES
- getUserCompany: YES
- WHERE company_id: YES — subquery through job_interview_template
- Zero-row check: YES
- **Status: SECURE** (fixed in prior QA9 sprint)

### GET /job/applicants — getAllApplicantOfJob()
- verifyAuth: YES
- getJobCompanyId + getUserCompany ownership check: YES
- **Status: SECURE** (read-only, previously fixed)

### GET /job/applicantdetails — getJobApplicantDetails()
- verifyAuth: YES
- getUserCompany + getJobCompanyId comparison: YES
- **Status: SECURE**

### GET /job/applicants/signals — getJobApplicantFitSignals()
- verifyAuth: YES
- Ownership checked inside `getJobApplicantsWithFitSignals` service
- **Status: SECURE**

### GET /job/getsubscriptionrestrictions — getSubscriptionRestrictions()
- verifyAuth: YES
- getUserCompany (derives companyId from JWT): YES
- **Status: SECURE** (fixed in prior QA10 sprint)

---

## Public Routes (No Ownership Required)

| Route | Auth | Ownership | Notes |
|-------|------|-----------|-------|
| GET /job/published | None | None | Shows all published jobs — correct |
| GET /job/details | None | None | Public job detail — correct |
| GET /job/sharelink | None | None | Dynamic link generation — correct |
| GET /job/basiclist | verifyAuth | None (accepts companyId param) | P2: should derive from JWT |
| GET /job/expiredlist | verifyAuth | None (accepts companyId param) | P2: should derive from JWT |
| GET /job/industries | verifyAuth | None | Options list — no ownership needed |
| GET /job/badges | verifyAuth | None | Options list — no ownership needed |
| GET /job/rolelist | verifyAuth | None | Options list — no ownership needed |
| GET /job/categories | verifyAuth | None | Options list — no ownership needed |

---

## P2 Items (Deferred — Not BOLA-Critical for Update Flow)

### /job/basiclist and /job/expiredlist
- Accept `id` query param as companyId
- An authenticated employer could supply a different company's companyId to see their job list
- Risk: Information disclosure (job titles, status), NOT mutation
- No write capability through this endpoint
- **Deferred to P2 backlog** — see BACKLOG file

### Commented-out deleteJob route
- Function is implemented and secure but route is disabled
- If re-enabled, the ownership check is already in place
- **No action needed**

---

## Summary

All job-mutating routes have ownership checks. No unprotected mutation paths exist. Two read-only routes accept client-supplied companyId (P2 information disclosure, not mutation BOLA).
