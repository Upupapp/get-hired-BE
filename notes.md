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
