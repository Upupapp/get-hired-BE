# GETHIRED SEC-02 — Security Design Contract

**Endpoint:** GET /job/details  
**Date:** 2026-06-25

---

## Identity Source

**Trusted:** `req.user.uid` — set by `optionalVerifyAuth` from Firebase JWT  
**Forbidden:** `req.query.uid`, `req.query.userId`, `req.query.applicantId`, `req.query.candidateId`, `req.query.profileId`, `req.params.uid`, `req.body.uid`, localStorage uid, NgRx uid

---

## Public Job Fields (safe for all callers)

- jobId, jobTitle, companyName, companyLogo, companyDetails
- jobDescription, jobDuties, jobAddress, jobCity, jobCountry
- jobTypeId, jobTypeName, workSetupId, workSetupName, jobLevelId
- industryId, industryName, salaryMinimum, salaryMaximum, salaryCurrency, rate
- requirements, goodToHave, educationalBackground, skills, tags, badges
- interviewQuestions (prompts only, if product shows them publicly)
- jobStatusId, createdAt

---

## Private Viewer Fields (token-derived only)

- `isApplied` — whether the authenticated caller has applied to this job
- Any future: savedJob state, applicationStatus, applicationId

---

## Route Behavior Matrix

| Case | Auth | uid query | Result |
|------|------|-----------|--------|
| No token, no uid | None | — | 200 public job |
| No token, uid supplied | None | Any | 200 public job only; uid ignored |
| Invalid/expired token | Bearer (invalid) | — | 401 |
| Applicant A, no uid | Valid | — | 200 public + isApplied for A |
| Applicant A, uid=A | Valid | matches | 200 public + isApplied for A (uid ignored; token used) |
| Applicant A, uid=B | Valid | mismatch | 403 "Unable to load this job for the current session." |
| Employer, uid=applicant | Valid | any | 403 if mismatch; public-only if no uid |
| Admin, uid=any | Valid | any | 403 if mismatch; public-only if no uid |
| Alternate param names | Any | userId/applicantId/candidateId | same policy |
| Non-public job | Any | — | 404/403 per existing job service |

---

## Mismatch Policy

- **Authenticated + uid ≠ token uid:** 403 with generic message. Log `SEC_02_JOB_DETAILS_UID_PARAM_PROBE_BLOCKED`.
- **Unauthenticated + uid supplied:** Return public job only. Do not log (low-severity, may be stale client).
- **Authenticated + uid = token uid:** Use token uid (backward compat). Safe.

---

## Logging Policy

Log event: `SEC_02_JOB_DETAILS_UID_PARAM_PROBE_BLOCKED`  
Fields logged: `endpoint`, `jobId` (safe public id), `suppliedParam` (param name only), `action`  
Never log: full uid, token, applicant history, profile data, email

---

## Error Messages

| Condition | Message |
|-----------|---------|
| BOLA mismatch | "Unable to load this job for the current session." |
| Backend error | "Unable to load this job. Please try again." |
| Session expired (401) | "Your session has expired. Please sign in again." |
| Invalid token (401) | "Unable to verify your session. Please sign in again." |

---

## Split-Endpoint Backlog

The current implementation keeps a single `/job/details` route for backward compatibility. The long-term secure pattern is:
- `GET /job/details?id=...` → public job data only (no viewerContext at all)
- `GET /applicant/job-context?jobId=...` → applicant's own viewerContext (requires verifyAuth, not optional)
- `GET /recruiter/applications/:applicationId` → recruiter-owned applicant context

See `GETHIRED_SEC_02_BACKLOG_V2.md` for the refactor backlog.
