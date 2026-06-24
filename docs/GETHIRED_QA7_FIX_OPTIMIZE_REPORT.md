# GetHired QA7 Fix Sprint — OPTIMIZE Report

**Date:** 2026-06-25
**Scope:** BE: jobsController.js, companiesController.js, applicantsController.js, contactsController.js, cvController.js
**Scope:** FE: employer-panel.component.scss, job.reducer.ts, job-create.component.ts
**Pass type:** Safe, minimal, reversible optimizations only — no schema changes, no architecture changes.

---

## 1. updateStatusOfJob — Ownership Check Performance (OPT-01)

### Before
3 DB calls per request:
1. `getUserCompany(req.user.uid)` — fetch caller's company
2. `SELECT job_id FROM jobs WHERE job_id=$1 AND company_id=$2` — separate ownership check
3. `UPDATE jobs SET job_status_id=$1 WHERE job_id=$2` — status update (no company_id in WHERE)

### After (applied)
2 DB calls per request:
1. `getUserCompany(req.user.uid)` — fetch caller's company
2. `UPDATE jobs SET job_status_id=$1 WHERE job_id=$2 AND company_id=$3 returning *` — ownership enforced in WHERE, write and check combined

**How:** `updateJobStatus` now accepts a third `companyId` parameter and folds it into the UPDATE WHERE clause. Zero rows returned = job not found OR company mismatch; both throw `"FORBIDDEN"` which the caller catches and converts to a 403. This is identical to the pattern already applied to `updateJob` and `deleteJob` in the same file.

**Files changed:**
- `controllers/jobsController.js` — `updateStatusOfJob` + `updateJobStatus`

**Caution:** `updateJobStatus` is exported. Any external caller that passes only 2 arguments will pass `undefined` as `companyId`, causing the WHERE clause to match zero rows and throw FORBIDDEN. This is more restrictive than before (previously the helper had no ownership guard). External callers should be updated to pass companyId. No external callers were found in the codebase during this audit.

---

## 2. contacts — Ownership Check Performance (OPT-02)

### Before
Each of `updateContact`, `deleteContact`, `updateGroup`, `deleteGroup` made 3 DB calls:
1. `getUserCompany(req.user.uid)`
2. Separate `SELECT contact_id/group_id ... WHERE id=$1 AND company_id=$2` pre-check
3. Service `UPDATE`/`DELETE` (no company_id in WHERE)

### After (applied)

**deleteContact:** Ownership SELECT eliminated. Single `DELETE FROM contact WHERE contact_id=$1 AND company_id=$2`. Zero `rowCount` → 403. 2 calls total.

**updateContact:** Ownership SELECT eliminated. `editContact` in contact.service.js now accepts `companyId` (always present in the contact object) and folds it into the UPDATE WHERE as `AND company_id=$7`. Zero rows returned → throws `"FORBIDDEN"` → controller catches and returns 403. Controller passes `{ ...contact, companyId: callerCompany.companyId }` to editContact. 2 calls for the write path (getUserCompany + editContact UPDATE), plus any group side-effect queries as before.

**updateGroup:** Ownership SELECT eliminated. `editGroup` now accepts optional third `companyId` parameter. When provided, the UPDATE WHERE includes `AND company_id=$3`; zero rows throws `"FORBIDDEN"`. Controller catches and returns 403. 2 calls total (getUserCompany + editGroup UPDATE).

**deleteGroup:** Ownership SELECT eliminated. Single `DELETE FROM "group" WHERE group_id=$1 AND company_id=$2`. Zero `rowCount` → 403. 2 calls total.

**Files changed:**
- `controllers/contactsController.js` — all four handlers
- `services/contact.service.js` — `editContact` (added `companyId` destructure + `AND company_id=$7` in UPDATE WHERE); `editGroup` (added optional `companyId` param, conditional query branch)

**Note on editGroup backward compat:** `editGroup` uses a conditional: if `companyId` is provided it runs the ownership-guarded query; otherwise it falls back to the original `WHERE group_id=$2` only. This keeps the service callable from other contexts without breaking them.

---

## 3. CV — Ownership Check Performance (OPT-03)

### Before
Both `updateCV` and `deleteCV` made 2 DB calls:
1. `SELECT cv_id FROM cv WHERE cv_id=$1 AND user_id=$2` — ownership pre-check
2. `UPDATE`/`DELETE` (no user_id in WHERE)

Note: no `getUserCompany` call needed here — CVs are owned by users directly, not companies.

### After (applied)

**updateCV:** Ownership SELECT eliminated. UPDATE now `WHERE cv_id=$12 AND user_id=$13` (userId appears twice in params — once to SET user_id=$1, once in WHERE). Zero rows → 403. 1 call total.

**deleteCV:** Ownership SELECT eliminated. DELETE now `WHERE cv_id=$1 AND user_id=$2`. Zero `rowCount` → 403. 1 call total.

