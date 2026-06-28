# GETHIRED_STITCH_REPORT_RECENT_V2
Generated: 2026-06-25 | Scope: BE 8a2a205 / FE a25cb38 deployment integration audit

---

## 1. Response Shape Contract (successResponse / errorResponse)

**Status: SAFE**

`successResponse(data)` returns `{ status:"success", data }`.
`errorResponse(msg)` returns `{ status:"error", error:msg }`.

FE access patterns confirmed across all effects and services:
- Success path: `res.data` — matches `.data` key. All ~60 call sites are consistent.
- Error path: `const { error } = err.error` — Angular's HttpClient wraps the 4xx/5xx body
  as `err.error`, so `err.error.error` resolves the string. Pattern is consistent across all
  effects (applicant, auth, company, job, admin, jobs, companies, application).

One non-standard pattern in `job.effects.ts` (lines 96, 172, 422):
```
const body = (err && err.error) || {};
const payload: string = body.error || body.message || '<fallback>';
```
This pattern safely handles both `{ error: "..." }` and any legacy `{ message: "..." }` shape.
No breakage introduced by the factory function refactor.

**One deviation noted** (pre-existing, not introduced by this deploy): `applicationController.js`
duplicate-application path returns `{ success:false, message:..., code:... }` — outside the
standard envelope. The FE `application.effects.ts` reads `err.error` generically, so this
doesn't break anything today, but it diverges from the factory pattern.

---

## 2. addCompanyUserByEmail Error String Change

**Status: SAFE**

The error string changed from `"Failed: Error: <raw>"` to `"Failed to add user"` (inside the
`catch` block of the private `addCompanyUserByEmail` helper at `companiesController.js:586`).

FE path for this value:
1. `InviteCompanyUser` in `shared/services/api/company.service.ts` calls POST
   `/company/addcompanyuser` and maps the response body via `map((res: any) => res.data)`.
2. The store effect (`company.effect.ts:inviteCompanyUser$`) dispatches
   `SAVE_COMPANY_USER_SUCCESS` with `payload: result` (which is `res.data`).
3. The reducer stores the full `res.data` object as `companyUserRes`.
4. `import-add-user.component.ts` reads `invite.companyUserRes.emails` (the per-email
   status array). Each item has `{ email, status, msg }` where `msg` comes from
   `addCompanyUserByEmail`'s return value.
5. The component checks `invite.companyUserRes.emails.length > 0` and sets
   `invitedUsersList` to the array, then shows a generic snackbar: "Successfully added
   contact". **The `msg` field is stored in `invitedUsersList` but never displayed to the
   user in the template** — no branch logic or UI string depends on its exact value.

The raw error string `"Failed: Error: ..."` was never shown to the user anyway.
Change is safe. Security improvement (no internal error detail exposure) is preserved.

---

## 3. recorder.service.ts async Change

**Status: SAFE — no synchronous stream assumption in caller**

`startRecording()` now `await`s `record()` before calling `resolve(this.stream)`.
This means the Promise resolves only after the dynamic `import('recordrtc')` completes and
`this.recorder.startRecording()` has been called.

`RecorderComponent.startVideoRecording()` (`recorder.component.ts:94`) calls:
```ts
this.recordService.startRecording(this.videoConf)
  .then(stream => {
    this.video.srcObject = stream;
    this.video.play();
  })
```
The stream is used only inside the `.then()` callback — no synchronous access to
`this.stream` after the call. The async change makes `stream` more reliably available
by the time `.then()` fires (previously `this.stream` was set before `record()` was
awaited, so `.then()` could fire before RecordRTC finished initializing internally).

The `recorder-setting.component.ts` uses `getUserMedia` independently via `navigator`
and doesn't call `startRecording()`. No other component injects `RecordService`.

**Net effect:** The change is a correctness improvement. RecordRTC will be fully
initialized when `this.video.play()` is called. No regression.

---

## 4. pg Pool Concurrency — Consecutive dbQuery.query Patterns

**Status: NO RISK FOUND**

Searched all controllers for `BEGIN`, `COMMIT`, `ROLLBACK`, `SET LOCAL`, `pg_temp`,
`CREATE TEMP`, `pool.connect`, `client.query`, `withTransaction`. Zero matches.

All DB calls use `dbQuery.query(...)` which goes through the pool (a new connection per
call). Consecutive awaited calls in the same handler (e.g. `applicationController.js:67-70`)
are independent reads — no temp tables, session variables, or transaction state is shared
across calls. There is no pattern that would break under pool-based concurrency.

The one multi-step write path (`addCompanyUserByEmail`: Firebase register → DB register →
assign to company → send email) uses sequential awaits but none of these depend on
PostgreSQL session state from a prior step. If `assignEmployeeToCompany` fails, the user
exists in Firebase and the DB but is not assigned. That's a pre-existing data-integrity gap
(partial failure), unrelated to this deployment.

---

## 5. listRecruiterThreads LIMIT 200 — FE Pagination

**Status: NO PAGINATION — SILENT TRUNCATION AT 200 THREADS**

`listRecruiterThreads` (`services/message.service.js:219`) applies `LIMIT 200` with no
cursor/offset parameter and no next-page token in the response.

`RecruiterMessagesComponent` calls `messageService.getRecruiterThreads()` once on
`ngOnInit`. It renders `filteredThreads` in a `*ngFor` list with no "load more" button,
no scroll listener, and no paginator. The HTML template (`recruiter-messages.component.html`)
confirms: thread list is a plain `<ul>` with no pagination controls.

**Impact:** A recruiter with >200 active candidate threads will silently see only the 200
most-recently-updated ones. This is a pre-existing architectural gap, not introduced by
this deployment, but it is unresolved.

**Recommended fix:** Add `?limit=N&offset=M` params to the endpoint and a "Load more"
button in the component, or increase the limit to a safer ceiling (e.g. 500) with a UI
note — most companies are unlikely to hit 200 threads in early usage.

---

## Summary

| # | Area | Verdict |
|---|------|---------|
| 1 | Response shape (successResponse / errorResponse) | SAFE |
| 2 | addCompanyUserByEmail error string change | SAFE |
| 3 | recorder.service.ts async startRecording() | SAFE (correctness improvement) |
| 4 | pg pool concurrency / consecutive dbQuery calls | NO RISK |
| 5 | listRecruiterThreads LIMIT 200 / FE pagination | PRE-EXISTING GAP (no pagination) |

No blocking issues introduced by BE 8a2a205 / FE a25cb38.
