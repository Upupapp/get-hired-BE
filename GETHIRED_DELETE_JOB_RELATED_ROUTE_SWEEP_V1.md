# GETHIRED DELETE JOB — Related Route Sweep V1

**Date:** 2026-06-25

---

## Scope: All job-destructive or job-mutating routes

| Route | Method | Auth | Ownership-Scoped Query | Status |
|-------|--------|------|------------------------|--------|
| `/job/create` | POST | verifyAuth | company_id from getUserCompany() — INSERT uses server-derived companyId | PASS |
| `/job/updatejobs` | PUT | verifyAuth | WHERE job_id=$19 AND company_id=$20 RETURNING * | PASS |
| `/job/changestatus` | PUT | verifyAuth | WHERE job_id=$2 AND company_id=$3 RETURNING * | PASS |
| `/job/delete` | DELETE | verifyAuth | WHERE job_id=$1 AND company_id=$2 RETURNING job_id | PASS (fixed) |
| `/job/deleteinterviewquestion` | DELETE | verifyAuth | DELETE WHERE template_question_id=$1 AND job_interview_template_id IN (subquery WHERE company_id=$2) | PASS |
| `/job/applicants` | GET | verifyAuth | getJobCompanyId + callerCompany comparison | PASS |
| `/job/applicants/signals` | GET | verifyAuth | Ownership enforced in employerApplicantSignalsService | PASS |
| `/job/applicantdetails` | GET | verifyAuth | getJobCompanyId + callerCompany comparison | PASS |
| `/job/getsubscriptionrestrictions` | GET | verifyAuth | company from getUserCompany() | PASS |
| `/job/basiclist` | GET | verifyAuth | company from getUserCompany() | PASS |
| `/job/expiredlist` | GET | verifyAuth | company from getUserCompany() | PASS |
| `/job/published` | GET | NONE (public) | N/A — public list endpoint | PASS |
| `/job/details` | GET | NONE (public) | N/A — public detail endpoint | PASS |
| `/job/sharelink` | GET | NONE (public) | N/A — shareable link only | PASS |

---

## Sweep Findings

**All routes are either:**
- Protected with `verifyAuth` and ownership-scoped via `getUserCompany()` + WHERE clause, OR
- Intentionally public (published list, job details, share link)

**No additional BOLA gaps found in the related route sweep.**

---

## Previously Fixed (Referenced)

- F-07: deleteJob (this sprint)
- F-08: updateJob (prior sprint)
- QA7 FIX-1: updateStatusOfJob (prior sprint)
- QA8 FIX-2: createJobs (prior sprint)
- QA9 FIX-6: deleteInterviewQuestion (prior sprint)
- QA11 FIX-02: getJobApplicantDetails (prior sprint)
- SECURE fix: getAllApplicantOfJob (prior sprint)
