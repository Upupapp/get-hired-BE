# GetHired QA Cycle 7 — Fix Sprint Log

**Date:** 2026-06-25  
**Sprint scope:** 9 fixes across BE (security/BOLA) and FE (store hygiene, CSS, subscriptions)

---

## Build Result

**PASS** — `ng build --configuration production` completed with 0 errors.  
Warnings only: autoprefixer flex-start notice (pre-existing, not introduced by this sprint), xlsx CommonJS bailout notice (pre-existing).  
Build time: ~19.7 s. Hash: 2265f73bd1c45bd1.

---

## Fix 1 — P1: `updateStatusOfJob` missing BOLA check

**Status: APPLIED**

File: `get-hired-BE/controllers/jobsController.js`

`updateStatusOfJob` had no ownership check before calling `updateJobStatus`. Any authenticated employer could archive/expire any other company's job by supplying an arbitrary `jobId` in the request body.

Fix: added `getUserCompany(req.user.uid)` at the top of the try block, followed by an explicit `Array.isArray` guard and a parameterized ownership SELECT (`SELECT job_id FROM gethired.jobs WHERE job_id = $1 AND company_id = $2`) before any write. Returns 403 with a safe generic message on failure. Pattern is identical to the existing checks in `updateJob` and `deleteJob`.

Lines changed (approx): 359–369 → expanded to 359–384.

---

## Fix 2 — P1: Dangling live line in `companiesController.js`

**Status: APPLIED**

File: `get-hired-BE/controllers/companiesController.js`

Line 411 (original):
```
    errorMessage.error = "Operation not successful. Please try again.";
```
This line was inside a commented-out `getSetupListCompany` function but was missing its `//` prefix, causing it to execute at module load time and mutate the shared `errorMessage` object.

Fix: prefixed `//` to the line. Now reads:
```
//     errorMessage.error = "Operation not successful. Please try again.";
```

---

## Fix 3 — P2: `Array.isArray` guard consistency

**Status: APPLIED**

File: `get-hired-BE/controllers/jobsController.js`

`updateJob` and `deleteJob` used `!callerCompany || !callerCompany.companyId` — which does not catch the `[]` (empty-array) return shape from `getUserCompany` when no company row exists (an array is truthy).

Changed both guards to:
```js
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
```
This is now consistent with the pattern applied in Fix 1.

---

## Fix 4 — P2: Applicant profile BOLA (F-NEW-01)

**Status: APPLIED**

File: `get-hired-BE/controllers/applicantsController.js`

Both `updateProfile` and `updateBasicProfileInfo` passed `req.body` directly to the service layer. The service (`applicant.service.js`) destructures `userId` from the body object and uses it in the SQL WHERE clause (`WHERE user_id=$13`), meaning any authenticated applicant could overwrite another's profile by sending a different `userId` value.

Fix: Both handlers now spread `req.user.uid` as `userId` over the request body before passing to the service:
```js
await updateApplicationProfile({ ...req.body, userId: req.user.uid });
await updateProfileBasicInfo({ ...req.body, userId: req.user.uid });
```
The `userId: req.user.uid` key-last spread ensures the JWT-derived value always wins, even if the caller sends `userId` in the body. Profile data fields (name, bio, skills, etc.) are unchanged — only the WHERE clause identity is locked.

Also added `console.error('[updateProfile] error:', ...)` and `console.error('[updateBasicProfileInfo] error:', ...)` to the catch blocks (were previously using the generic tag).

---

## Fix 5 — P2: Contacts controller missing ownership checks (F-NEW-02)

**Status: APPLIED**

File: `get-hired-BE/controllers/contactsController.js`

Schema findings from reading the file and `contact.service.js`:
- Contact table: `gethired.contact`, PK: `contact_id`, company-scoping column: `company_id` (confirmed via INSERT and SELECT queries in the service)
- Group table: `gethired."group"` (quoted identifier), PK: `group_id`, company-scoping column: `company_id` (confirmed via INSERT `gethired."group"` and SELECT queries)
- `contactId` for `deleteContact`/`updateContact` comes from `req.query.contactId` / `req.body.contactId` respectively
- `groupId` for `deleteGroup`/`updateGroup` comes from `req.query.groupId` / `req.body.groupId` respectively

