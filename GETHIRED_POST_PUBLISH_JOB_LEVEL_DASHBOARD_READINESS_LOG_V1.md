# GETHIRED POST-PUBLISH JOB LEVEL DASHBOARD — Readiness Log V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Component: EmployerJobDashboardComponent

**Route:** `/recruiter/jobs/dashboard?id=<jobId>`  
**Selector:** `app-employer-job-dashboard`  
**Module:** `EmployerJobsModule` (lazy-loaded as employer-jobs chunk)  
**Build verified:** YES (zero errors in production build 2026-06-25)

## States Implemented

| State | Implementation | Notes |
|-------|---------------|-------|
| Loading skeleton | `*ngIf="loading"` + shimmer CSS | 4 skeleton cards + title/chip/meta skeletons |
| Error/fallback | `*ngIf="!loading && loadError"` | Shows honest error + "View all jobs" CTA |
| No jobId fallback | `*ngIf="!loading && !(job$ \| async)"` | Graceful if store has no job |
| Loaded — empty applicants | Always shown when job loads | "No applicants yet" + "Applicants will appear here when candidates apply." |
| Loaded — with interview questions | `*ngIf="job.interviewQuestions && job.interviewQuestions.length > 0"` | Read-only list |

## Data Sources

| Data | Source | Risk |
|------|--------|------|
| Job title, status, city, country | `jobFacade.getJobById$` (store `state.job`) | Low — populated by `getJobById` dispatch |
| Loading indicator | `jobFacade.getJobLoading$` | Low |
| Error state | `jobFacade.jobError$` | Low |
| jobId | Query params `?id=` or `state.selected.jobId` fallback | Low |

## Action Cards

| Card | Action | Route |
|------|--------|-------|
| View public job | `window.open('/jobs/details/<jobId>', '_blank', 'noopener')` | Public portal |
| Review applicants | `/recruiter/jobs/applicants?id=<jobId>` | Existing route |
| Edit job post | `/recruiter/jobs/edit?id=<jobId>` | Existing route |
| Back to all jobs | `/recruiter/jobs/list` | Existing route |
| Create another job | `/recruiter/jobs/create` | Existing route |

## Security Compliance

- Job data fetched via `jobFacade.getJobById(this.jobId)` → `/job/details?id=<jobId>&uid=<uid>`
- BE ownership check: `getJobCompanyId` verifies the job belongs to the caller's company
- No companyId supplied from FE for data fetch
- No applicant data exposed on this page (no applicant API calls)
