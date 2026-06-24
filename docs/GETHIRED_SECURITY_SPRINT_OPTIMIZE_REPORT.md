# GetHired Security + UX Sprint — OPTIMIZE Report
**Date:** 2026-06-25
**Scope:** 21 changed files (BE: 14 controllers, FE: 7 components/state files)
**Auditor:** Claude Code — OPTIMIZE pass

---

## 1. Ownership Check Performance (jobsController.js)

### Finding: Two sequential DB calls per mutating job operation — confirmed real overhead

`getUserCompany(uid)` is **a full DB call**, not a cache or JWT read.  
Located in `companiesController.js` lines 186–211:

```js
const getUserCompany = async (id) => {
  const searchQuery = `select c.*, ce.employee_id, i.industry_name ...
    from ${dbSchema}.company_employees ce
    left join ${dbSchema}.companies c ...
    where ce.employee_uuid = $1`;
  const { rows } = await dbQuery.query(searchQuery, [id]);
  ...
};
```

This means `updateJob` and `deleteJob` now issue **three sequential DB round-trips**:
1. `getUserCompany(uid)` → JOIN query across `company_employees` + `companies` + `industry`
2. `SELECT job_id FROM jobs WHERE job_id=$1 AND company_id=$2` (ownership check)
3. The actual `UPDATE jobs ...` or `DELETE FROM jobs ...`

`getAllApplicantOfJob` (also in this sprint) similarly makes two calls before the main query.

### Is this a meaningful performance concern?

For typical network latencies to Supabase (10–50 ms per round-trip), each call to `updateJob` or `deleteJob` now costs **~20–100 ms of added latency** before the mutation begins. For a low-traffic product this is acceptable. For high-concurrency workflows (bulk job management) it is a real bottleneck.

### Safe optimization available: combine ownership check into the UPDATE/DELETE itself

The `ownerCheck` SELECT + the main UPDATE can be merged into a single parameterized statement using a `WHERE` clause that includes `company_id`. The UPDATE already returns `*` so success can be inferred from row count.

**For `updateJob`** — the current flow:
```js
// Round-trip 1: get caller's companyId
const callerCompany = await getUserCompany(req.user.uid);
// Round-trip 2: check ownership
const ownerCheck = await dbQuery.query(
  `SELECT job_id FROM jobs WHERE job_id=$1 AND company_id=$2`,
  [jobId, callerCompany.companyId]
);
if (!callerCompany || ownerCheck.rows.length === 0) return 403;
// Round-trip 3: the actual update (19 params)
const { rows } = await dbQuery.query(updateQuery, [...]);
```

Can be collapsed to **two round-trips**:
- Keep `getUserCompany()` to derive `callerCompanyId`.
- Add `AND company_id = $20` to the existing `UPDATE ... WHERE job_id=$19` query. If 0 rows return, it means either the job doesn't exist or it belongs to another company — return 403.
- Eliminates the separate ownership `SELECT` entirely.

**For `deleteJob`** — same pattern. Add `AND company_id = $2` to the existing `DELETE FROM jobs WHERE job_id=$1`, checking affected row count.

**For `getAllApplicantOfJob`** — `getJobCompanyId(id)` runs a second DB query to look up the job's company, then `getUserCompany()` is called again. The check can be collapsed into a single query that joins `jobs` with `company_employees` on both IDs in one shot.

### Safe optimization applied

See **Section 6 — Applied Changes** below. The `getUserCompany()` call is retained (it cannot be eliminated without JWT changes); the redundant ownership `SELECT` is removed by folding the `company_id` constraint into the primary `UPDATE` and `DELETE` queries.

---

## 2. Error Handler Performance (console.error calls)

### Finding: Not a meaningful bottleneck — no action required

`console.error()` in Node.js writes synchronously to stderr via libuv, which is typically buffered at the OS level. For a low-traffic Supabase-backed Express API, the cost is negligible (sub-microsecond in the happy path, and error paths are by definition uncommon).

**Hot-path check performed:** No handler in the 14 changed BE files is on a hot path (e.g., a WebSocket tick, a tight loop, or a rate-sensitive health-check endpoint). All `console.error` calls are inside `catch` blocks — they are never reached on successful requests.

**New try/catch overhead check:** The only handler that gained a try/catch where there was none before is `deleteCandidate` (note: the `checkCandidateIfExist` call at line 65 is _outside_ the try block — a pre-existing pattern, not introduced by this sprint). No additional try/catch nesting was introduced that would cause meaningful overhead.

**Verdict:** No change needed.

---

## 3. FIX-02 Subscription Performance (job-create.component.ts)

