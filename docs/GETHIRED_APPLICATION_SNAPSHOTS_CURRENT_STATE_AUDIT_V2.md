# GETHIRED APPLICATION SNAPSHOTS — Phase 1: Current State Audit

**Command:** GETHIRED_APPLICATION_SNAPSHOTS_COMPLETENESS_MATCH_SNAPSHOT_WORLD_CLASS_V2
**Date:** 2026-06-24

## Summary
At the start of this command, GetHired had NO application snapshot persistence. Every time an employer viewed an applicant, the match signals were recomputed live from current profile data. If an applicant updated their profile after submitting, the employer saw the updated profile rather than what was submitted.

## Existing Infrastructure (Pre-Command)

### Database Tables
- `gethired.job_applicants` — 6 columns: `job_application_id`, `job_id`, `date_applied`, `candidate_id`, `application_status_id`, `is_archived`
- `gethired.applicants_profile` — full profile (no snapshot association)
- `gethired.applicant_certificates`, `gethired.applicant_educational_background`, `gethired.applicant_skills` — profile sub-tables
- `gethired.applicant_covered_letter`, `gethired.applicant_resume`, `gethired.applicant_government_files` — document upload tables (linked by `applicant_id`, not `application_id`)
- `gethired.interview_answers` — video interview answers (linked by `job_id`+`applicant_id`)

### Backend Services
- `services/applicant.service.js` → `appplicantProfile(uid)` — fetches full live profile
- `services/applicantProfileQualityService.js` → `evaluateProfileCompleteness(profile)` — existing WEIGHTS-based scoring (basicInfo:20, workSetupPrefs:10, salaryPrefs:10, workExperience:20, education:15, skills:15, photoOrVideo:10). Already existed but was never persisted.
- `services/match/employerApplicantSignalsService.js` → `getApplicantFitSignals(uid, jobId)` — MATCH v5. Never persisted. Fair hiring constraints: never ranks/rejects/hides applicants, no protected attributes.
- `services/job.service.js` → `jobDetails(jobId)`, `jobApplicants(jobId)`, `applicationOfApplicant(jobId, uid)`
- `services/application.service.js` → `jobApply()` — no snapshot creation whatsoever

### Application Submit Flow
`POST /application/apply` → `submitApplication()` → `jobApply()`:
1. Duplicate check
2. INSERT into `job_applicants` (5 cols + `is_archived`)
3. Upload cover letter, resume, government files (stored in separate tables by `applicant_id`, not `application_id`)
4. Save interview answers (`interview_answers` by `job_id`+`applicant_id`)
5. Fetch user profile for email
6. Fetch job for email
7. Send application notification email
8. Return application row

**Gap:** No snapshot of submitted state, no completeness scoring at submit time, no match persistence.

## Gaps Identified
1. No `application_snapshots` table — submitted profile state not preserved
2. No `application_completeness_snapshots` table — completeness score not persisted
3. No `match_snapshots` table — match signals recomputed live (employer may see post-submission profile changes)
4. `job_applicants` mapper doesn't include `job_application_id` as `applicationId` in API response
5. No BE endpoint for employer to fetch snapshot summary
6. No BE endpoint for applicant to review their own application snapshot
7. No FE display of snapshot data in employer applicant detail or applicant application history
