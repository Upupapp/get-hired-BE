# Backend Requirements Log

Frontend-observed backend requirements that could not be implemented from
`get-hired-FE` per repository discipline (frontend agents do not modify
backend source). Each entry: observed limitation, required behavior,
proposed contract, frontend dependency, acceptance test.

---

## 2026-08-19 — GETHIRED_EMPLOYER_START_HIRING_MASTER_COMMAND

### 1. `publicJobPreviewRoutes` mounted after `billingRoutes`' catch-all auth gate — breaks guest AI job-preview generation entirely

**Observed limitation:** `POST /api/public/employer/ai-preview-generate` — an
intentionally anonymous, unauthenticated endpoint (see
`routes/publicJobPreviewRoutes.js`, no `verifyAuth` on this route; controller
doc comment explicitly states "Anonymous endpoint. Returns partial preview
only.") — currently returns `401 Unauthorized` for every request, including
requests with no Authorization header at all and requests to nonexistent
paths under `/api`.

**Reproduced live** (2026-08-19, fresh local backend restart, confirmed not a
stale-process artifact):
```
curl -s -i -X POST http://localhost:3000/api/public/employer/ai-preview-generate \
  -H "Content-Type: application/json" \
  -d '{"jobTitle":"Warehouse Supervisor"}'
→ HTTP/1.1 401 Unauthorized  (plain "Unauthorized" body, not the controller's JSON shape)
```
Same 401 also reproduces for `GET /api/nonexistent-route-xyz` and other
unrelated paths — confirming this is not specific to the preview route, but a
blanket rejection of everything mounted after a certain point in `server.js`.

**Root cause:** `server.js`'s own comment at the route-mounting section
already documents this exact bug class:

```js
// --- Route mounting ---
// googleAuthRoutes and linkedinAuthRoutes MUST be first — billingRoutes has
// router.use(validateFirebaseIdToken) as a catch-all auth gate; any route mounted
// after billingRoutes without its own auth middleware gets rejected 403.
app.use("/api", googleAuthRoutes);
app.use("/api", linkedinAuthRoutes);
...
app.use("/api", billingRoutes);          // line ~200 — catch-all validateFirebaseIdToken gate
app.use("/api", publicJobPreviewRoutes); // line ~201 — mounted AFTER the gate
```

`publicJobPreviewRoutes` was added after `billingRoutes` in the mount order.
`billingRoutes`' router applies `validateFirebaseIdToken` via `router.use()`
with no path filter, so it runs for every request that reaches that router —
including ones destined for a router mounted later, since a 401 response
without calling `next()` terminates the whole `app.use()` chain before Express
ever tries `publicJobPreviewRoutes`. This is the identical bug the
`googleAuthRoutes`/`linkedinAuthRoutes` comment already warns about; whoever
added `publicJobPreviewRoutes` later missed the same lesson.

**Required behavior:** anonymous preview generation must be reachable by a
guest with zero session, exactly as originally shipped and documented in
`GETHIRED_AI_JOB_PREVIEW_PANEL_FINAL_REPORT_V1.md`.

**Proposed contract (no new endpoint — pure ordering fix):** move
`app.use("/api", publicJobPreviewRoutes);` to before
`app.use("/api", billingRoutes);` in `server.js` (same fix pattern already
applied for `googleAuthRoutes`/`linkedinAuthRoutes`). `claim-preview` on that
same router already has its own `verifyAuth` middleware, so reordering does
not weaken it.

**Frontend dependency:** `AiJobPreviewPanelComponent.generate()` →
`PublicJobPreviewService.generatePreview()` (`src/app/public/services/public-job-preview.service.ts`)
— the entire guest "Start hiring" flow on the public `/employers` page is
currently broken end-to-end until this ordering is fixed. This is also why a
first-time guest currently sees a misleading "Your session has expired..."
message and gets redirected to `/signin` (the frontend's
`UnAuthorizedInterceptor` treats any 401 as an expired session) — partially
mitigated on the frontend side (see below) but the underlying 401 is a real
backend defect, not a frontend mislabeling.

**Acceptance test:** `curl -X POST http://localhost:3000/api/public/employer/ai-preview-generate -d '{"jobTitle":"Test Role"}'`
with no Authorization header returns `200` with `{ success: true, previewToken, partialPreview, expiresInMinutes: 30 }`, not `401`.

---

### 2. `claim-preview` is not atomic — same-token concurrent claims can create duplicate jobs

**Observed limitation:** `services/anonPreviewStore.js`'s `getPreview(token)`
is read-only (non-destructive); `controllers/publicJobPreviewController.js`'s
`claimPreview()` only calls `deletePreview(token)` *after* the DB insert
succeeds. Between `getPreview()` and `deletePreview()` there is an `await`
(the DB insert) during which a second concurrent request with the same
`previewToken` would also find the entry still present and also insert a
second job row for the same guest intent.

**Required behavior:** a given `previewToken` must be claimable at most once,
even under concurrent requests (Tab 07/08 of the Master Command: "Resume
callback runs twice → in-progress/idempotency guard prevents duplicate
database rows").

**Proposed contract:** make the claim atomic — e.g. an
`getPreviewAndDelete(token)` in `anonPreviewStore.js` that reads and deletes
in one synchronous operation (Node's single-threaded event loop makes this
trivial: no `await` between the object lookup and the `delete`), and have
`claimPreview()` call that instead of separate `getPreview()` +
`deletePreview()` calls. This closes the race without any schema or contract
change.

**Frontend dependency:** `EmployerPanelComponent.checkAndClaimAiPreview()`
(`src/app/employer-panel/employer-panel.component.ts`) — added a same-page-life
in-flight guard (`aiPreviewClaimInFlight`) as a frontend mitigation, but this
cannot protect against genuinely concurrent requests (e.g. two manually
replayed requests) — only the backend atomic fix closes that fully.

**Acceptance test:** fire two concurrent `POST /api/recruiter/job-post-assistant/claim-preview`
requests with the same valid token and a valid Employer JWT; exactly one
returns `200` with a `jobId`, the other returns `404` ("Preview not found or
expired"); exactly one job row exists in the database for that token.

---

## 2026-08-20 — GETHIRED_LOCAL_ACCOUNT_VERIFICATION_500_REMEDIATION_SINGLE_COMMAND_V1

### LOCAL ACCOUNT VERIFICATION — RESEND 500

**Observed:**
- Endpoint: `POST /api/auth/resendverificationlink?email=<email>`
- HTTP status: `500`
- Response body: `{"status":"error","error":"Operation not successful. Please try again."}`
- Relevant backend log line: `[resendVerification] error: Email Error: There is no user record corresponding to the provided identifier.`
- Exception origin: `controllers/userController.js`'s `resendVerification()` → `getVerification(email)` → `helpers/firebaseFunctions.js`'s `sendEmailVerificationFirebase(email)` → `firebaseAdmin.auth().generateEmailVerificationLink(email)` throws when no Firebase user exists for that email, re-thrown as a plain string (`throw "Email " + err`, not an `Error`), caught by `resendVerification`'s try/catch, which returns a generic `500` regardless of the actual failure cause.

**Root cause (live-reproduced against a freshly restarted local stack, not a stale-process artifact):** the local Firebase Auth Emulator's user store is in-memory and does not survive an emulator/backend restart, while the corresponding `gethired.users` Postgres row does persist. After any local dev-environment restart, resend/verification calls for a previously-registered-but-not-yet-verified account 500 because the account genuinely no longer exists on the Firebase side — retrying does not help; only re-registering against the currently-running emulator does. This is inherent to using an ephemeral auth emulator across restarts, not a code defect on its own — but the current error handling gives the caller no way to know that's what happened.

Two additional gaps observed in the same code path, confirmed live, not fixed here (backend source frozen):

1. **Generic error collapse:** every failure inside `getVerification()`/`resendVerification()` — Firebase-user-not-found, a Postgres error from `getUserRoleByEmail`/`getUserNameByEmail`, or anything else — collapses into the identical `500` + `"Operation not successful. Please try again."`. The frontend cannot distinguish "this will never succeed without re-registering" from "transient failure, retry may help."
2. **Account-existence status-code oracle:** an existing account → `200` with `{linkGenerated:true, emailSent:<bool>}`; a nonexistent email → `500`. The status code itself leaks whether an email is registered, independent of the response body content (which is already generic and doesn't leak this). Confirmed live: `resend500-qa@example.com` (real account) → `200`; `totally-nonexistent-user-xyz@example.com` → `500`.

Also observed (not a defect, just worth noting): `resendVerification` does not check whether the account is already verified before generating and returning a new link (`200` with `linkGenerated:true` for an already-verified test account) — Phase 8 of the originating command asked to "not unnecessarily resend verification" for a verified user; this can only be fixed backend-side since the frontend has no verification-state signal at this point in the flow.

**Root cause classification:** C (Firebase Auth Emulator state does not survive restart) + F (backend error-mapping/status-code defect, generic collapse + existence oracle).

**Required backend behavior:**
- Catch the specific `auth/user-not-found` Firebase Admin error code (not a stringly-typed generic re-throw) and return a distinct, non-500 status (e.g. `404` with a message that doesn't literally say "no such account" if account-enumeration avoidance is an intentional product decision elsewhere in this codebase — worth checking against `checkUserIfExistInFirebase`'s own existing privacy stance before choosing the exact wording/status).
- Fix `sendEmailVerificationFirebase`'s `throw "Email " + err` to re-throw a proper `Error` (or a structured `{code, message}`) so callers can distinguish failure classes instead of pattern-matching a string.
- Consider whether `resendVerification` should short-circuit with a distinct response when the target account is already verified.

**Production safety:** none of the above changes production's verification/email delivery behavior — production always has a live Firebase project (not an emulator), so accounts don't spontaneously stop existing between requests the way they do against a restarted local emulator. This entry only concerns local/dev ergonomics and error-mapping precision.

**Local behavior:** confirmed — Firebase Auth Emulator OOB verification does not require a real SendGrid key. `getVerification()` already generates a real, working verification link via `generateEmailVerificationLink()` regardless of email delivery outcome (`emailSent:false` is logged and returned, not treated as fatal) — the OOB code is independently retrievable via `GET http://localhost:9099/emulator/v1/projects/get-hired-363107/oobCodes` and consumable via the real `POST /api/auth/verifyemail?oobCode=...` endpoint, both confirmed working live this session.

**Acceptance test:**
1. Create local emulator user via `POST /api/auth/signup`.
2. Confirm `emailVerified=false` (unverified sign-in correctly blocked — confirmed live: `401` + `"Please Verify Email..."`).
3. Call `POST /api/auth/resendverificationlink?email=<email>` for that same, still-existing account → confirmed `200`.
4. Retrieve the OOB code from the emulator and complete verification via `POST /api/auth/verifyemail?oobCode=...` → confirmed `200`, `"Email Successfully verified."`.
5. Confirm verified sign-in succeeds → confirmed `200` with a real ID token.
6. Confirm production path is unchanged (no code touched there).

### Frontend fixes applied in get-hired-FE (this entry's matching implementation)

Two real, independently-confirmed frontend defects were found and fixed — these do not require any backend change and fully explain the "one action → multiple 500s" symptom reported:

1. **Duplicate request per click:** `account-authentication.component.html`'s resend button was inside a `<form (ngSubmit)="resendVerification()">` and also carried its own `(click)="resendVerification()"`, with no explicit `type` attribute. A bare `<button>` inside a `<form>` defaults to `type="submit"`, so one click fired both the click handler and native form submission — two overlapping calls per click, in addition to the automatic `setTimeout(() => this.resendVerification(), 3000)` already firing once on page load for `mode=resendVerification`. Fixed: explicit `type="submit"`, `(click)` handler removed, `[disabled]` bound to a new `resending` in-flight flag, and `resendVerification()` itself now no-ops if already in flight.
2. **Garbled error display:** the error handler passed the raw `HttpErrorResponse` object directly to the snackbar (`this.snackbarService.error(err, '')`) instead of extracting the backend's actual message (`err.error.error`, per this codebase's `errorResponse()` envelope shape). Fixed to extract the real string, with a generic fallback, plus an environment-gated (`!environment.production`) local-dev hint pointing at the emulator-restart cause diagnosed above — never shown in production, no verification bypass, no `emailVerified` shortcut.

---

## 2026-08-20 — EMAIL CASE-SENSITIVITY BUG: registerUser / resendVerification crash on any email with uppercase letters

**Severity: significant.** This is very likely the dominant real-world cause of both the signup 500 and the resend 500 — far more common than the emulator-restart scenario documented above, since it fires for essentially any user who types their email with normal capitalization (a leading capital, "Gmail" instead of "gmail", etc.), not just after a dev-environment restart.

**Observed (live-reproduced, both endpoints):**
- `POST /api/auth/signup` with `email: "Mysample@gmail.com"` → account is actually created successfully in both Firebase and Postgres, but the request still returns `500` `"Registration failed. Please try again."`
- A retry with the same email then correctly returns `500` `"User is already Registered. Please login instead."` (from the pre-check at the top of `registerUser`) — confirming the first attempt's account creation *did* succeed despite the error response.
- `POST /api/auth/resendverificationlink?email=Mysample@gmail.com` for the same account → `500`.
- Backend log (both cases): `TypeError: Cannot read properties of undefined (reading 'role')` at `helpers/userDetails.js:24` (`getUserRoleByEmail`), called from `getVerification()` (`controllers/userController.js:583`), called from `registerUser` (line 166) or `resendVerification` (line 199).

**Root cause, exact:**
- `controllers/userController.js`, `registerUser()`: line 154 builds `dbData.email` from `userData.email` — the value Firebase Admin returns after creating the account, which Firebase always normalizes to lowercase (confirmed live: `gethired.user_credentials.email` for this account is stored as `mysample@gmail.com`, all lowercase, despite the request body containing `Mysample@gmail.com`).
- Line 166, immediately after, calls `getVerification(email, user.firstName)` using `email` — the **original, un-normalized** value destructured from `req.body` at line 106 — not `userData.email`.
- `getVerification()` (line 577) passes that same case-preserved `email` into `getUserRoleByEmail(email)` and `getUserNameByEmail(email)` (`helpers/userDetails.js`), both of which do a case-sensitive Postgres `where email = $1` lookup against `user_credentials`. Since the stored value is lowercase and the queried value is not, the query returns zero rows; `rows[0].role` / `rows[0].firstname` then throws on `undefined`.
- `resendVerification()` (line 193-194) has the identical problem one level up: it reads `email` straight from `req.query` with no normalization at all, then calls `getVerification(email)` directly.
- Note: `sendEmailVerificationFirebase(email)` (the first line inside `getVerification`) succeeds regardless of case — Firebase Auth itself matches emails case-insensitively — so **the verification link is genuinely generated correctly before the crash**, and is retrievable via the emulator's `oobCodes` endpoint even though the HTTP response reports failure. Confirmed live: verification completed successfully for the affected test account using a link generated during a "failed" request.

**Required backend behavior:** normalize the email to lowercase once, immediately after destructuring `req.body`/`req.query` in both `registerUser` and `resendVerification` (and ideally at every other auth entry point that accepts an email — `loginUser` already gets this for free client-side via `signin.component.ts`'s `.toLowerCase()`, but nothing enforces it server-side, so any direct API caller bypasses that). Alternatively/additionally, use `userData.email` (the Firebase-normalized value) consistently instead of the raw request value for every downstream lookup in `registerUser`.

**Production safety:** this is a pure logic bug present in both local and production — normalizing the email is safe in both environments and does not touch verification/email-delivery architecture, Firebase configuration, or any environment-specific behavior.

**Frontend dependency:** none directly fixable — this is a server-side case-sensitivity bug between Firebase's own email normalization and this codebase's raw-request-value Postgres lookups; no frontend change can correct a server-side query.

**Acceptance test:**
1. `POST /auth/signup` with an email containing at least one uppercase letter (e.g. `Test.User@Example.com`).
2. Response is `201`, not `500`.
3. `gethired.user_credentials.email` for the new row is lowercase (Firebase's normalization) and the request succeeded on the first attempt (no need to "fail then retry").
4. `POST /auth/resendverificationlink?email=<the same mixed-case email>` also returns `200`, not `500`.

---

## 2026-08-20 — GETHIRED_EMPLOYER_AI_RECOVERY_DRAFT_AND_SIGNOUT_MODAL_CORRECTION

### 5. `gethired.job_type` is missing a "Freelance" row — AI Create can't persist that employment type

**Observed limitation:** `gethired.job_type` (`db/job_ddl.sql`) only seeds
3 rows: `1='Full time'`, `2='Part time'`, `3='Contractor'`. There is no row
for "Freelance", "Internship", or any other employment type. `job_type_id`
on `gethired.jobs` is a real foreign key to this table
(`jobs_fk_1 ... REFERENCES gethired.job_type(job_type_id)`).

**Reproduced (root cause, not live-curled this pass):** the AI Create panel's
Employment Type dropdown previously offered "Freelance" as an option, and
`resolveWorkSetupId`/`resolveJobTypeId`
(`get-hired-FE/src/app/job/utils/job-field-resolvers.ts`) previously mapped
it to a fabricated `job_type_id = 5` (and "Internship" to `4`) — ids that do
not exist in `gethired.job_type`. Selecting "Freelance" and letting AI
Create's background draft-save fire (`persistAssistantDraft()` in
`job-create.component.ts`) sent `job_type_id: 5` to `POST /job/createjobs`,
which fails the `jobs_fk_1` FK constraint on INSERT — surfaced to the
Employer as "Couldn't auto-save your AI draft. Your data is still here —
save manually when ready."

**Frontend mitigation already applied (this pass):** `resolveJobTypeId()` no
longer fabricates ids 4/5 for "intern"/"freelance" hints — it returns `null`
for both, so selecting "Freelance" no longer crashes the save (the column is
nullable). Per product requirement, "Freelance" is kept as a selectable
option in the AI Create Employment Type dropdown (which is otherwise now
sourced from the real `GET /options/type` list, matching the canonical
manual job-creation form) — it just can't carry a real `job_type_id` yet, so
an Employer who picks it will see Employment Type unset once they reach the
full job form and will need to re-pick from the 3 real options there.

**Required backend behavior:** add a real "Freelance" row to
`gethired.job_type` (and update the `jobs_fk_1` foreign key is already
generic, no schema change needed beyond the new row) so the frontend can map
to a real, persistable id instead of leaving it null. Recommend
`job_type_id = 4` (matching the frontend's original, now-removed
'freelance' → 4 mapping intent) to minimize churn if this is added later,
but any unused id works.

**Frontend dependency:** once a real "Freelance" `job_type_id` exists, add
that id back to `resolveJobTypeId()` in
`get-hired-FE/src/app/job/utils/job-field-resolvers.ts` (currently
deliberately absent) and it will resolve correctly with no other change.

**Acceptance test:**
1. `SELECT * FROM gethired.job_type;` includes a `'Freelance'` row.
2. In AI Create, select "Freelance" as Employment Type and generate/save a
   draft — the background autosave succeeds (no FK violation), and the
   employment type also appears correctly pre-selected in the full job form.

---

## 2026-08-20 — GETHIRED_EMPLOYER_AI_CREATE_RECOVERY_SERVER_DRAFT_GUEST_SPAM_SIGNOUT_SAFETY_MASTER_COMMAND (draft hardening closure)

### 6. `updateJob`'s SQL never sets `updated_at` — no real server-side revision signal for stale-vs-newer draft detection

**Observed limitation:** `gethired.jobs.updated_at` exists as a column
(`db/job_ddl.sql:99`, nullable timestamp) but `updateJob` in
`controllers/jobsController.js` (the `PUT /job/updatejobs` handler backing
every "Save Draft" after the first) never assigns it in its `UPDATE ... SET`
clause (`controllers/jobsController.js:300-308`). `createJobs`'s `INSERT`
likewise never sets it. In practice `updated_at` is always `NULL` for every
job in this schema, regardless of how many times it's been saved.

**Frontend impact:** the frontend's local AI Create recovery layer
(`AiCreateDraftService`) now tracks `serverJobId`/`serverSyncedAt` per draft
and can honestly detect "does this browser have local edits it hasn't yet
pushed to the server" (`hasUnsyncedLocalEdits()`), but it CANNOT detect "has
the server Draft been changed by some other actor/device/tab since I last
saved it," because the backend gives no revision signal to compare against.
This is a real gap in the "stale local recovery vs newer server draft"
safety property requested for this feature — the frontend cannot honestly
claim to detect that case today, and does not pretend to.

**Required backend behavior:** add `updated_at = now()` to `updateJob`'s
`SET` clause (and consider setting it in `createJobs`'s `INSERT` too, so a
freshly created job has a real initial value rather than `NULL`). This is a
low-risk, additive change to an existing nullable column already present in
the schema — no migration needed.

**Production safety:** safe in both environments; purely adds a timestamp
write to an existing UPDATE statement, no behavior change to any response
shape unless a caller starts reading it (which nothing currently does).

**Frontend dependency:** once `updated_at` is reliably maintained, extend
`AiCreateDraftEnvelope`/`markServerSynced()` to also store the server's
returned `updatedAt`, and compare it against a freshly-fetched job's
`updatedAt` when resuming a draft with a known `serverJobId`, to detect a
genuinely newer server Draft rather than only unsynced local edits.

**Acceptance test:**
1. `PUT /job/updatejobs` on an existing job, then
   `SELECT updated_at FROM gethired.jobs WHERE job_id = '<id>'` returns a
   recent timestamp, not `NULL`.
2. Saving the same job again produces a strictly later `updated_at`.

## 2026-08-27 — GETHIRED_PRODUCTION_READINESS_STABILIZATION — SEVERITY: CRITICAL

### 2. Eight committed, currently-deployed backend files import two service modules that do not exist anywhere in git history — undocumented out-of-band dependency, silent single point of failure

**Observed limitation:** `origin/main` (verified at commit `2958613`, the
exact commit this backend is currently deployed from) contains eight
tracked, clean (`git status` shows no local diff) files with hard,
top-level ES-module imports of `services/accessControl.service.js` and/or
`services/teamAccess.service.js`. Neither file exists in `git log --all`
for this repository -- `git show origin/main:services/accessControl.service.js`
fails with `fatal: path ... exists on disk, but not in 'origin/main'`.
Both files currently sit **untracked** (`??` in `git status`) in this
working tree, part of the larger uncommitted Team & Access / RBAC
work-in-progress this command was explicitly instructed to preserve and
never commit.

**The eight committed importers (all deployed, all confirmed clean against
origin/main):**

| File | Imports | Symbols |
|---|---|---|
| `services/interview.service.js` | `accessControl.service` | `sqlJobScopeFilter` |
| `services/applicant.service.js` | `accessControl.service` | `sqlJobScopeFilter` |
| `services/message.service.js` | `accessControl.service` | `getAccessContext, canAccessJob, sqlJobScopeFilter` |
| `services/application.service.js` | `accessControl.service` | `canAccessJob` |
| `controllers/jobsController.js` | `accessControl.service` + `teamAccess.service` | `getAccessContextForRequest, hasPermission, canAccessJob, sqlJobScopeFilter` (10 call sites) + `addJobAssignment` |
| `controllers/contactsController.js` | `accessControl.service` | `getAccessContextForRequest` |
| `controllers/companiesController.js` | `accessControl.service` + `teamAccess.service` | `getAccessContextForRequest, hasPermission` + `removeTeamMember as removeTeamMemberById` |
| `controllers/applicationController.js` | `accessControl.service` | `getAccessContextForRequest, canAccessJob, hasPermission, assertApplicationJobAccess` |

This covers the core of the product: job creation/listing, job
applications, messaging, company management, contacts, and interviews.

**Reproduced / verified (2026-08-27, this command):**
```
git status --short controllers/jobsController.js        → (empty -- clean)
git show origin/main:controllers/jobsController.js | grep accessControl
  → import { getAccessContextForRequest, hasPermission, canAccessJob,
      sqlJobScopeFilter } from "../services/accessControl.service";
     (present, 10 call sites, identical to local working copy)
git log --oneline --all -- services/accessControl.service.js  → (empty, no commit ever)
git show origin/main:services/accessControl.service.js
  → fatal: path 'services/accessControl.service.js' exists on disk,
    but not in 'origin/main'
```

**Directly reproduced the crash (not just inferred from static analysis):**
stashed `services/accessControl.service.js` and `services/teamAccess.service.js`
(along with the rest of the uncommitted RBAC work-in-progress, then restored
in full afterward -- `git stash push -u` / `git stash pop`, zero data lost,
verified by file-count and syntax-check before dropping the stash) to
produce a working tree that genuinely matches what a fresh `origin/main`
checkout would look like, then attempted to boot the backend:
```
$ node start.js
...
C:\...\controllers\companiesController.js:1
Error: Cannot find module '../services/accessControl.service'
Require stack:
- controllers/companiesController.js
- controllers/userController.js
- routes/userRoute.js
- server.js
- start.js
    at Object.<anonymous> (...\controllers\companiesController.js:1) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ ... ]
}
```
The process exited immediately (`node`'s own uncaught-exception exit).
This is not a single-route failure -- `start.js` never reaches
`app.listen()`, so **the entire backend fails to boot**, confirmed by
direct reproduction, not inference.

**Why production is not currently down (and why that is not reassuring):**
`https://api.gethiredonline.app/` responds `200 "Welcome to gethired API"`
right now -- confirmed live during this command. Since these are
synchronous top-level imports (evaluated at module load, before
`app.listen()`), a genuinely missing file at boot would crash the entire
Express app, not just these eight files' routes. The fact that the server
is up proves `services/accessControl.service.js` and
`services/teamAccess.service.js` **do exist on the production server's
filesystem right now** -- by some means outside git. The production
deploy workflow (`.github/workflows/deploy.yml`) runs `git fetch origin
main && git reset --hard origin/main && git clean -fd` on every single
push before restarting the process. `git clean -fd` removes untracked
files. This backend has been deployed multiple times today (this
session's own pushes: `19a8f07`, `8e8edd8`, `df40c14`, `2958613`), and the
server has not gone down -- meaning either (a) these two files are
present on the production filesystem in a location/manner that survives
`git clean -fd` (e.g. a server-local `.gitignore` addition never
committed to this repo, or a `.git/info/exclude` entry), or (b) they are
being re-created by some out-of-band process this command has no
visibility into. Either way, this is undocumented, unverified, and not
something the current codebase or deploy pipeline provides on its own --
a fresh clone of `origin/main` onto a new server, or any change to
whatever local exclusion is currently protecting these files from
`git clean -fd`, would crash the entire backend on the very next deploy.

**Root cause:** `services/accessControl.service.js` and
`services/teamAccess.service.js` were built as part of an in-progress
Team & Access / RBAC feature and were never committed -- but eight files
that DO depend on them were committed and merged into `main` regardless
(most likely during the large multi-week backlog merge earlier in this
engagement, where the RBAC work-in-progress was sitting in the same
working tree as legitimate, ready fixes and the import lines were carried
along without the files they reference).

**Recommended backend change (not implemented -- backend frozen for this
command):**
1. Immediate (P0, before any further deploy): commit
   `services/accessControl.service.js` and `services/teamAccess.service.js`
   to `main` in whatever state currently makes the local/production
   backend run successfully -- even if the broader RBAC feature (routes,
   controllers, UI) stays unreleased/unmounted. The goal is only to make
   the working tree's actual runtime dependencies match what git tracks,
   removing the silent single point of failure. This is not "shipping
   RBAC" -- `sqlJobScopeFilter`/`canAccessJob`/`getAccessContextForRequest`
   etc. already run in production today per the eight files above; not
   having them in git is strictly worse than having them in git.
2. Alternatively, if the RBAC feature is genuinely not ready to ship even
   as inert helper code: revert the eight files' RBAC-related hunks back
   to their pre-RBAC behavior (each function has an earlier, working,
   company-scoped-only version per this session's own audit history) and
   remove the dangling imports, deferring the whole feature to a real
   release rather than leaving half of it live by accident.
3. Either way: add a CI/deploy-time check that fails the deploy (before
   `pm2 restart`, which currently has no post-restart health verification
   at all) if `node --check` or a `require`/import dry-run of every
   committed entrypoint fails. This class of bug -- a committed file
   silently depending on an uncommitted one -- should be structurally
   impossible to deploy, not something that happens to survive by luck.
4. Determine and document exactly what is currently protecting these two
   files from `git clean -fd` on the production server, since that
   protection is itself undocumented and could be lost at any time
   (server migration, disk reprovisioning, a future deploy script change
   that adds `git clean -fdx` or similar).

**Severity / blocking impact:** CRITICAL, but not currently release-blocking
in the sense of "users are seeing errors right now" -- production is
observably up. It is release-blocking in the sense that this
certification cannot respsonsibly call the backend's deploy safety
anything better than CONDITIONAL: the app is one lost file (on a server
this command cannot inspect) away from a full outage, with no CI gate that
would have caught it before this audit found it by manual inspection.

**Frontend dependency:** None -- this is entirely a backend/deploy-pipeline
gap. No frontend change can mitigate it.

**Acceptance test (once addressed):**
1. From a completely fresh clone of `origin/main` (no local working-tree
   history, no leftover files), run `node --check` (or equivalent) against
   every file in `controllers/` and `services/` that has a static import --
   must resolve cleanly with zero "module not found" errors.
2. Add an explicit step to `deploy.yml` that performs this check (or a
   smoke `require()` of `server.js` in a throwaway process) after
   `npm ci` and before `pm2 restart`, failing the workflow (not just
   logging a warning) if it fails.

---

## 2026-08-27 — GETHIRED_PRODUCTION_READINESS_STABILIZATION — SEVERITY: CRITICAL

### 3. `POST /api/auth/signin` (email/password login) throws `FirebaseError: Need to provide options` on a cold process — the modular Firebase client SDK's default app is never initialized

**Observed limitation:** on a freshly started backend process (a clean
`pm2 restart`, a fresh worker after a crash, or the very first request a
new deployment ever receives), the very first call to
`POST /api/auth/signin` for ANY existing user fails with:

```
[loginUser] error: Error: FirebaseError: Firebase: Need to provide options,
when not being deployed to hosting via source. (app/no-options).
    at loginUserInDBAndFirebase (controllers/userController.js:540:11)
```

**Root cause (directly reproduced, not inferred):**
`helpers/firebaseFunctions.js: signInUserAndGetTokeninFirebase` calls the
**modular** Firebase Auth SDK's `getAuth()` with no arguments
(`firebase/auth`, `firebase/app`'s default app). That default app is only
ever created by calling `initializeApp(firebaseConfig)` from `firebase/app`
-- and grepping the entire backend (`from ['"]firebase/app['"]`) finds
**zero** call sites. The only `initializeApp` calls anywhere in the
codebase are in `controllers/imageController.js:37` and
`helpers/uploader.js:18`, and both use the **compat** SDK
(`firebase/compat/app`), invoked lazily, only inside the image/CV upload
code path, only after a request already arrives at `POST /api/images/upload`.

Empirically confirmed (`node -e` repro) that `firebase/compat`'s
`initializeApp()` registers into the *same* underlying app registry that
modular `firebase/app`'s `getAuth()` reads from -- so login "works" **only
as an accidental side effect** of some earlier, unrelated request in that
same process having already hit the image-upload path once. In this
session, every earlier successful `/api/auth/signin` call happened against
a long-lived process that had, at some point, processed an image/CV
upload; a genuinely fresh process (confirmed via `taskkill` + restart,
before any other request) fails on the very first login attempt, 100% of
the time.

**Registration is not affected by this bug** --
`registerNewUserInFirebase` (`userController.js:134`) uses
`firebaseAdmin.auth().createUser()` (the **admin** SDK, already
initialized at module load via `middleware/firebaseApp.js`), not the
client SDK's `createUserWithEmailAndPassword`. So on a cold process, new
accounts CAN be created, but no existing user -- including the one that
was just created -- can log in with `/api/auth/signin` until an unrelated
upload request happens to warm the compat registry first. There is no
user-facing way to trigger that warm-up (the upload route itself requires
an auth token that login is what's supposed to provide), so this is a full
login outage on a cold worker, not a degraded/slow path.

**In production (PM2 cluster, 2 workers):** any request that lands on a
worker that has not yet processed an image upload will hit this on its
first login attempt. Depending on real traffic mix this may be masked most
of the time (once *any* user on a worker uploads an image, that worker is
"fixed" for its remaining lifetime) -- which is consistent with this not
having been reported as a visible outage, and exactly why it was missed:
it is a silent, traffic-shape-dependent bug, not a deterministic one.

**Proposed fix (documented only, not implemented -- backend frozen):** in
`middleware/firebaseApp.js` (or a new small init module loaded at server
boot, before `app.listen()`), add:
```js
import { initializeApp } from 'firebase/app';
initializeApp(firebaseConfig);
```
once, at process startup, alongside the existing `admin.initializeApp`
call -- so the modular default app always exists before the first request,
regardless of whether an upload has ever occurred. This makes the
compat-SDK initializations in `imageController.js`/`uploader.js`
redundant (they already no-op via `firebase.apps.length` checks) but not
harmful to leave as-is.

**Frontend dependency:** None. Frontend already calls
`POST /api/auth/signin` correctly; this is purely a backend
initialization-order bug.

**Severity / blocking impact:** CRITICAL for certification purposes --
this is a real, reproducible login outage under a plausible, realistic
production condition (a newly deployed or newly restarted worker with no
prior upload traffic). It downgrades this certification's login/auth
domain below a clean PASS even though most warm-process testing in this
session did not surface it.

**How this session worked around it for further testing (test-only, no
code changed):** obtained ID tokens directly from the local Firebase Auth
Emulator's REST API (`POST http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=<any>`)
for the already-provisioned QA test accounts, and used those tokens
directly as `Authorization: Bearer <idToken>` against backend endpoints --
independent of the broken `/api/auth/signin` route -- to continue
exercising the rest of the authenticated jobseeker/employer flows.

**Acceptance test (once addressed):**
1. `taskkill` any running backend process, confirm port free.
2. Start the backend fresh with zero prior requests processed.
3. As the very first request to the process, call
   `POST /api/auth/signin` for an existing verified user.
4. Must return `200` with a valid token, not `Need to provide options`.

### 4. `gethired.interview_template_question` is missing an `updated_at` column against this session's reconstructed local DB — `PUT /api/interview/updatejobinterview` fails with `42703`

**Observed:** live-reproduced against the local dev DB (bootstrapped from
`db/local-dev/*.sql` per that directory's own documented, best-effort
process): `PUT /api/interview/updatejobinterview` for an existing
question fails with
`column "updated_at" of relation "interview_template_question" does not exist`
(`code 42703`, `routine: transformUpdateTargetList`).

**Why:** `db/complete_ddl.sql` (the legacy `jobhunt`-schema snapshot) has
always defined `updated_at timestamp NULL DEFAULT now()` on this table,
but no migration ever carried that column into the live `gethired` schema
-- `db/20260819d_interview_template_missing_columns.sql` (the most recent
fix for this exact table) added `created_at`/`sequence` but not
`updated_at`. This is the same class of gap
`db/local-dev/README.md` already documents and explicitly invites patches
for ("Other gaps may surface at runtime... add an additive `ALTER TABLE
... ADD COLUMN IF NOT EXISTS` patch file here").

**Not fixed in this session:** applying the `ALTER TABLE` (even scoped to
the local dev DB only, never touching a checked-in migration file) was
blocked by this environment's own action-safety classifier as a
schema-modifying operation, and this command's backend-freeze instruction
was treated as covering DB schema regardless of scope -- so the column
gap was left exactly as found and login/session-based testing continued
around it rather than through it.

**Proposed fix:** add
`db/local-dev/32_interview_template_updated_at_patch.sql` (and, since
this affects the real `gethired` schema, a corresponding dated file in
`db/`) with:
```sql
ALTER TABLE gethired.interview_template_question
	ADD COLUMN IF NOT EXISTS updated_at timestamp NULL DEFAULT now();
```

**Impact on this certification:** interview-question EDIT could not be
re-verified live in this session's reconstructed local environment after
the DB/emulator reset (TAB04/TAB07). The prior session turn's
code-level review of the deployed `origin/main` version of
`updateJobInterviewQuestion` (company-scoped `UPDATE ... RETURNING *`,
zero-rows -> 403) still stands as the basis for believing the endpoint is
correctly written; this is a local-schema-reconstruction gap, not a
newly found defect in the endpoint's logic itself. Classified as a known,
bounded local-environment limitation, not a release blocker.

**Frontend dependency:** None.

### 5. No DB migration process exists — deployment/rollback safety gap (documentation only, per TAB09 audit)

**Observed:** `package.json` has no `migrate` script (`scripts` block:
`test`, `start`, `postinstall`, `security:secrets`, two `deploy-*` gcloud
commands, two `*-server` ssh shortcuts -- nothing that applies `db/*.sql`
against a target database). Schema changes ship as loose, dated `.sql`
files in `db/` with no tracking of which have been applied to which
environment, no ordering enforcement beyond filename convention, and no
automated way to reproduce the live schema (this session's own local DB
reconstruction, `db/local-dev/*.sql`, is explicitly self-documented as
"best-effort," not verified-identical to production -- see finding 4
above for a concrete gap that reconstruction missed).

**Recommended migration process (proposed, not implemented):**
1. Adopt a real migration runner (`node-pg-migrate`, `db-migrate`, or a
   thin custom `scripts/migrate.js` that reads `db/*.sql` in filename
   order and records applied filenames in a `schema_migrations` table)
   so "what's applied where" becomes a queryable fact, not tribal
   knowledge.
2. **Ordering/idempotency:** keep the existing dated-filename convention
   (`YYYYMMDD_description.sql`) as the apply order; require every new
   migration to use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` guards
   (already the de facto convention in recent files like
   `20260819d_interview_template_missing_columns.sql`) so a migration can
   safely be re-run without erroring.
3. **Rollback:** none of the existing `.sql` files have a paired `down`
   migration. At minimum, document per-migration whether it's safely
   reversible (additive column/table = yes, data backfill = usually no)
   rather than attempting automated rollback for all of them.
4. **CI/CD integration point:** run the migration step after `npm ci`,
   before `pm2 restart`, in the same deploy stage flagged in finding 2's
   remediation (the boot-smoke-test gate) -- both gaps point at the same
   missing pre-restart verification stage.
5. **Pre/post-deploy validation:** pre-deploy, diff the target DB's
   applied-migrations table against `db/`'s file list and fail the
   deploy if any expected migration is missing; post-deploy, run a
   lightweight smoke query per critical table (the same tables finding 4
   and this session's local reconstruction had gaps on: `jobs`,
   `interview_template_question`, `applicants_profile`, `users`) to catch
   a silently-failed or partially-applied migration before traffic
   resumes.
6. **Failure behavior:** the deploy should fail closed -- if the
   migration step errors, `pm2 restart` must not proceed with the old
   code against a half-migrated schema (or vice versa).

**Frontend dependency:** None -- this is backend/deploy-process only.

### 6. Dependency security triage (`npm audit`, both repos) -- backend disposition recommendations only

Real `npm audit --json` run this session, both repos:

| Repo | Total | Critical | High | Moderate | Low |
|---|---|---|---|---|---|
| get-hired-BE | 27 | 4 | 12 | 10 | 1 |
| get-hired-FE | 95 | 10 | 52 | 22 | 11 |

**Backend critical-severity packages, disposition:**

| Package | Runtime exposure | Fix path | Risk if unfixed | Disposition |
|---|---|---|---|---|
| `protobufjs` | Transitive via `firebase-admin` -- used for every Admin SDK call (auth verification, Firestore/Storage if used) | Fix available, but breaking (`npm audit fix --force` would bump `firebase-admin` to a new major) | Prototype pollution / DoS chain in a dependency that touches every authenticated request via `verifyIdToken` | **Schedule for a dedicated `firebase-admin` major-version upgrade + regression pass, not a blind `--force` fix** -- too central to the auth path to bump unreviewed |
| `websocket-driver` | Transitive; check whether anything in this codebase actually opens WebSocket connections (no evidence found this session that it does) | Non-breaking fix available | Low if genuinely unused -- confirm via dependency tree before prioritizing | **Verify actual usage, then apply the non-breaking fix** -- likely a quick win |
| `form-data` | Transitive, multiple paths | **No fix available upstream** | Unsafe random boundary generation, CRLF injection in multipart bodies -- relevant anywhere the backend itself constructs outgoing multipart requests | **Monitor for upstream fix; audit call sites that use it to construct (not just receive) multipart requests in the meantime** |
| `request` | Transitive (deprecated package, likely via an older transitive dependency) | **No fix available** (package is unmaintained) | SSRF-class advisory | **Identify and remove/replace whatever still pulls in `request`** -- it's deprecated upstream and will never get a real fix; this is the one that most needs a dependency-tree audit, not just a triage note |

Frontend-critical packages (`@babel/traverse`, `@nguniversal/*`, `dompurify`,
`jspdf`, `tar`, `webpack`) are FE-owned disposition, not repeated here --
see the frontend certification report for those.

**Frontend dependency:** None for the backend table above; the FE table
lives in the FE-side certification report, not here, per this command's
own routing rule (backend recs -> notes.md only).

---

## 2026-08-27 — GETHIRED_BACKEND_COLD_START_AUTH_AND_DEPLOYMENT_INTEGRITY_P0 — FIXED

### Finding 3 (P0) — FIXED

**Fix implemented:** `middleware/firebaseApp.js` now initializes the
modular Firebase client SDK's default app exactly once, at process boot,
immediately after the existing Admin SDK initialization (guarded via
`getApps().length` so a second call is a safe no-op, mirroring the
existing Admin SDK guard). This is the single, correct ownership location
for this initialization -- no endpoint (image upload or otherwise) needs
to perform it opportunistically anymore. In local/dev only, when
`FIREBASE_AUTH_EMULATOR_HOST` is set, the same init also calls
`connectAuthEmulator()` once on the default app's auth instance --
production, which never sets that env var, is unaffected; this was added
because directly proving "signin succeeds" (not just "the crash is gone")
against this session's Firebase Auth Emulator required it, and it lives
in the exact same initialization block being added regardless.

**Verified via direct reproduction, 4 independent fresh process starts:**
- Before fix: first request to a truly fresh process (`POST
  /api/auth/signin`, no prior requests) → `500`,
  `FirebaseError: Need to provide options, when not being deployed to
  hosting via source. (app/no-options)`.
- After fix: first request to a truly fresh process → `200` with a real
  token, on every one of 4 independent restarts. `grep -c "Need to
  provide options"` across all 4 run logs = 0.
- Confirmed no duplicate-app crash across repeated signins in the same
  process, and across an unrelated image-upload call happening either
  before or with no bearing on signin anymore (both succeed
  independently).
- Registration (`admin.createUser`, unrelated Firebase Admin flow) and
  wrong-password / nonexistent-account signin error contracts are
  unchanged -- confirmed via the same log evidence (a pre-existing,
  unrelated local DB schema gap now surfaces for signup and for employer
  signin specifically -- see below -- but neither is a Firebase
  initialization error, and neither regressed from this fix).

**File changed:** `middleware/firebaseApp.js` only. `notes.md` also
modified (this entry). No other backend file touched.

### Two additional, pre-existing, unrelated local-DB gaps surfaced while proving the P0 fix (out of scope for this command's schema-patch phase; documented, not fixed)

1. `POST /api/auth/signup`: fails with `column "email" of relation
   "users" does not exist` -- happens *after* the Firebase Admin
   `createUser` step already succeeded (proving this is not a Firebase
   issue), inside `registerUserInDB`'s insert into a `users` table that
   doesn't match this session's reconstructed local schema. Same class of
   gap as findings 4/6 above.
2. `POST /api/auth/signin` for the employer test account specifically:
   fails with `column u.email does not exist`, downstream of a
   successful Firebase auth step, inside the post-auth `getUserCompany`
   join. Same class of gap. This is why this command's Phase 7 employer
   smoke-test step used an emulator-issued token (bypassing only this
   unrelated, pre-existing local DB join gap) rather than the real
   `/api/auth/signin` route for the employer leg specifically -- the
   jobseeker leg used the real route successfully throughout.

Neither gap is Firebase-related, neither regressed from this fix, and
fixing either would mean altering schema/queries beyond this command's
explicit Phase 6 scope (`interview_template_question.updated_at` only).
Flagged here for whoever eventually builds the real migration tooling
proposed in finding 5.

### Finding 2 — re-audited, consumer count corrected: 9 production consumers, not 8

Re-running the same audit query this session found the affected set has
grown since the prior pass. Corrected classification:

**Class 1 -- required production dependency (release-integrity blocker,
unchanged conclusion, larger blast radius than previously documented):**
9 tracked, clean, committed files that `origin/main` (== local HEAD,
confirmed identical via `git rev-parse HEAD origin/main`) actually
imports `services/accessControl.service.js` and/or
`services/teamAccess.service.js` from:
`controllers/applicationController.js`, `controllers/companiesController.js`,
`controllers/contactsController.js`, `controllers/jobsController.js`,
`services/applicant.service.js`, `services/application.service.js`,
`services/company.service.js` (**newly identified this pass -- not in
the original 8-file list**), `services/interview.service.js`,
`services/message.service.js`.

**Class 2 -- active/unfinished WIP dependency, not a current production
risk:** `controllers/scheduledInterviewController.js`,
`controllers/teamAccessController.js`,
`services/scheduledInterview.service.js` are untracked and also import
the same two missing modules, but since they were never committed to
`origin/main` either, they don't independently threaten the *current*
production boot -- they matter only if someone commits this WIP
Team-Access-RBAC feature without also committing its two dependencies,
which would be the exact same mistake compounded.

**Clean-checkout impact:** unchanged from the prior audit's direct
reproduction (stash the two untracked files, attempt `node start.js`,
observe `MODULE_NOT_FOUND` on `companiesController.js`'s import chain) --
not re-run this pass since local HEAD is confirmed identical to
`origin/main` and the destructive stash/restore cycle was already proven
once; re-running it a second time would add risk without adding new
information.

**Release classification: unchanged -- CRITICAL, release-integrity
blocker for the production baseline.** Not fixed in this command (out of
scope -- Phase 5 is audit-only, "do not silently add unrelated WIP code
to the production baseline").

---

## 2026-08-31 — GETHIRED_CV_BUILDER_MATCH_COACH_MASTER_COMMAND_V1, Phase B

### 1. No CV text-extraction or analysis engine exists — blocks CV Health, Surgical Review, Match Explorer, Action Plan

**Capability:** Extract structured/analyzable text from an uploaded CV file
(PDF/DOCX) and run a deterministic, explainable diagnostic against it
(completeness, structure, clarity, evidence of impact, consistency,
ATS-readiness signals per the master command's Tab 05), plus compare that
extracted content against a specific job's requirements (Tab 07) and
aggregate findings into a prioritized to-do list (Tab 08).

**Why required:** Four of the eight CV Builder & Match Coach tabs (CV
Health, Surgical Review, Match Explorer, Action Plan) are specified to
show real, evidence-grounded findings sourced from the applicant's actual
CV content. None of that is possible today — the backend stores the
uploaded file (Firebase Storage) and its metadata only; nothing anywhere
in `get-hired-BE` parses a PDF or DOCX into text, and there is no
analysis/scoring/matching logic of any kind. Building UI that pretends
otherwise would mean fabricating findings, which the master command
explicitly and repeatedly prohibits (Tab 06's Non-Fabrication Contract,
Tab 13's Prohibited Behavior list).

**Expected contract (not built, proposed shape only):**
- A text-extraction step (new dependency required — no PDF/DOCX parser
  exists in this codebase's `package.json` at all) run either at upload
  time or on-demand, producing a structured representation (sections,
  raw text spans) tied to the specific `documents.id` (now doubling as
  the CV version id, per the versioning work below).
- `POST /cv-builder/versions/:id/analyze` (or similar) — runs the
  deterministic CV Health checks against the extracted text, returns
  evidence-tagged findings (category, evidence span, finding, why-it-
  matters, recommended action — Tab 05's mandatory finding format).
  Must NOT return a numeric score unless a real, explainable, deterministic
  scoring model is deliberately designed and approved (Tab 05's Scoring
  rule) — descriptive status only otherwise.
- `POST /cv-builder/versions/:id/match?jobId=X` — compares extracted CV
  content against `jobs` table fields (requirements/skills/responsibilities
  already exist on the real job model) and returns per-requirement
  evidence states (Strong / Some / Not found / Needs confirmation, per
  Tab 07) — never a hiring-probability percentage (explicitly prohibited).
- An aggregation read that dedupes findings from the above and exposes
  them as prioritized Action Plan items (Tab 08).

**Data impact:** New table(s) for persisted analysis runs (tied to the
`documents.id`/version, not a mutable "current CV" pointer — Tab 02's
non-negotiable identity rule) and structured findings; a new backend
dependency for the text-extraction step.

**Frontend status:** `get-hired-FE/src/app/applicant/cv-builder/
cv-builder-shell.component.ts` now shows a distinct, honest explanatory
state for each of these four tabs (naming this exact gap in plain
language) instead of one generic "isn't ready yet" placeholder. No
fabricated findings, scores, or match data are shown anywhere. This is
intentionally the full extent of Phase B's frontend work on these four
tabs — implementing real UI against a nonexistent contract was explicitly
out of scope.

**Proof:** `grep -ri "cv.?health|surgical|match.?explorer|action.?plan|cvVersion" get-hired-BE --include=*.js` 
returns zero matches for any analysis/scoring/matching implementation
(only this controller/route file naming and two unrelated matches in
`publicCompanyController.js`/`searchController.js`).

---

### 2. What Phase B DID build on the backend (for context, not a gap)

Real CV versioning was implemented and applied to production as part of
this same command (explicitly authorized — no real applicant CV data
existed yet to put at risk): `db/20260831c_cv_versioning.sql` adds
`documents.is_cv_version` (additive, backfilled, non-destructive).
`controllers/cvBuilderController.js` gained `getCvVersions`,
`activateCvVersion`, `deleteCvVersion` (routes in
`routes/cvBuilderRoutes.js`), and `uploadCv` now demotes-and-keeps the
previous CV instead of deleting it. This closes part of the original
CV-versioning gap (Tab 09) for real — Versions/History is now a genuinely
working, non-fabricated feature, not a placeholder. It does NOT include
compare/diff between versions (Tab 09's "Compare versions using an
intelligible text/section diff" — that needs the same text-extraction
capability as item 1 above, so it's listed there, not built here).