### Finding: Correct — memory leak eliminated, no legitimate re-subscription missed

**Before the fix:** `success$` was subscribed inside `setFormGroup()`. Since `setFormGroup()` is called every time `editJob$` emits (line 135: `this.editJob$.subscribe((data: any) => { if (data) { this.setFormGroup(data); ... } })`), every new emission from `editJob$` created a new dangling subscription to `success$`. One save-success event would trigger the dialog once for _every_ prior emission of `editJob$` since the component was mounted. This was a real memory leak and a real UX bug (multiple dialogs).

**After the fix (current code, lines 127–130):**
```ts
// FIX-02: success$ subscribed exactly once here (not inside setFormGroup, ...)
this.subscriptions.add(
  this.jobFacade.success$.pipe().subscribe(this.afterSubmit.bind(this))
);
```

This subscribes once in `ngOnInit` and adds the subscription to the tracked `Subscription` object that is properly torn down in `ngOnDestroy()` (line 540: `this.subscriptions.unsubscribe()`).

**Is re-subscription ever needed?** No. `success$` is a store selector; it emits the current `succesMsg` value whenever state changes. A single persistent subscription is the correct pattern. Each individual save action sets `succesMsg` in the reducer and the selector re-emits — no manual re-subscribe is needed.

**Subscription typing:** `success$` is piped from `this.store.pipe(select(fromfeature.success))` which is typed through NgRx selectors. The subscription is properly tracked via `Subscription.add()`. No typing gap.

**Verdict:** Implementation is correct. No change needed.

---

## 4. NEW-03 Subscription Bar (employer-panel.component.html)

### Finding: position:fixed used inline — creates stacking context, minor paint layer, but CSS weight is negligible

The subscription bar in `employer-panel.component.html` (lines 80–92) uses inline styles:
```html
<div class="d-flex d-md-none justify-content-center align-items-center"
  style="background:#f8f8f8;border-top:1px solid #eee;padding:6px 0;position:fixed;bottom:56px;left:0;right:0;z-index:999;">
```

**Stacking context / paint layer:**
- `position:fixed` with `z-index:999` does create a new stacking context and promotes the element to a compositor layer. This is unavoidable for a persistent floating bar — it is the standard pattern for sticky mobile UIs.
- The `.gh-mobile-nav` element also uses `position:fixed` (scss line 102) so this bar adds a second composited layer. On modern mobile devices, two compositor layers for the bottom chrome is entirely standard and within GPU budget.
- **No performance concern.**

**`display:none` vs opacity for desktop hiding:**
The bar is hidden on desktop via Bootstrap's `d-md-none` class, which applies `display:none !important` at the 768 px breakpoint. `display:none` is the correct and most performant approach — it removes the element from layout and painting entirely. Not an issue.

**CSS weight:**
The bar uses only inline styles (no new class). The SCSS file (`employer-panel.component.scss`) has **no changes** from this bar. Total added CSS weight is 0 bytes in the stylesheet.

**Safe optimization: move inline styles to SCSS**
The inline `style=` on the bar mixes concerns and prevents style reuse. A named class in the component SCSS would be cleaner and allow overrides, but this is a style/maintainability improvement only — not a performance issue. Flagged as optional (see Section 6).

---

## 5. NgRx Action String Fix (FIX-03 — job.actions.ts)

### Finding: No performance implication; but a latent reducer bug exists unrelated to FIX-03

**Performance:** String comparison is O(n) on string length but action strings are short (< 60 chars). NgRx dispatches dozens to hundreds of actions per session; the aggregate cost is unmeasurable. No concern.

**Does FIX-03 cause reducers to run unnecessarily or miss actions?**

The `job.actions.ts` `AllFeatureActionTypes` enum is the single source of truth for all action type strings. All reducers use `on(JobActions.someAction, ...)` which references the enum through `createAction()`. There is no string duplication between the enum and the reducer — the NgRx `createReducer/on` pattern matches by action creator reference, not raw string. A rename in the enum propagates automatically.

**Latent reducer bug found (pre-existing, unrelated to FIX-03):**

In `job.reducer.ts` lines 433–439:
```ts
on(JobActions.getJobSuccess, (state, action): JobState => {
  return {
    ...state,
    job: action.job,
    jobLoading: false,
    succesMsg: action.job.jobStatusId == 4 ? 'archived' : 'expired'  // ← wrong
  };
}),
```