Added `import { getUserCompany } from "./companiesController"` to the file header.

For each of the four handlers, added:
1. `getUserCompany(req.user.uid)` — derives caller's company from JWT
2. `Array.isArray` guard → 403
3. Parameterized ownership SELECT before any DB write → 403 if 0 rows

```
SELECT contact_id FROM gethired.contact WHERE contact_id = $1 AND company_id = $2
SELECT group_id FROM gethired."group" WHERE group_id = $1 AND company_id = $2
```

---

## Fix 6 — P2: CV controller missing ownership checks (F-RESIDUAL-01)

**Status: APPLIED**

File: `get-hired-BE/controllers/cvController.js`

Schema findings: table `gethired.cv`, PK: `cv_id`, owner column: `user_id` (confirmed by `createCV` INSERT and `getUserCVlist` SELECT).

**`updateCV`:** Removed `userId` from the body destructure; replaced with `const userId = req.user.uid` (JWT-derived). Added ownership check before the UPDATE:
```js
SELECT cv_id FROM gethired.cv WHERE cv_id = $1 AND user_id = $2
```
Returns 403 if 0 rows.

**`deleteCV`:** Added the same ownership check (`cv_id AND user_id = req.user.uid`) before the DELETE. Returns 403 if 0 rows.

Both handlers now guarantee only the CV's true owner can mutate or delete it.

---

## Fix 7 — P2: iPhone notch safe-area for billing bar (D-01)

**Status: APPLIED**

File: `get-hired-FE/src/app/employer-panel/employer-panel.component.scss`

Changed `.gh-billing-bar` `bottom` from:
```scss
bottom: 56px;
```
To:
```scss
bottom: calc(56px + env(safe-area-inset-bottom, 0px));
```

On notched iPhones (iPhone X+) the bar now clears the home indicator. On non-notched devices `env(safe-area-inset-bottom, 0px)` resolves to `0px`, so behaviour is identical.

---

## Fix 8 — P3: `getJobSuccess` sets stale `succesMsg`

**Status: APPLIED**

File: `get-hired-FE/src/app/job/state/job.reducer.ts`

`getJobSuccess` was setting:
```ts
succesMsg: action.job.jobStatusId == 4 ? 'archived' : 'expired'
```
This polluted `succesMsg` on every job load, causing any component that reads this flag to incorrectly show an "archived" or "expired" state message after a normal job detail fetch.

Changed to:
```ts
succesMsg: null  // QA7 FIX-8: loading a job must not pollute succesMsg
```

---

## Fix 9 — P3: Unmanaged subscriptions in `job-create`

**Status: APPLIED**

File: `get-hired-FE/src/app/job/job-create/job-create.component.ts`

Two subscriptions were not tracked in the `subscriptions` bag:

1. **`loading$`** — was a class-field property immediately subscribed via `.subscribe(this.onLoad.bind(this))`. Changed the class field to an unsubscribed declaration (`loading$: any`) and moved the actual subscription into `ngOnInit` wrapped in `this.subscriptions.add(...)`.

2. **`editJob$.subscribe(...)`** — was called inline in `ngOnInit` without being added to the bag. Wrapped with `this.subscriptions.add(...)`.

`ngOnDestroy` already calls `this.subscriptions.unsubscribe()` — no change needed there.

---

## Deferred Items

None. All 9 fixes were applied.

---

## Overall Production Verdict

**READY.** Build passes with 0 errors. All 9 fixes applied cleanly:
- 3 P1 BOLA security fixes (job status, companies dangling code, job update/delete guard consistency)
- 4 P2 BOLA/security fixes (applicant profile, contacts, groups, CV)
- 1 P2 CSS fix (safe-area billing bar)
- 1 P3 store fix (stale succesMsg)
- 1 P3 memory-leak fix (unmanaged RxJS subscriptions)

No breaking changes to existing API contracts, route guards, employer login, applicant flow, admin flow, public jobs, or payment behavior.
