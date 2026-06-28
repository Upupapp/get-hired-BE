# GETHIRED POST-PUBLISH JOB APPLICANTS PIPELINE — Handoff Log V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Applicant Panel on Dashboard

The dashboard includes an applicant panel section showing:
- "No applicants yet" (empty state — NOT "0 applicants", NOT a fake count)
- "Applicants will appear here when candidates apply." (honest copy)
- "Review applicants" button → navigates to `/recruiter/jobs/applicants?id=<jobId>`

## Why No Count Is Shown

B05 mission rule: NEVER fake applicant counts or analytics.  
The dashboard loads immediately after publish — applicants will genuinely be zero at that moment.  
Showing "0" is technically accurate but creates a poor first impression and is easy to misread.  
The honest empty state copy sets correct expectations without misrepresentation.

## Applicant Review Route

- Route: `/recruiter/jobs/applicants?id=<jobId>` — maps to `EmployerApplicantsComponent`
- Component: `employer-applicants.component.html` → `<app-job-applicants>` → `JobApplicantsComponent`
- Fully functional with MATCH signals, applicant details, video CV review, action modal
- UNCHANGED by this mission

## Fallback for Empty Pipeline

If a recruiter clicks "Review applicants" on a just-published job:
- `JobApplicantsComponent.ngOnInit()` calls `jobFacade.getApplicants(this.jobId)`
- BE `/job/applicants?id=<jobId>` returns `[]` for a job with no applicants
- `applicants$` observable emits `[]`
- Table renders empty (existing empty-state handling in the applicants component)

## Preserved Applicant Flows

- `getJobApplicantsByJobId` — unchanged
- `getJobApplicantDetails` — unchanged
- `ApplicantActionModalComponent` — unchanged
- `loadMatchSignals` / `getJobApplicantSignals` — unchanged
- `loadSnapshotSummary` — unchanged
- Video CV preview — unchanged
