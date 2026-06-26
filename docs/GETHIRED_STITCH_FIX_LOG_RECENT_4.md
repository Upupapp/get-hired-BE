# GETHIRED STITCH FIX LOG RECENT_4

**Date:** 2026-06-26
**FE HEAD:** 8a41f25 | **BE HEAD:** 35f7754

---

## Fix 1 — env.js: staging APP_URL_DEV conditional reads wrong variable

**Severity:** Low (staging-only; production is unaffected)
**File:** `get-hired-BE/env.js`

### Problem

Lines 57-58 (jobhunt staging) and lines 91-92 (eucannajobs staging) both contain:

```js
app_url: process.env.APP_URL_DEV
  ? process.env.APP_URL       // BUG: should be process.env.APP_URL_DEV
  : `http://localhost:4200`,
```

When `APP_URL_DEV` is set (truthy), the resulting `app_url` is assigned the value of `APP_URL` (the production env var), not `APP_URL_DEV`. This causes the CORS `origin` check in `server.js` (`app.use(cors({ origin: env.app_url }))`) to use the production origin (`https://gethiredonline.app`) during staging deployments, making cross-origin staging FE requests fail unless they coincidentally share the same origin.

### Constraint

No `?.` or `??` operators — Acorn 6/7 / esm 3.2.25.

### Fix

```js
// get-hired-BE/env.js — jobhunt case, line 57-59
app_url: process.env.APP_URL_DEV
  ? process.env.APP_URL_DEV   // was: process.env.APP_URL
  : `http://localhost:4200`,
```

```js
// get-hired-BE/env.js — eucannajobs case, line 91-93
app_url: process.env.APP_URL_EUCANNAJOBS
  ? process.env.APP_URL_EUCANNAJOBS   // was: process.env.APP_URL
  : `http://localhost:4200`,
```

**Note:** The eucannajobs branch already correctly checks `APP_URL_EUCANNAJOBS` in the conditional (line 91) but then assigns `APP_URL` — same class of bug, same fix pattern.

### Status

NOT yet applied. Production is unaffected. Apply before the next staging smoke test.

---

## Fix 2 — import-add-user: dead `message?` field on InviteResult interface

**Severity:** Cosmetic / negligible
**File:** `get-hired-FE/src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`

### Problem

The `InviteResult` interface (lines 14-19) declares both `msg?: string` and `message?: string`. The BE only ever sends `msg` (see `companiesController.js` line 488-490). The `message?` field is never populated and is read by no code in the component — it is a dead field.

### Fix (optional)

Remove the unused `message?` field from the interface to match the actual BE contract:

```ts
interface InviteResult {
  email: string;
  status: string;
  msg?: string;
  // message?: string;  -- removed: BE sends msg, not message; dead field
}
```

### Status

NOT yet applied. No functional breakage exists; this is a code-hygiene item only. Apply at next FE maintenance pass.

---

## No other fixes required

All remaining 5 seams (SnackbarService provider, SnackbarService injection, axios API usage, bcryptjs, CORS production) verified clean with no action needed.
