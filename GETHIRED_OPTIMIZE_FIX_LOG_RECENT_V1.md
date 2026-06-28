# GETHIRED OPTIMIZE FIX LOG — RECENT DEPLOYMENT (V1)
Generated: 2026-06-25
Scope: P2/F-08/QA10/B13 batch — targeted fixes only.

---

## FIX 1 — job.effects.ts: deleteJob$ mergeMap → exhaustMap

**File:** `get-hired-FE/src/app/job/state/job.effects.ts`
**Severity:** Medium (correctness / UX)
**Risk of change:** Very low — `exhaustMap` import added, `mergeMap` reference on deleteJob$ only swapped.

**Before:**
```
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
...
deleteJob$ = createEffect(() => {
  return this.actions$.pipe(
    ofType(JobActions.deleteJob),
    mergeMap((action) => this.jobService.deleteJobPost(action.jobId)
```

**After:**
```
import { catchError, exhaustMap, map, mergeMap, switchMap } from 'rxjs/operators';
...
deleteJob$ = createEffect(() => {
  return this.actions$.pipe(
    ofType(JobActions.deleteJob),
    exhaustMap((action) => this.jobService.deleteJobPost(action.jobId)
```

**Why:** `mergeMap` allows multiple concurrent HTTP DELETE requests if the user (or the confirmation dialog close + rapid keypress) triggers `deleteJob` more than once while the first request is in-flight. For a non-idempotent destructive endpoint, a second DELETE could either 404 (harmless but noisy) or — in a race condition with other jobs being created/deleted — behave unpredictably. `exhaustMap` drops all subsequent `deleteJob` dispatches until the current HTTP call completes, which is the correct UX for a one-shot destructive action.

**Compile check (mental):** `exhaustMap` is exported from `rxjs/operators` in the version used by this Angular 13 project. No type changes. No impact on any other effect.

---

## FIX 2 — job-list.component.ts: subscription leaks on success$, loading$, restrictions$

**File:** `get-hired-FE/src/app/job/job-list/job-list.component.ts`
**Severity:** Medium (memory leak, stale-state risk)
**Risk of change:** Low — behaviour is preserved, cleanup is added.

**Before (three class-field auto-subscribes):**
```typescript
success$ = this.jobFacade.success$
  .pipe()
  .subscribe(this.afterChange.bind(this));

loading$ = this.jobFacade.loading$.pipe().subscribe(this.onLoad.bind(this));

restrictions$ = this.jobFacade.subsRestrictions$
  .pipe().subscribe(this.checkJobRestriction.bind(this));
```

**After (moved into ngOnInit, tracked in req):**
```typescript
// Comment block replacing the three leaking fields (see ngOnInit)
ngOnInit(): void {
  ...
  this.req.add(
    this.jobFacade.success$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(this.afterChange.bind(this))
  );
  this.req.add(
    this.jobFacade.loading$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(this.onLoad.bind(this))
  );
  this.req.add(
    this.jobFacade.subsRestrictions$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(this.checkJobRestriction.bind(this))
  );
  ...
}
```

**Why:** Class-field initialisers run at construction time. The resulting subscriptions are stored as properties (`this.success$`, etc.) that hold the Subscription reference but are never added to the `req` bag and never unsubscribed in `ngOnDestroy`. Every navigation away from the job-list page destroys the component and creates a new one, which creates new subscriptions on top of the still-live old ones. After N navigations there are N active `success$` callbacks — `afterChange` would fire N times per success event, producing N toasts and N `dialog.closeAll()` calls. `loading$` would cause N redundant `this.loading = ...` assignments per load event.

**Compile check (mental):** `takeUntil` already imported. `this.unsubscribe$` and `this.req` already declared. Callback method signatures unchanged. No new imports needed.

---

## FIX 3 — job.service.js: mappedBasicJob tags used raw.jobId (undefined)

**File:** `get-hired-BE/services/job.service.js`
**Severity:** High (silent data bug — public job list tags always empty)
**Risk of change:** Very low — single property reference corrected.

**Before:**
```javascript
const mappedBasicJob = async (raw) => {
  return {
    ...
    badges: await getJobBadges(raw.job_id),
    tags: await getJobArrayDetails(raw.jobId, "job_tags", "tags"),
  };
};
```

**After:**
```javascript
const mappedBasicJob = async (raw) => {
  return {
    ...
    badges: await getJobBadges(raw.job_id),
    // OPTIMIZE FIX: was raw.jobId (always undefined — mapped prop not raw col).
    // Tags were silently returning [] for every published job in the public list.
    tags: await getJobArrayDetails(raw.job_id, "job_tags", "tags"),
  };
};
```

**Why:** `raw` is the direct Postgres row object. Its column is `job_id` (snake_case). The camelCase `jobId` is a mapped output property that only exists after the `mappedBasicJob` function builds its return value — it does not exist on the input `raw` object. `getJobArrayDetails` received `undefined` as the first argument, which caused the parameterised query `WHERE job_id = $1` to run with `$1 = undefined`, evaluated by `pg` as `NULL`. `WHERE job_id = NULL` never matches any row (SQL NULL comparison), so `[]` was returned for every job's tags in `getPublishedJobs`. Badges used `raw.job_id` correctly and were unaffected. `mappedJob` (single-job detail fetch) also used `raw.job_id` correctly — only the public list mapper had this bug.

**Compile check (mental):** Plain JS function, no types. Change is a property name substitution. No side effects.

---

## Fixes NOT applied (passing or deferred)

| Item | Reason |
|---|---|
| job-create subscription in constructor | MatRouter queryParams completes on navigation; acceptable |
| duplicate resetSuccessMsg handler (reducer) | Harmless; NgRx uses last-registered; defer to cleanup pass |
| rawBody on all routes | O(1) cost; acceptable for current load; defer if throughput grows |
| `select`, `Store` unused imports in job-list | Pre-existing dead code; out of scope for this optimise pass |
| `tap` unused import in job-list | Pre-existing dead code; out of scope |
| image missing width/height in confirmation-dialog | Low-severity CLS in a synchronous modal; out of scope |
