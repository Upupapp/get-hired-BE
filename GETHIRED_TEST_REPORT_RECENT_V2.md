# GetHired Test Coverage Report — Deployment 8a2a205 / a25cb38

Generated: 2026-06-25

---

## 1. Response Shape Contract

**Factory functions (`helpers/status.js`):**
```js
const successResponse = (data) => ({ status: "success", data });
const errorResponse = (error) => ({ status: "error", error });
```
Shape is exactly `{ status: "success", data: X }` and `{ status: "error", error: "msg" }` — matches FE contract.

**Controller verification (5 checked):**

| Controller | Success | Error |
|---|---|---|
| userController.js | `successResponse({...credentials})` | `errorResponse("Login failed...")` |
| employerController.js | `successResponse(userCompany)` | `errorResponse("Operation not successful...")` |
| companiesController.js | `successResponse(company)` | `errorResponse("Operation not successful...")` |
| subscriptionController.js | `successResponse(link.attributes.checkout_url)` | `errorResponse("Operation not successful...")` |
| paymentController.js | `successResponse(link)` | `errorResponse("Operation not successful...")` |

All 5 use the new factories. No legacy `{ status: "success", ...data }` spread patterns found.

---

## 2. RecordRTC Async Change

**Before:** `record()` was synchronous. `startRecording()` called `this.record()` without await, then immediately `resolve(this.stream)`.

**After (`recorder.service.ts:82-85`):**
```ts
browser.mediaDevices.getUserMedia(conf).then(async stream => {
  this.stream = stream;
  await this.record();
  resolve(this.stream);
})
```

**Analysis — timing change:**
- `await this.record()` waits for the dynamic `import('recordrtc')` to resolve before `resolve(this.stream)` is called.
- Before: `resolve(this.stream)` fired immediately after `getUserMedia` resolved, with RecordRTC loading asynchronously in the background. The stream was valid but RecordRTC may not have started yet.
- After: `resolve(this.stream)` fires only after RecordRTC is loaded AND `recorder.startRecording()` is called. Callers that consume the resolved stream and immediately interact with the recorder will now be safe — this is an improvement, not a regression.

**Regression risk — unsupported browser:**
If `new RecordRTC(...)` or `recorder.startRecording()` throws (e.g., no WebRTC support), the exception propagates out of `record()`, rejected promise bubbles to the `async stream =>` callback, but that callback has no catch block. The outer Promise's `reject` is NOT called — the `startRecording()` Promise will hang unresolved. The `_recordingFailed` subject is also never called in this path. This is a latent bug (existed before the async change but the async path now makes it more likely to surface since it awaits a step that can throw synchronously).

**Verdict:** No timing regression for the happy path. One latent error-path gap: RecordRTC constructor errors are silently swallowed.

---

## 3. Concurrent DB Correctness (pool max 1 → 10)

**`returning *` pattern:** All INSERT queries use PostgreSQL's `RETURNING *` clause to receive the inserted row in the same statement. No separate SELECT after INSERT is needed or present in any controller.

**Sequential INSERT pair (`userController.js:404-418`):**
`registerUserInDB` does two sequential INSERTs — one into `user_credentials`, one into `users`. They run on separate pool connections without a transaction. If the second INSERT fails, `user_credentials` has a dangling row. This is pre-existing and unrelated to the pool size change, but with pool=10 multiple registrations can run concurrently without connection starvation, so the orphan-row window is the same probability per request.

**No serialization dependency found:** No code path was found that relied on pool=1 serial execution to avoid a race condition. Sequential `await dbQuery.query()` calls within a single async function use the pool's own locking — each `await` acquires and releases a connection independently, which was always the case.

**Verdict:** Pool change is safe. The pre-existing two-INSERT-without-transaction pattern in `registerUserInDB` is the only structural concern and is unrelated to pool size.

---

## 4. Test Matrix

**BE tests:** Zero application-owned test files exist. `*.test.js` / `*.spec.js` in the BE repo are exclusively inside `node_modules/`.

**FE tests:** 80+ `*.spec.ts` files exist but none cover `recorder.service.ts` directly (the changed file). The closest specs are `record-interview.component.spec.ts` (two copies for application and home views).

**Tests needed for the factory refactor:**

- `helpers/status.test.js`: Unit tests for `successResponse` / `errorResponse` — verify exact keys, verify `errorResponse(new Error("msg"))` serializes as `{}` for the `error` field (see section 5), verify `successResponse(null)` / `successResponse([])` pass through.
- Controller integration tests using `supertest`: at minimum one success path and one DB-error path per controller, asserting the JSON body shape.
- FE service spec for `recorder.service.ts`: mock `navigator.mediaDevices.getUserMedia`, mock `import('recordrtc')`, assert stream resolves only after `startRecording()` is called, assert rejection is propagated when RecordRTC constructor throws.

---

## 5. Boundary Case — `errorResponse(error)` with Error Object

`errorResponse` is defined as `(error) => ({ status: "error", error })`. If an `Error` instance is passed, `JSON.stringify` will produce `{ "status": "error", "error": {} }` — an empty object — because `Error` properties (`message`, `stack`) are non-enumerable.

**Current usage:** All controllers pass string literals to `errorResponse()`, not raw Error objects. The one exception is `addCompanyUserByEmail`, which is an internal helper (not an HTTP handler) — it returns a plain object with a `msg` field, never calls `errorResponse` directly.

**Verdict:** No current caller passes an Error object to `errorResponse`, so there is no live bug. However, the factory has no guard — a future `catch (err) { res.json(errorResponse(err)) }` would silently produce `{ "error": {} }`. Recommend adding `.message ?? String(error)` coercion inside the factory:
```js
const errorResponse = (error) => ({
  status: "error",
  error: error instanceof Error ? error.message : error,
});
```