**Files changed:**
- `controllers/cvController.js` — `updateCV` + `deleteCV`

---

## 4. Fix 8 — succesMsg: null in getJobSuccess

**Finding:** Setting `succesMsg: null` in `getJobSuccess` is correct and has no unnecessary re-render risk.

**Analysis:**
- NgRx `createSelector` + `store.pipe(select(...))` applies `distinctUntilChanged` internally using reference equality.
- `null === null` is `true`, so transitioning from `null` to `null` does NOT emit a new value downstream.
- No component subscribed to `success$` will re-render when a `getJob` action loads a job if `succesMsg` was already `null` before the action.
- If `succesMsg` was `'published'` before `getJob` (e.g., user saved then navigated to edit the same job), the reducer correctly resets it to `null` — preventing the stale `'asDraft'`/`'published'` dialog from re-firing on the next load cycle.
- Setting `null` explicitly is cheaper than the previous conditional string `action.job.jobStatusId == 1 ? 'asDraft' : 'published'` (which was the pre-fix value — it was always setting a success string on GET, causing spurious success dialogs).

**Verdict:** Applied correctly. No action needed.

---

## 5. Fix 9 — Subscription Management in job-create.component.ts

**Finding:** Wrapping `loading$` and `editJob$` in `Subscription.add()` is correct. No behavior or timing change. No double-subscribe risk.

**Analysis:**
- **Before:** `loading$` was declared as a class field (`loading$: any`) but never subscribed with `subscriptions.add(...)`. It was subscribed separately in `ngOnInit` without being added to the bag.
- **After:** Both subscriptions are created inside `ngOnInit` and added to `this.subscriptions` (a `new Subscription()` instance). `ngOnDestroy` calls `this.subscriptions.unsubscribe()` which tears down all added subscriptions.
- **No double-subscribe risk:** Each call to `.subscribe()` creates a new subscriber. The `subscriptions.add()` pattern just registers the `Subscription` object returned by `.subscribe()` into the parent bag — it does not re-subscribe. NgRx selectors are cold multicasts backed by the store; multiple subscribers are safe, but the fix ensures there's exactly one subscription per observable per component lifecycle.
- **Timing:** `ngOnInit` is where these were already being wired. Moving from an untracked local variable to `subscriptions.add()` doesn't change when the subscription is set up, only when it's torn down (now: on destroy; before: leaked, GC-dependent).

**Verdict:** Applied correctly. Leak plugged. No action needed.

---

## 6. companiesController.js and applicantsController.js — Audit Notes

These files were in scope but no DB-call performance issues were found related to the QA7 fixes they contain.

**applicantsController.js:** `updateBasicProfileInfo` and `updateProfile` both use `{ ...req.body, userId: req.user.uid }` to lock to the JWT identity. The respective services handle the UPDATE with a WHERE clause on `user_id`. No separate ownership SELECT; already 1 DB call. No optimization possible here.

**companiesController.js:** `updateCompany` uses `getUserCompany()` + caller-vs-body companyId comparison (not a SELECT pre-check). `removeCompanyUser` uses the same pattern. These are already optimally structured (no extra SELECT round-trip). No optimization applied.

---

## 7. employer-panel.component.scss — Audit Notes

No JS/TS runtime performance concerns. File contains SCSS for the mobile nav bar and billing bar. The `@include motion-safe` mixin correctly guards the transition. No changes applied.

---

## Summary Table

| # | Handler | Before (DB calls) | After (DB calls) | Saving | Applied |
|---|---------|-------------------|------------------|--------|---------|
| OPT-01 | updateStatusOfJob | 3 | 2 | -1 SELECT/request | Yes |
| OPT-02 | deleteContact | 3 | 2 | -1 SELECT/request | Yes |
| OPT-02 | updateContact | 3 | 2 | -1 SELECT/request | Yes |
| OPT-02 | updateGroup | 3 | 2 | -1 SELECT/request | Yes |
| OPT-02 | deleteGroup | 3 | 2 | -1 SELECT/request | Yes |
| OPT-03 | updateCV | 2 | 1 | -1 SELECT/request | Yes |
| OPT-03 | deleteCV | 2 | 1 | -1 SELECT/request | Yes |

**Total SELECT round-trips eliminated:** 7 per request across all optimized handlers.

---

## Deferred Items

| Item | Reason deferred |
|------|-----------------|
| `updateJobStatus` exported with new 3-arg signature | No external callers found; if any are added they need to pass companyId. Document in PR description. |
| `editContact` group-path uses string-interpolated queries (pre-existing) | Out of scope for OPTIMIZE — security issue, not a performance issue. Separate STITCH/SECURE item. |
| Contact.service.js several queries use string-interpolated companyId (pre-existing) | Same as above. |
| Parallel Promise.all for createJobs / updateJob sequential awaits | Medium effort, no regression risk, but not a QA7 fix sprint item — deferred to future OPTIMIZE pass. |
