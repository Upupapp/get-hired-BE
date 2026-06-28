# GETHIRED POST-PUBLISH JOB DASHBOARD — State Map V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Component State

| Property | Type | Source | Default |
|----------|------|--------|---------|
| `jobId` | `string \| null` | `route.queryParams` → `?id=` param | `null` |
| `loading` | `boolean` | `jobFacade.getJobLoading$` | `true` |
| `loadError` | `boolean` | `jobFacade.jobError$` (maps to `!!err`) | `false` |
| `job$` | `Observable<Job>` | `jobFacade.getJobById$` (store `state.job`) | — |

## NgRx State Dependencies

| Store Slice | Selector | Set By |
|-------------|----------|--------|
| `state.job` | `getJobById` | `getJobSuccess` action (dispatched by `getJob$` effect) |
| `state.jobLoading` | `jobLoading` | `getJob` (true) / `getJobSuccess` (false) / `getJobFail` (false) |
| `state.error` | `jobError` | `getJobFail` (set) / `getJobSuccess` (not set) |
| `state.selected` | `getJobDetails` | `saveJobSuccess` (stores new job after publish) |

## State Flow: New Job Publish

```
publishJobPost()
  → jobFacade.saveJob(job)
  → [Effect] jobService.saveJob() → POST /job/create
  → [Effect] returns saveJobSuccess({ job })
  → [Reducer] state.selected = action.job; state.succesMsg = 'published'
  → [Facade] success$ emits 'published'
  → [Component] afterSubmit('published') opens UpdatedDialogComponent
  → User dismisses dialog
  → jobFacade.jobDetails$.pipe(take(1)) → reads state.selected
  → navigate(['/recruiter/jobs/dashboard'], { queryParams: { id: job.jobId } })
  → [Dashboard component] ngOnInit: jobFacade.getJobById(jobId)
  → [Effect] jobService.getJobById() → GET /job/details?id=<jobId>&uid=<uid>
  → [Reducer] state.job = action.job; state.jobLoading = false
  → Template renders with job$ | async
```

## State Flow: Existing Job Re-publish (Edit flow)

```
[Query param ?id=<existingJobId> set in constructor]
afterSubmit('published')
  → this.jobId is non-null
  → navigate(['/recruiter/jobs/dashboard'], { queryParams: { id: this.jobId } })
```

## Error Recovery

If `getJob` effect fails:
- `state.error` is set → `jobError$` emits truthy → `loadError = true`
- `state.jobLoading = false` → `loading = false`
- Template shows error state: "Couldn't load your job post" + "View all jobs" CTA
