# GETHIRED_NOTIFY_FIX_LOG.md
## QA Cycle 11 — All NOTIFY fixes applied this cycle

---

## Fix 1 — Rate-limit 429 FE handling (SEC-01)

**File:** `src/app/core/interceptor/unauthorize.interceptor.ts`
**Change:** Added `else if (err.status === 429)` branch showing warning snackbar.
**Copy:** "You've made too many requests. Please wait a moment and try again."
**Why safe:** No logout, no navigation, no data change. Purely informational UI.
**Risk level:** Zero — purely additive to existing interceptor.

---

## Fix 2 — message-thread loading state: role="status" (a11y)

**File:** `src/app/shared/components/message-thread/message-thread.component.html`
**Change:** Added `role="status"` to the loading div.
**Why safe:** Additive ARIA role. No visual change, no logic change.
**Risk level:** Zero.

---

## Fix 3 — message-thread error state (no messages): role="alert" (a11y)

**File:** `src/app/shared/components/message-thread/message-thread.component.html`
**Change:** Added `role="alert"` to the error div when messages.length === 0.
**Why safe:** Additive ARIA role. Announces error to screen readers immediately.
**Risk level:** Zero.

---

## Fix 4 — message-thread send error: role="alert" (a11y)

**File:** `src/app/shared/components/message-thread/message-thread.component.html`
**Change:** Added `role="alert"` to the inline error paragraph.
**Why safe:** Additive ARIA role. No visual change.
**Risk level:** Zero.

---

## Fix 5 — Legacy empty-section: alt="" on decorative images (a11y)

**File:** `src/app/shared/components/empty-section/empty-section.component.html`
**Change:** Added `alt=""` to both empty.png and empty-search.png img tags.
**Why safe:** alt="" is the correct WCAG technique for decorative images.
No visual change.
**Risk level:** Zero.

---

## Fix 6 — Email verification copy typo (auth)

**File:** `src/app/auth/account-authentication/account-authentication.component.ts`
**Change:** "Verification link send to your email. Please verify and login again."
→ "Verification email sent. Please check your inbox and verify your account."
**Why safe:** Snackbar text only. No logic change.
**Risk level:** Zero.

---

## Fix 7 — Signin email-not-verified copy normalisation (auth)

**File:** `src/app/auth/signin/signin.component.ts`
**Change:** "Please Verify Email with the link sent to your registered email address."
→ "Please verify your email address. Check your inbox for the verification link we sent."
**Why safe:** this.error string assignment only. Matching condition string unchanged.
**Risk level:** Zero.

---

## Not fixed this cycle (backlog)

| Gap | Reason not fixed |
|---|---|
| "Candidate A1B2C3" label UX improvement | Requires schema/backend decision on identity fallback |
| message-thread send error: doesn't surface 4xx specific messages | Requires error parsing + guard to prevent 5xx leaks; too risky for NOTIFY cycle |
| Auth loginError sanitization | Requires auth facade audit; too broad for NOTIFY scope |
| Global Express error handler | BE change; out of NOTIFY scope |
| Transactional email (new messages, status changes) | New dependency + templates; product decision required |
| is_read schema migration for unread count | Schema change + migration; product decision required |

---

## Files changed this cycle

| File | Changes |
|---|---|
| `get-hired-FE/src/app/core/interceptor/unauthorize.interceptor.ts` | +429 handler |
| `get-hired-FE/src/app/shared/components/message-thread/message-thread.component.html` | +3 ARIA roles |
| `get-hired-FE/src/app/shared/components/empty-section/empty-section.component.html` | +2 alt="" |
| `get-hired-FE/src/app/auth/account-authentication/account-authentication.component.ts` | typo fix |
| `get-hired-FE/src/app/auth/signin/signin.component.ts` | copy normalisation |

**FE files changed: 5**
**BE files changed: 0**

---

*Generated: NOTIFY QA Cycle 11*
