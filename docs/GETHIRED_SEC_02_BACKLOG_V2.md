# GETHIRED SEC-02 — Backlog

**Date:** 2026-06-25

---

## Deferred / Out of Scope for This Sprint

### B-01: Split-endpoint refactor (P2)
The secure long-term pattern is to separate public job data and applicant viewer context into different endpoints:
- `GET /job/details?id=...` → public job data only (no auth, no viewerContext)
- `GET /applicant/job-context?jobId=...` → applicant's own viewerContext (requires full `verifyAuth`, not optional)

This eliminates the optional-auth complexity and makes the public endpoint provably free of private data. Deferred because the current fix is safe and a split-endpoint refactor requires FE changes to all 8 `getJobById` consumers.

### B-02: `getApplicant()` FE still sends `?id=` (P2 from prior audit)
`applicant.service.ts:15` sends `?id=${userId}`. The BE ignores this param, but the FE cleanup deferred. Related to SEC-02 but not the same vulnerability (BE already safe).

### B-03: Admin panel applicant uid passing (SEC-02 second surface, P1 if admin panel active)
From prior audit: admin panel still passes uid to some endpoints. Admin repo is currently empty (see GetHired project memory). Not a blocking issue today but should be addressed before admin panel is live.

### B-04: Employer/recruiter job preview with applicant context
The current fix returns 403 if an employer token is used with an applicant uid on `/job/details`. If an employer legitimately needs to preview applicant context for their own job (e.g., a "preview this job as the applicant sees it" feature), a separate employer-owned endpoint is needed:
- `GET /recruiter/job-context?jobId=<job>&applicantId=<applicant>` with:
  - `verifyAuth` (required)
  - company ownership of the job
  - applicant must have applied to that job
  - return only application-level context (not full applicant profile)

### B-05: `listOfJobAppliedByApplicant` returns full row (minor)
Service returns `jobApplicationId`, `jobId`, `dateApplied`, `candidateId`, `applicationStatusId` for the entire applicant history, but the controller only uses the count (`filtered.length != 0`). A purpose-built query returning only a boolean or count would be more minimal. Low priority — the data is now only ever queried for the authenticated token uid.
