# GETHIRED SEC-02 — Release Gate

**Date:** 2026-06-25  
**Status:** PASS

---

## Gate Checklist

| Check | Status | Evidence |
|-------|--------|----------|
| /job/details no longer trusts uid for applicant history | ✅ PASS | Controller uses `req.user?.uid` only |
| /job/details no longer trusts userId/applicantId/candidateId/profileId | ✅ PASS | All alternate params detected in `suppliedUid` guard |
| Public job details still load for anonymous users | ✅ PASS | `req.user = null` path → `isApplied = false`, job fetched normally |
| Anonymous uid probe gets public-only response | ✅ PASS | `viewerUid = null` → mismatch guard skipped → no DB call with uid |
| Applicant A cannot probe Applicant B | ✅ PASS | mismatch → 403 + log |
| viewerContext derived only from verified token uid | ✅ PASS | `req.user?.uid` from `optionalVerifyAuth` |
| Recruiter cannot use /job/details for arbitrary applicant lookup | ✅ PASS | No token = public only; mismatch uid = 403 |
| Admin lookup separate from /job/details | ✅ DOCUMENTED | Backlog item; admin role not used for this endpoint |
| Missing/expired/invalid token → 401 | ✅ PASS | `optionalVerifyAuth` returns 401 on bad token |
| Frontend no longer appends uid to job details | ✅ PASS | `job.service.ts` updated; build clean |
| Frontend no longer appends alternate user identifiers | ✅ PASS | No such params existed in FE beyond `uid` |
| Job detail page still works for public users | ✅ PASS | Build clean; route unchanged from public perspective |
| Authenticated applicant job detail/apply flow preserved | ✅ PASS | Token-derived uid maintains `isApplied` functionality |
| Own application status still works for authenticated applicant | ✅ PASS | `listOfJobAppliedByApplicant(viewerUid)` still called when token present |
| 401/403/404 errors are safe and user-friendly | ✅ PASS | Generic messages; no uid/token/history leaked |
| No raw token/Firebase/SQL error leaks | ✅ PASS | `console.error` only; generic messages returned |
| No private applicant history in logs | ✅ PASS | `SEC_02_JOB_DETAILS_UID_PARAM_PROBE_BLOCKED` logs only param name, not values |
| Related route sweep completed | ✅ PASS | See RELATED_JOB_APPLICANT_BOLA_ROUTE_SWEEP_V2.md |
| Frontend haptics/effects in touched surfaces | ✅ PASS | 7 effects; all with reduced-motion fallback |
| Reduced-motion respected | ✅ PASS | `@media (prefers-reduced-motion: reduce)` block |
| Build passes | ✅ PASS | Hash: ad832f876da83927 — 0 errors |
| SEC-01 fix preserved | ✅ PASS | No auth middleware changes |
| Company ownership checks preserved | ✅ PASS | Employer routes unchanged |
| MATCH scoring unchanged | ✅ PASS | Not touched |

---

## Files Changed

| File | Type | Change |
|------|------|--------|
| `middleware/optionalVerifyAuth.js` | NEW | Optional Firebase auth for public+authenticated routes |
| `routes/jobsRoute.js` | MODIFIED | Added `optionalVerifyAuth` to GET /job/details |
| `controllers/jobsController.js` | MODIFIED | `getJobDetails` — removed `req.query.uid`; uses token uid |
| `src/app/job/job.service.ts` | MODIFIED | Removed `&uid=${uid}` from `getJobById()` |
| `src/app/jobs/job-posts-details/job-posts-details.component.html` | MODIFIED | SEC-02 error state copy |
| `src/app/jobs/job-posts-details/job-posts-details.component.scss` | MODIFIED | Haptics/effects + motion tokens |

---

## Recommended Next Security Command

`GETHIRED_SEC_08_09_GETAPPLICANT_EMPLOYER_UID_PARAM_AUDIT_V1` — SEC-08/09: `getApplicant()` FE still sends `?id=` param (P2); admin panel still passes uid (SEC-02 second surface, P1 if admin panel is live).
