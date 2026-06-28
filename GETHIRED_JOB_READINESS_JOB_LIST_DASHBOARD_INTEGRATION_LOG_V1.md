# GETHIRED_JOB_READINESS_JOB_LIST_DASHBOARD_INTEGRATION_LOG_V1

## Job List (job-list.component.ts/html)

### Decision: NOT modified
The job list uses `<app-reusable-table>` — a generic data-table component with
column definitions. Per spec: "Do not restructure the jobs list." There is no card
structure to safely inject a per-row readiness badge without modifying the
reusable-table component or the displayedColumns array.

The reusable-table renders rows from a flat list. Adding readiness would require
either: (a) a custom column type in reusable-table, or (b) restructuring the job
list to use cards. Both are out of scope and risk breaking existing functionality.

VERDICT: Job list untouched. No compact badge added to job-list rows.

## Employer Job Dashboard (employer-job-dashboard.component.ts/html)

### Decision: Modified with compact improvements chip
The dashboard (B05) is a card-based layout with a clear insertion point between
the publish success banner and the action cards grid.

### Changes to employer-job-dashboard.component.ts
1. Added import: `JobReadinessService`, `JobReadinessResult`
2. Added property: `dashboardReadiness: JobReadinessResult | null`
3. Added getter: `hasOptionalImprovements` — returns true when canPublish and recommendationItems.length > 0
4. Added constructor injection: `private jobReadiness: JobReadinessService`
5. In `ngOnInit()`: subscribes to `jobFacade.getJobById$` and computes readiness once job data arrives

### Changes to employer-job-dashboard.component.html
Added between publish success banner and action cards:
```html
<div class="jd-optional-improvements" *ngIf="hasOptionalImprovements" role="status">
  lightbulb icon + "Optional improvements available — [link to edit]"
  + count badge
</div>
```
- Button link triggers `editJob()` — navigates to job edit page
- aria-label on count span
- Only shown for published jobs with recommended gaps (canPublish = true is implied since the dashboard is reached via B05 publish flow)

### Changes to employer-job-dashboard.component.scss
Added: `.jd-optional-improvements`, `.jd-opt-icon`, `.jd-opt-text`, `.jd-opt-link`, `.jd-opt-count`

### NOT shown on dashboard
- Full readiness bar (spec: "do NOT show full readiness bar for already-published jobs")
- Chip details (spec says compact only)
- Blocking items (published jobs have passed all required checks)
