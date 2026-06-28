# GETHIRED DELETE JOB — Frontend UX Fix Log V1

**Date:** 2026-06-25

---

## FE Architecture

The job delete flow goes through NgRx (actions → effects → reducer → selector → component). The FE had no deleteJob action/effect/reducer at all before this fix.

---

## Fix 1: New NgRx Actions

**File:** `src/app/job/state/job.actions.ts`

Added to enum:
```typescript
DeleteJob = '[job] - Delete Job',
DeleteJobSuccess = '[job] - Delete Job Success',
DeleteJobFail = '[job] - Delete Job Fail',
```

Added action creators:
```typescript
export const deleteJob = createAction('[job] - Delete Job', props<{ jobId: string }>());
export const deleteJobSuccess = createAction('[job] - Delete Job Success', props<{ basicList: Model.BasicList[] }>());
export const deleteJobFail = createAction('[job] - Delete Job Fail', props<{ payload: any }>());
```

---

## Fix 2: New Service Method

**File:** `src/app/job/job.service.ts`

```typescript
deleteJobPost(jobId: string) {
  return this.baseService.delete<Model.BasicList[]>(`${this.jobUrl}/delete`, { body: { jobId } });
}
```

Note: Angular HttpClient.delete requires the body via `{ body: ... }` in options.

---

## Fix 3: New NgRx Effect

**File:** `src/app/job/state/job.effects.ts`

```typescript
deleteJob$ = createEffect(() => {
  return this.actions$.pipe(
    ofType(JobActions.deleteJob),
    mergeMap((action) => this.jobService.deleteJobPost(action.jobId)
      .pipe(
        map((res: any) => {
          const basicList: Model.BasicList[] = res.data || [];
          return JobActions.deleteJobSuccess({ basicList });
        }),
        catchError((err) => {
          const body = (err && err.error) || {};
          const payload: string = body.error || body.message
            || 'We couldn\'t delete this job. It may no longer exist or you may not have access.';
          return of(JobActions.deleteJobFail({ payload }));
        })
      )
    )
  );
});
```

---

## Fix 4: New Reducer Handlers

**File:** `src/app/job/state/job.reducer.ts`

- `deleteJob`: `loading: true, succesMsg: null, error: null`
- `deleteJobSuccess`: `loading: false, list: action.basicList, succesMsg: 'deleted', error: null`
- `deleteJobFail`: `loading: false, error: action.payload, succesMsg: null`

---

## Fix 5: New Facade Method

**File:** `src/app/job/state/job.facade.ts`

```typescript
deleteJobPost(jobId: string) {
  this.store.dispatch(JobAction.deleteJob({ jobId }));
}
```

---

## Fix 6: job-list.component.ts — Real Delete Dispatch

**File:** `src/app/job/job-list/job-list.component.ts`

Before:
```typescript
// TODO delete
this.jobFacade.changeJobStatus(4, jobId);
```

After:
```typescript
this.jobFacade.deleteJobPost(jobId);
```

---

## Fix 7: Confirmation Dialog Copy

**Before:** "Would you like to save your progress in Delete?"

**After (via data.message):** "This action cannot be undone."

---

## Fix 8: Success/Error Toast

- Success: `'Job deleted.'` green snackbar (4s)
- Error: BE error message or fallback "We couldn't delete this job. It may no longer exist or you may not have access." red snackbar (4s)

---

## Fix 9: Shared Confirmation Dialog — Backward-Compatible Message Field

**File:** `src/app/shared/components/confirmation-dialog/confirmation-dialog.component.html`

Added conditional: `{{ data.message ? data.message : ('Would you like to save your progress in ' + data.action + ' ?') }}`

All existing callers that don't pass `data.message` continue to see the original text.

---

## Files Changed (Frontend)

- `src/app/job/state/job.actions.ts`
- `src/app/job/state/job.effects.ts`
- `src/app/job/state/job.reducer.ts`
- `src/app/job/state/job.facade.ts`
- `src/app/job/job.service.ts`
- `src/app/job/job-list/job-list.component.ts`
- `src/app/shared/components/confirmation-dialog/confirmation-dialog.component.html`
