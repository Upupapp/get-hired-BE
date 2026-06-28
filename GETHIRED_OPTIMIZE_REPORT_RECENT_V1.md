# GETHIRED OPTIMIZE REPORT — RECENT DEPLOYMENT (V1)
Generated: 2026-06-25
Scope: P2/F-08/QA10/B13 deployment batch — 7 targeted areas only.
JobCompatibilityService, payment logic, MATCH scoring, and auth NOT touched.

---

## 1. job-create.component.ts / html / scss

### Loading / Success / Error States — PASS
- `savingDraft` boolean correctly prevents double-submit on the draft button.
- `loading` boolean disables the Publish button during in-flight saves.
- `saveSuccessPulse` auto-clears via `setTimeout` at 2000 ms; `cd.markForCheck()` called correctly.
- `saveErrorMsg` cleared on next attempt before each save; never exposed on init.
- Error subscriber in `ngOnInit` guards on `savingDraft || loading` — prevents false positives from unrelated error state.

### Subscription Leaks — PASS
- All subscriptions added to `this.subscriptions` (Subscription bag).
- `formSubs` rotated correctly inside `setFormGroup` — previous statusChanges listeners unsubscribed before new ones created (QA8 FIX-10).
- `ngOnDestroy` calls `this.subscriptions.unsubscribe()` and `this.formSubs.unsubscribe()`.
- `afterSubmit` dialog subscriptions: MatDialogRef completes on close, so these auto-unsubscribe — no leak.
- `route.queryParams.subscribe()` in constructor is not in a bag; acceptable here because `queryParams` is router-managed and the component is not reused mid-session.

### Change Detection — PASS
- `ChangeDetectorRef` injected and used (`cd.markForCheck()`) for `saveSuccessPulse` and `saveErrorMsg` updates.
- `cd.detectChanges()` called after `interviewQuestions` FormArray population — correct.
- No `setInterval` or recurring mutation outside debounced `valueChanges`.

### SCSS — PASS
- All CSS animations have `@media (prefers-reduced-motion: reduce)` guards.
- Only `transform`/`opacity` animated — no layout-triggering properties.
- `min-height: 44px` mobile touch target correctly applied on action buttons.

---

## 2. job-list.component.ts

### deleteRow() NgRx dispatch — PASS
- Dispatches `this.jobFacade.deleteJobPost(jobId)` (correct NgRx path to `deleteJob` action).
- `jobId` extraction handles both `{data: {jobId}}` and `{jobId}` shapes correctly.
- ConfirmationDialog opened with `disableClose: true`; result gated on `== 1`.

### Subscription Leaks — BUG FIXED (see fix log)
- Three class-field auto-subscribes (`success$`, `loading$`, `restrictions$`) had no unsubscribe path and were never added to the `req` bag.
- Every navigation away and back created a new subscriber stack that was never torn down.
- All three moved into `ngOnInit` behind `req.add(...)` + `takeUntil(this.unsubscribe$)`.

### O(n) loops on CD cycle — PASS
- `list$` is a pipe-derived Observable consumed via async pipe in the template.
- The `map` transform runs only on NgRx store emissions, not on every CD cycle.
- `getJobStatusName` and `formatSalary` are pure synchronous functions — safe.

---

## 3. job.effects.ts

### deleteJob$ operator — BUG FIXED (see fix log)
- Used `mergeMap` — a rapid double-tap could fire two concurrent HTTP DELETE requests.
- Changed to `exhaustMap` — while a DELETE is in-flight any subsequent `deleteJob` action is silently dropped.
- All other effects remain on `mergeMap` (list/option fetches) or use the intentional nested `switchMap` inside `getJob$` to fan out to multiple actions.

---

## 4. job.reducer.ts

### Immutability — PASS
- All `on()` handlers use `{ ...state, ... }` spread; no direct mutation.
- `updateJobQuestionSuccess` uses `.map()` to produce a new array.
- `deleteJobQuestionSuccess` spreads `state.selected` before overwriting `interviewQuestions`.

### State Shape — PASS (with note)
- `selected`, `job`, `list` correctly typed nullable.
- `deleteJobSuccess` writes to `list` (BasicList shape used by job-list) — correct; BE returns updated ownership-scoped list.
- **Note (deferred):** Two `on(JobActions.resetSuccessMsg, ...)` handlers registered (lines 61 and 135). NgRx uses the last-registered handler, so the second (which also clears `error`) is the effective one. The first is dead. Safe to dedupe in a future cleanup pass — not a bug.

---

## 5. confirmation-dialog.component.html

### Layout / Reflow — PASS
- Simple flex column inside a card; no absolute positioning, floats, or table layout.
- `border-radius`, `border`, `padding` — composited properties, no expensive layout reflow.
- Image (`info-red.png`) has no explicit `width`/`height` — minor CLS risk, but this is a modal loaded synchronously after user action; not a Core Web Vitals concern.
- `data.message` ternary is a pure interpolation, no function call per CD cycle.

---

## 6. job.service.js — interviewQuestionsUpdate

### Promise.all correctness — PASS
- `await Promise.all(interviewQuestions.map(async (question) => { ... }))` is correct — all question saves run concurrently, and the function awaits all of them.
- Template-creation guard (`templateToUse`) is closure-captured and safe inside `Promise.all` because only new questions (no `questionId`) reach that branch.

### mappedBasicJob tags — BUG FIXED (see fix log)
- `tags: await getJobArrayDetails(raw.jobId, ...)` used the mapped property name (`raw.jobId`) which is `undefined` on the raw Postgres row object.
- Caused `getJobArrayDetails` to query `WHERE job_id = undefined`, silently returning `[]` for every job's tags in the public job list (`getPublishedJobs`).
- Fixed to `raw.job_id`.

---

## 7. server.js

### Rate-limiter order — PASS
- `globalLimiter` applied via `app.use()` before any route mounting — correct.
- `authLimiter` → `writeLimiter` → route mounting is correct stacking order.
- Effective limit on auth write routes: `min(20, 100)` = 20 — intended.
- `sensitiveLimiter` on specific paths after general limiters — correct.

### rawBody verify callback overhead — PASS (acceptable)
- `verify: (req, _res, buf) => { req.rawBody = buf; }` is a Buffer reference assignment — O(1), no copy.
- Runs on every `express.json()` request. Accepted overhead for current single-server deployment.
- Deferred optimisation: scope to payment webhook route only if throughput becomes a concern.

---

## Summary

| Area | Result | Finding |
|---|---|---|
| job-create — loading/success/error states | PASS | Correct |
| job-create — subscription leaks | PASS | All in bags, formSubs rotated |
| job-create — change detection | PASS | markForCheck/detectChanges used correctly |
| job-create — SCSS/animations | PASS | prefers-reduced-motion on all animations |
| job-list — deleteRow dispatch | PASS | Correct NgRx path |
| job-list — subscription leaks | FIXED | 3 class-field subscriptions leaked |
| job.effects — deleteJob$ operator | FIXED | mergeMap → exhaustMap |
| job.reducer — immutability | PASS | All immutable |
| job.reducer — state shape | PASS (note) | Duplicate resetSuccessMsg handler (harmless) |
| confirmation-dialog — layout | PASS | No reflow risk |
| job.service — interviewQuestionsUpdate | PASS | Promise.all correct |
| job.service — mappedBasicJob tags | FIXED | raw.jobId → raw.job_id |
| server.js — rate-limiter order | PASS | Correct |
| server.js — rawBody overhead | PASS | Acceptable |

**Bugs fixed: 3**
**Deferred (non-blocking): 2**
