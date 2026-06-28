# GETHIRED POST-PUBLISH JOB DASHBOARD — Routing Contract V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Route Registry (employer-jobs.module.ts)

| Path | Component | Description |
|------|-----------|-------------|
| /recruiter/jobs/list | EmployerJoblistComponent | All jobs table |
| /recruiter/jobs/expired | EmployerJobexpiredComponent | Expired jobs |
| /recruiter/jobs/create | EmployerJobcreateComponent | Create job wizard |
| /recruiter/jobs/edit | EmployerJobcreateComponent | Edit job wizard |
| /recruiter/jobs/applicants | EmployerApplicantsComponent | Applicant list for a job |
| /recruiter/jobs/view | EmployerJobviewComponent | Job detail view (read-only) |
| **/recruiter/jobs/dashboard** | **EmployerJobDashboardComponent** | **Post-publish command center (NEW)** |
| /recruiter/jobs | — | Redirects to /recruiter/jobs/list |

## Query Params

- `/recruiter/jobs/dashboard?id=<jobId>` — jobId is the PK from BE (`job_id` column, e.g. "JB123456")

## Parent Route

- Parent: `/recruiter` → `EmployerPanelModule` → `EmployerPanelComponent`
- Guard: `AuthGuard` (role: '2') on the `/recruiter` parent
- The dashboard route inherits these guards — no additional guard needed

## Navigation Triggers

1. After publish success dialog closes in `job-create.component.ts` (PRIMARY)
2. Direct URL navigation by user or bookmark (secondary)

## Fallback Behavior

If `?id` param is missing:
1. Try `jobFacade.jobDetails$` (state.selected) for the most recently published job
2. If found: add ?id= to navigation
3. If not found: navigate to /recruiter/jobs/list with snackBar message

## Preserved Routes (unchanged)

- `/recruiter/jobs/applicants?id=<jobId>` — still works, still linked from dashboard
- `/recruiter/jobs/list` — unchanged
- `/recruiter/jobs/create` / `/recruiter/jobs/edit` — unchanged
- `/jobs/details/<jobId>` — public portal, linked from "View public job" button (opens new tab)
