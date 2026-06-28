# GETHIRED_BACKEND_ERROR_ENVELOPE_AUDIT.md
## QA Cycle 11 — Backend error envelope audit

---

## Error envelope shapes in use

### helpers/status.js (shared across all controllers)

Standard envelope shapes observed in messageController.js:

**Success:**
```json
{ "success": true, "data": <payload> }
```
HTTP 200

**Known error (via handleKnownError):**
```json
{ "success": false, "message": "<user-friendly string>", "code": "<ERROR_CODE>" }
```
HTTP 400 / 403 / 404

**Unknown error (fallback):**
```json
{ "error": "Operation not successful. Please try again." }
```
HTTP 500 (errorMessage shape — note: uses "error" key, not "message")

---

## Issue: inconsistent envelope keys in error responses

The `successMessage` envelope uses `data` key; `errorMessage` uses `error` key.
Known errors (handleKnownError) use `message` key.

| Case | HTTP | Key | Value |
|---|---|---|---|
| Success | 200 | data | payload |
| Known error | 400/403/404 | message | user-friendly string |
| Known error | 400/403/404 | code | ERROR_CODE |
| Unknown error | 500 | error | generic string |
| Rate limit (express-rate-limit) | 429 | message | rate limit string |

The 500 envelope uses `{ error: "..." }` while 4xx known errors use `{ message: "...", code: "..." }`.
Frontend code reading `err.error?.message` will miss the 500 fallback (which is `err.error?.error`).

**Risk:** If the FE ever adds specific error-message display, it must handle both shapes.

---

## Rate-limit envelope (express-rate-limit default)

```json
{ "message": "Too many requests. Please try again later." }
```
HTTP 429

This is the standard express-rate-limit shape with `message: { message: "..." }` configured.
The outer envelope wraps the inner object, so `res.body.message` is a string — clean.

---

## Internal information leak check

| Error path | Leaks internal info? |
|---|---|
| messageController handleKnownError | NO — maps to predefined strings |
| messageController catch fallback | NO — generic "Operation not successful" |
| Rate limit message | NO — generic "Too many requests" |
| Auth loginError (localStorage) | POTENTIAL — stores whatever loginError is set to in auth facade; needs audit |

---

## console.error calls

```js
console.error('[messageController] error:', error);
```

Appears in openThread, getThreadMessages, postMessage, getRecruiterThreads.
Stack traces go to server logs only — NOT sent to client. Correct pattern.

---

## interviewController / recruiter interview hub endpoint

Not yet audited this cycle. The hub endpoint at `/interview/hub` is called
via raw `HttpClient.get()` in `recruiter-interview-hub.service.ts`, bypassing
`BaseService`. Its error handling is in the component (generic boolean flag).
If the BE hub endpoint returns raw error objects, they are silently absorbed.
No direct risk — just noted.

---

## Recommendations

1. Normalize error envelope: always use `{ success: false, message: "...", code: "..." }` —
   drop the `{ error: "..." }` variant so FE can rely on a single key.
2. Add a global Express error handler in server.js to catch unhandled throws and
   return the normalized envelope instead of Express's default HTML 500.
3. Audit auth facade loginError source — ensure only sanitized strings are stored.

---

*Generated: NOTIFY QA Cycle 11*
