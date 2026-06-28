# GETHIRED_ERROR_STATES_GUIDE.md
## QA Cycle 11 — Error state inventory and quality guide

---

## Principles applied

1. Never expose stack traces, internal error codes, or raw server messages to users.
2. Always provide a clear next action (retry, go back, contact support).
3. Use role="alert" so screen readers announce errors immediately.
4. Distinguish transient (retry works) from persistent (needs human action) errors.
5. Never blame the user for a system error.

---

## PASS / FAIL assessment for each error state

---

## Recruiter Messages Inbox — main load error

```
"We couldn't load your messages"
"Please try again. If the issue continues, go back to your dashboard."
[Try again] [Back to dashboard]
```

- role="alert": YES
- Hides internal error: YES (error callback never exposes err.message)
- Retry available: YES (with "Trying…" in-progress state)
- Fallback action: YES
- Copy is user-centric: YES
- **PASS**

---

## Interview Hub — main load error

```
"We couldn't load interview activity."
"This might be a temporary issue. Try again or return to your dashboard."
[Try again] [Back to dashboard]
```

- role="alert": YES
- Hides internal error: YES (error callback sets `this.error = true` only)
- Retry available: YES
- Fallback action: YES (routerLink, not button — acceptable for a link)
- Copy is user-centric: YES
- **PASS**

---

## message-thread — open thread error (no messages ever loaded)

```
"Could not open this conversation."
"Could not open this conversation. Please try again."
```

- role="alert": NO — shown inside a `div *ngIf="!loading && error"`, no role set
- Hides internal error: YES (error() callback never reads err.message)
- Retry available: NO — no retry button; user must navigate away
- Fallback action: NO
- **FAIL — needs role="alert" and a retry or navigation action**

---

## message-thread — send failure

```
"Could not send your message. Please try again."
```

- Shown as `msg-thread-inline-error` paragraph
- role="alert": NO
- Hides internal error: YES
- Retry available: Implicitly yes (user can try sending again)
- **BORDERLINE — add role="alert" aria-live="assertive" to surface this to screen readers**

---

## message-thread — poll failure (messages already loaded)

When poll fails after initial load, the existing `messages` array is preserved
and no error is shown. This is correct behavior — silent degradation is better
than alarming the user on a transient network hiccup.
- **PASS (intentional design)**

---

## Employer Panel — profile load failure

```
"We couldn't load your profile. Please refresh the page or sign in again."
[link: sign in again → /signin]
```

- role="alert": NO — plain div, no semantic role
- Hides internal error: YES
- Retry available: refresh only (no button)
- **BORDERLINE — add role="alert"; consider explicit Retry button**

---

## Unauthorized interceptor — 401 / 403

```
Snackbar: "Your session has expired. Please sign in again to continue."
panelClass: ['danger-snackbar']
```

- role="alert": handled by MatSnackBar ARIA implementation
- Hides internal error: YES
- Next action: redirect to /signin
- **PASS**

---

## Rate limit — 429 (ALL ROUTES)

- Backend sends: `{ message: 'Too many requests. Please try again later.' }`
- FE interceptor: DOES NOT handle 429
- Each component's `error()` callback fires → generic error state shown
- In message-thread send: "Could not send your message. Please try again."
- In recruiter-messages load: "We couldn't load your messages" (same error panel as 500)
- **FAIL — user cannot distinguish rate limit from a system error; cannot be told to wait**

---

## Auth error — loginError from localStorage

```
this.error = localStorage.getItem('loginError');
```

- If backend returns a raw internal error string, it lands in localStorage and
  is displayed directly to the user in the signin form.
- Risk: server-generated messages like "duplicate key value violates unique constraint"
  or "relation does not exist" could leak.
- **FAIL — raw server errors must be sanitized before storage**

---

## Summary table

| Error location | role=alert | Hides internals | Retry | Grade |
|---|---|---|---|---|
| Messages inbox load | YES | YES | YES | PASS |
| Interview Hub load | YES | YES | YES | PASS |
| message-thread open | NO | YES | NO | FAIL |
| message-thread send | NO | YES | implicit | BORDERLINE |
| Panel profile load | NO | YES | NO | BORDERLINE |
| 401/403 interceptor | via MatSnackBar | YES | redirect | PASS |
| 429 rate limit | NO | N/A | NO | FAIL |
| Auth loginError | N/A | NO | NO | FAIL |

---

*Generated: NOTIFY QA Cycle 11*
