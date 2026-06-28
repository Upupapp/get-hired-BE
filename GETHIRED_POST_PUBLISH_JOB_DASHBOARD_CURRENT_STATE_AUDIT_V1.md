# GETHIRED POST-PUBLISH JOB DASHBOARD — Current State Audit V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Summary

Before this mission, after a recruiter published a job post, the app navigated
to `/recruiter/jobs/applicants?id=<jobId>` — the generic applicant list for that
job. For **newly created jobs** (where `this.jobId` is null at publish time),
the component queried `jobFacade.jobDetails$` (which maps to `state.selected`,
correctly populated by `saveJobSuccess`), and navigated to the same applicants
route. If the store had no jobId, it fell back to `/recruiter/jobs`.

## Key Files Identified

| File | Path | Role |
|------|------|------|
| job-create.component.ts | src/app/job/job-create/ | Publish button handler & post-publish nav |
| employer-jobs.module.ts | src/app/employer-panel/employer-jobs/ | Route registry |
| job.reducer.ts | src/app/job/state/ | state.selected populated by saveJobSuccess |
| job.facade.ts | src/app/job/state/ | jobDetails$ = state.selected |
| job.service.ts (FE) | src/app/job/ | saveJob → PUT/POST to /job |
| jobsController.js (BE) | controllers/ | createJobs — returns mappedJob(rows[0]) with jobId |

## Pre-mission Navigation (lines 478-488)

```typescript
if (this.jobId) {
  this.router.navigate(['/recruiter/jobs/applicants'], { queryParams: { id: this.jobId } });
} else {
  this.jobFacade.jobDetails$.pipe(take(1)).subscribe(job => {
    if (job && job.jobId) {
      this.router.navigate(['/recruiter/jobs/applicants'], { queryParams: { id: job.jobId } });
    } else {
      this.router.navigateByUrl('/recruiter/jobs');
    }
  });
}
```

## Route Gaps Identified

- No `/recruiter/jobs/dashboard` route existed before this mission
- `EmployerApplicantsComponent` is a thin wrapper: `<app-job-applicants>` — renders the full applicant
  table with no command-center UX or context for a newly published job
- `EmployerJobviewComponent` is also a thin wrapper: `<app-job-view>` — shows job details, no action cards

## API Response Shape

BE `/job/create` returns:
```json
{ "data": { "jobId": "JB123456", "jobTitle": "...", "jobStatusId": 2, ... } }
```
The reducer stores this as `state.selected` in `saveJobSuccess`. `jobDetails$` selector
reads `state.selected`. So for newly created jobs, `state.selected.jobId` IS available
immediately after the publish success dialog closes.

## Security Posture (preserved)

- `createJobs` derives `companyId` from `getUserCompany(req.user.uid)` — never from `req.body`
- No route guard weakened
- No cross-company data exposure
