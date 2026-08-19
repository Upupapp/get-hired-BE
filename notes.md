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
