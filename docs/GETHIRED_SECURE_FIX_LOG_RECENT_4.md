# GETHIRED SECURE FIX LOG RECENT 4
**Date:** 2026-06-26
**Session:** SECURE RECENT 4 — targeted post-deployment audit

---

## FIX-01 — Remove console.log(filename) in applicant.service.js

**File:** `get-hired-BE/services/applicant.service.js`
**Line:** 897 (before fix)
**Issue:** `console.log(filename)` logged the applicant document filename to the server log on every document attachment save operation. While not a credential leak, it writes applicant file identifiers (which encode the applicant profile ID, e.g. `uuid-ProfilePhoto`) to server logs unnecessarily.
**Risk:** LOW — file identifiers in server logs; no direct user exposure.
**Fix:** Replaced with a comment explaining the removal.

```diff
-  console.log(filename);
+  // SECURE-RECENT-4-FIX-01: removed console.log(filename) — logged applicant document filename in plain text
```

**Constraint check:** No `?.` or `??` operators used. Fix is a comment-only change, no logic modified.

---

## FIX-02 — Remove console.log(rows[0]) in job.service.js

**File:** `get-hired-BE/services/job.service.js`
**Line:** 434 (before fix)
**Issue:** `console.log(rows[0])` logged the full raw job database row on every `getJobDetails()` call. This includes all internal fields from the jobs table (salary columns, internal IDs, join columns) to the server log.
**Risk:** LOW-MED — full DB row in server logs; not exposed to users but increases log noise and sensitive data in log storage.
**Fix:** Replaced with a comment.

```diff
-      console.log(rows[0]);
+      // SECURE-RECENT-4-FIX-02: removed console.log(rows[0]) — logged full job DB row including internal fields
```

**Constraint check:** No `?.` or `??` operators used. No logic changed.

---

## FIX-03 — Remove console.log(data) in add-access-modal (FE)

**File:** `get-hired-FE/src/app/shared/components/add-access-modal/add-access-modal.component.ts`
**Line:** 30 (before fix)
**Issue:** `console.log(data)` in the component constructor logged the dialog injection data on every invite modal open. The `data` object contains email addresses of users being invited to the company. This data is visible to any user who opens browser DevTools while using the invite flow.
**Risk:** LOW — email addresses visible in browser console; exploitable only by the same authenticated user who opened the modal, but still unnecessary exposure.
**Fix:** Replaced with a comment.

```diff
-    console.log(data)
+    // SECURE-RECENT-4-FIX-03: removed console.log(data) — could expose invited email addresses in browser console
```

**Constraint check:** FE TypeScript file; no `?.`/`??` restriction applies to FE.

---

## DEFERRED FINDINGS (not fixed — require more substantial refactor)

### SEC-OPT-01 / SEC-OPT-02 — Raw error strings displayed to user in auth components

**Files:**
- `get-hired-FE/src/app/auth/signup/signup.component.ts:124` — `this.error = err`
- `get-hired-FE/src/app/auth/account-authentication/account-authentication.component.ts:127` — `this.snackBar.open(err, ...)`

**Reason deferred:** Requires refactoring the auth facade/effects layer to sanitise Firebase error codes before they reach the component's `error$` observable. The BE already returns only generic strings, so the risk vector is specifically Firebase auth error codes (e.g. `EMAIL_NOT_FOUND`, `TOO_MANY_ATTEMPTS_TRY_LATER`). These are auth-domain messages, not internal DB/stack traces. Will be addressed in a future NOTIFY/UX pass.

---

## Files Modified This Session

| File | Change |
|------|--------|
| `get-hired-BE/services/applicant.service.js` | Removed console.log(filename) |
| `get-hired-BE/services/job.service.js` | Removed console.log(rows[0]) |
| `get-hired-FE/src/app/shared/components/add-access-modal/add-access-modal.component.ts` | Removed console.log(data) |
