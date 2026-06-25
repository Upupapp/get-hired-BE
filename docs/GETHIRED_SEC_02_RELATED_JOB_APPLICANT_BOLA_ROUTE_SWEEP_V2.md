# GETHIRED SEC-02 — Related BOLA Route Sweep

**Date:** 2026-06-25

---

## Routes Swept

### GET /job/published — `getAllPublishedJobs`
- **Params:** `?id` (optional company filter)
- **Auth:** None (public)
- **Uses uid?** No
- **Risk:** Low. Company filter is optional and safe. Fixed separately for SQLi (parameterized). Returns public job listings only, no applicant data.
- **Classification:** Public-only safe ✅

### GET /job/details — `getJobDetails`
- **Params:** `?id` (jobId), `?uid` (VULNERABLE — pre-fix)
- **Auth:** None before fix; `optionalVerifyAuth` after fix
- **Fix:** SEC-02 — CLOSED in this sprint

### GET /job/applicants — `getAllApplicantOfJob`
- **Params:** `?id` (jobId)
- **Auth:** `verifyAuth` required
- **Uses uid?** Only `req.user.uid` from token (via `getUserCompany`)
- **Ownership check?** Yes — `getJobCompanyId(id) === callerCompany.companyId` (SECURE fix prior sprint)
- **Risk:** None. Uses token uid + company ownership. ✅

### GET /job/applicants/signals — `getJobApplicantFitSignals`
- **Auth:** `verifyAuth`
- **Uses uid?** `req.user.uid` only
- **Ownership check?** Yes — in `getJobApplicantsWithFitSignals` service
- **Classification:** Self-context safe ✅

### GET /job/applicantdetails — `getJobApplicantDetails`
- **Params:** `?jobId`, `?id` (applicant id)
- **Auth:** `verifyAuth`
- **Ownership check?** Yes — `getJobCompanyId(jobId) !== callerCompany.companyId` returns 403 (QA11 fix)
- **Classification:** Recruiter/employer route with proper role/object checks ✅

### DELETE /job/delete — `deleteJob`
- **Auth:** `verifyAuth`
- **Ownership check?** Yes — `WHERE job_id=$1 AND company_id=$2` (P2 fix)
- **Classification:** Safe ✅

### PUT /job/updatejobs — `updateJob`
- **Auth:** `verifyAuth`
- **Ownership check?** Yes — company_id in WHERE clause (F-08 fix)
- **Classification:** Safe ✅

### PUT /job/changestatus — `updateStatusOfJob`
- **Auth:** `verifyAuth`
- **Ownership check?** Yes — company_id in WHERE (QA7 fix)
- **Classification:** Safe ✅

---

## Frontend Sweep

| File | uid usage | Risk | Action |
|------|-----------|------|--------|
| `job/job.service.ts` line 88 | `?uid=${localStorage uid}` | **VULNERABLE** | FIXED: removed uid param |
| `applicant.service.ts` line 15 | `?id=${userId}` param | P2 — BE ignores it | Deferred (P2 backlog) |
| All other job-detail callers | Via `JobFacade.getJobById()` | Inherited from service | All fixed by service fix |

---

## Summary

| Route | Status |
|-------|--------|
| GET /job/details | FIXED (SEC-02) |
| GET /job/published | Safe (no uid param, SQLi fixed) |
| GET /job/applicants | Safe (verifyAuth + company ownership) |
| GET /job/applicants/signals | Safe (verifyAuth + ownership in service) |
| GET /job/applicantdetails | Safe (verifyAuth + ownership check) |
| All mutating job routes | Safe (verifyAuth + company_id WHERE) |

No other routes found that accept a uid/userId/applicantId/candidateId query param for applicant context without authentication and object-level authorization.