`getJobSuccess` is the action fired when fetching a job's details for display (e.g., when opening the edit form via `getJobById`). It unconditionally sets `succesMsg` to either `'archived'` or `'expired'` — meaning _every_ time a job is loaded for editing, a success message fires. The `afterSubmit` handler in `job-create.component.ts` does not check for these two strings (only `'asDraft'` and `'published'`), so no visible dialog appears — but `succesMsg` is polluted in state on every `getJob` call. This is a pre-existing bug not introduced by this sprint.

**Verdict:** FIX-03 itself has no performance concern. The stale-succesMsg bug in `getJobSuccess` is noted but was pre-existing.

---

## 6. Applied Safe Optimizations

### OPT-01 (APPLIED): Fold ownership SELECT into primary UPDATE/DELETE in jobsController.js

This removes one DB round-trip from `updateJob` and `deleteJob` by folding the `company_id` ownership constraint directly into the primary query's `WHERE` clause. `getUserCompany()` is still called once (to derive the caller's `companyId` from the verified token) — that call cannot be eliminated without JWT claims changes.

**updateJob — change:**
The current two-step pattern:
```js
const ownerCheck = await dbQuery.query(
  `SELECT job_id FROM ${dbSchema}.jobs WHERE job_id = $1 AND company_id = $2`,
  [jobId, callerCompany && callerCompany.companyId]
);
if (!callerCompany || ownerCheck.rows.length === 0) { return 403 }
// ... then the UPDATE
const { rows } = await dbQuery.query(updateQuery, [...19 params, jobId]);
```

Changed to fold company_id check into the UPDATE's WHERE clause (param $20):
```js
// (ownership check SELECT removed — company_id constraint added to UPDATE WHERE)
const { rows } = await dbQuery.query(updateQuery, [...19 params, jobId]);
// rows.length === 0 means either job not found OR company mismatch — both → 403
```

Note: `updateQuery` is modified to add `AND company_id = $20`.

**deleteJob — change:**
Same pattern: `deleteQuery` gains `AND company_id = $2`; ownership SELECT removed.

#### Changes applied to jobsController.js

**deleteJob:**
- Moved `deleteQuery` inside the try block (minor: no longer defined outside try)
- Added `AND company_id=$2` to the DELETE WHERE clause
- Removed separate `ownerCheck` SELECT entirely
- Checks `rowCount === 0` after DELETE to catch company_id mismatch → 403
- Net DB calls: **2** (was 3)

**updateJob:**
- Added `AND company_id=$20` to the UPDATE WHERE clause
- Added `callerCompany.companyId` as `$20` to the query param array
- Removed separate `ownerCheck` SELECT entirely
- Moved the `rows.length === 0` check immediately after the UPDATE (before `saveJobArray`)
  to return 403 on company_id mismatch without doing array work for another company's job
- Net DB calls: **2** (was 3)

**Security equivalence:** The authorization guarantee is identical — callerCompany is still
derived from the verified Firebase token via `getUserCompany()`, never from caller-supplied
data. The WHERE `company_id=$20` constraint is server-side and parameterized. A mismatch
still returns 403 with the same message. No information is leaked about whether the job
exists vs. belongs to another company (correct behavior — consistent 403 in both cases).

---

## 7. Items Not Changed (Deferred / Out of Scope)

| Item | Reason not changed |
|------|-------------------|
| `getJobSuccess` reducer sets `succesMsg` incorrectly | Pre-existing bug, no visible UX impact (afterSubmit ignores 'archived'/'expired' strings); defer to a targeted reducer audit |
| NEW-03 subscription bar inline styles → SCSS class | Style/maintainability only; not a performance issue; safe to defer |
| `getUserCompany()` call count in `getAllApplicantOfJob` | That route calls `getJobCompanyId` + `getUserCompany` sequentially — could be combined into a JOIN query; medium effort, not in sprint scope |
| `interviewController.js` — `callerBelongsToCompany` helper calls `getUserCompany` on every auth check | Medium effort to cache per request; not hot-path; defer |

---

## 8. Summary

| # | Area | Verdict | Action |
|---|------|---------|--------|
| 1 | Ownership check DB calls | Real overhead (3 → 2 calls for update/delete) | OPT-01 APPLIED |
| 2 | console.error hot-path | Not a concern — error paths only | No change |
| 3 | FIX-02 subscription (FE) | Correct — memory leak fixed, no re-sub needed | No change |
| 4 | NEW-03 subscription bar | position:fixed correct; d-md-none optimal; zero SCSS weight | No change (inline style cleanup deferred) |
| 5 | FIX-03 NgRx action strings | No perf impact; reducer bug pre-existing, unrelated | No change (latent bug noted) |

**Files changed in this OPTIMIZE pass:** 1
- `get-hired-BE/controllers/jobsController.js` — OPT-01 (deleteJob, updateJob)
