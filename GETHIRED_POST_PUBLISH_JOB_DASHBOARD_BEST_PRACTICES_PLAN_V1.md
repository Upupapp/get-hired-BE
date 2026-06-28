# GETHIRED POST-PUBLISH JOB DASHBOARD — Best Practices Plan V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Design Principles Applied

### 1. Honest UX — No Fake Data
- NEVER show applicant counts on the dashboard (B05 rule)
- Empty state: "Applicants will appear here when candidates apply."
- No "Top candidates waiting" or AI-screening claims

### 2. Post-Publish Flow
- Publish button → loading spinner (immediate feedback)
- On success: UpdatedDialog → snackbar (existing) → route to /recruiter/jobs/dashboard?id=
- Dashboard appears with gentle reveal animation

### 3. Fallback Chain
```
jobId from query params?
  YES → navigate to /recruiter/jobs/dashboard?id=<jobId>
  NO  → read state.selected.jobId from store
          HAS jobId → navigate to /recruiter/jobs/dashboard?id=<jobId>
          NO jobId  → snackBar "Your job was published. View all jobs." + navigate to /recruiter/jobs/list
```

### 4. Accessibility
- All action cards: button elements (not divs), keyboard navigable
- aria-label on status chip, publish button loading state
- role="status" / aria-live="polite" on success banner
- role="alert" on error state
- Skeleton has aria-busy="true"

### 5. Reduced Motion
- All CSS animations wrapped in `@media (prefers-reduced-motion: reduce)` blocks
- Shimmer skeleton: `animation: none; background: #f0f0f0` under reduced motion
- Status chip glow: `animation: none` under reduced motion
- Hover lift: `transform: none` under reduced motion
- _motion.scss `@include motion-safe` mixin used on button transitions

### 6. Component Architecture
- New component: `EmployerJobDashboardComponent`
- Declared in `EmployerJobsModule` (same lazy chunk as other employer-jobs components)
- Imports `JobModule` (via the module) which provides `JobFacade` and all store wiring
- No new services, no new store slices, no BE changes required
- Uses existing `getJobById$`, `getJobLoading$`, `jobError$`, `jobDetails$` selectors

### 7. Security
- `jobFacade.getJobById(this.jobId)` calls `/job/details?id=<jobId>&uid=<uid>`
- BE `jobDetails` function scopes by ownership (company verification)
- No companyId ever supplied from FE — all scoped server-side
