# GETHIRED NOTIFY REPORT — RECENT DEPLOYMENT (V1)
**Scope:** deleteJob flow, job-create (F-08 FE), rate limiting, PayMongo webhook PII, CORS error handling
**Date:** 2026-06-25
**Repos:** get-hired-BE, get-hired-FE

---

## EXECUTIVE SUMMARY

| Item | Finding | Severity | Status |
|---|---|---|---|
| deleteJob confirmation dialog | Title grammar off; "Continue" button misleading; no impact statement | LOW | Copy fix recommended |
| deleteJob success toast | "Job deleted." — terse but functional | LOW | Copy fix recommended |
| deleteJob error fallback | Accurate and safe | PASS | No change |
| job-create loading states (F-08) | Well-wired; all states covered | PASS | No change |
| job-create validation toast | Exposes internal field names (incl. "company") | MEDIUM | Copy fix recommended |
| Rate limiting — global/write (429) | BE message lacks time window; FE handler correct | LOW/PASS | Optional improvement |
| Rate limiting — auth/sensitive messages | Include time windows; clear and helpful | PASS | No change |
| PayMongo webhook — payment.paid logging | PII stripped by QA11-FIX-03 (prior fix) | PASS | No change |
| PayMongo webhook — payment.failed logging | FULL PAYLOAD LOGGED — name/email/phone in be_out.log | HIGH | FIXED (NOTIFY-FIX-01) |
| PayMongo webhook — no user-facing messages | Server-to-server only; confirmed | PASS | No change |
| CORS error — user-facing | Interceptor swallows status-0; effects fallbacks provide safety net | MEDIUM | Note only |

**Bugs fixed this pass:** 1 (NOTIFY-FIX-01 — PII in payment.failed log)
**Copy fixes recommended (not yet applied):** 4

---

## 1. deleteJob — CONFIRMATION DIALOG

**File:** `get-hired-FE/src/app/shared/components/confirmation-dialog/confirmation-dialog.component.html`
**Called from:** `job-list.component.ts` `deleteRow()` with `{ action: 'Delete job', message: 'This action cannot be undone.' }`

### What the user sees

```
Delete job Confirmation
This action cannot be undone.
[Cancel]  [Continue]
```

### Findings

| ID | Issue | Severity |
|---|---|---|
| D-01 | Title "Delete job Confirmation" — lowercase "job" is grammatically inconsistent in a title context | LOW |
| D-02 | No impact statement — does not mention that applications/applicant data attached to this job will also be removed. A second sentence helps confirm user intent before a permanent destructive action. | LOW |
| D-03 | "Continue" button label is ambiguous — standard UX pattern for a destructive confirmation is to label the confirm button with the destructive verb ("Delete"). "Continue" belongs on multi-step flows. | LOW |

### Recommended copy

- **Title:** `Delete Job`
- **Body:** `This job and all associated data will be permanently deleted. This cannot be undone.`
- **Confirm button (i18n key DELETE_WARNING.CONTINUE_BUTTON):** `Delete`

Note: The confirm button label change affects the i18n key used by all callers of ConfirmationDialogComponent. Verify all callers before changing.

---

## 2. deleteJob — SUCCESS TOAST

**File:** `get-hired-FE/src/app/job/job-list/job-list.component.ts` line 244
**Current:** `'Job deleted.'` — 4-second success-snackbar

### Findings

| ID | Issue | Severity |
|---|---|---|
| S-01 | "Job deleted." is functional but terse. "Successfully" adds confirmation without adding clutter. | LOW |

### Recommended copy

`'Job deleted successfully.'`

---

## 3. deleteJob — ERROR MESSAGES

**Files:** `job-list.component.ts` line 142, `job.effects.ts` line 418

### Normalisation chain in effects

```
body.error || body.message || 'We couldn\'t delete this job. It may no longer exist or you may not have access.'
```

- BE 404: `{ error: "Job not found or you do not have access." }` → surfaces exactly
- BE 403: `{ message: "Job not found or you do not have access." }` → surfaces exactly
- Network/CORS (status 0): both undefined → fallback string used

### Findings

| ID | Issue | Severity |
|---|---|---|
| E-01 | BE error copy is user-safe — no SQL, stack traces, or company metadata | PASS |
| E-02 | Fallback copy is accurate and non-alarmist | PASS |
| E-03 | 404/403 intentionally collapsed ("not found or no access") — correct per security design | PASS |

No changes required for this section.

---

## 4. job-create — LOADING / ERROR / SUCCESS STATES (F-08 FE)

**File:** `get-hired-FE/src/app/job/job-create/job-create.component.ts` + `.html`

### Loading state — PASS

- Save as Draft button: shows "Saving..." spinner, `[disabled]="savingDraft || loading"`, `aria-live="polite"` — correct
- Publish button: shows "Publishing..." spinner, `[disabled]="!isAllowedToPublish || loading"`, `aria-live="polite"` — correct
- Double-submit prevented — correct

### Success state — PASS with minor copy note

| Event | Message |
|---|---|
| Draft saved | `UpdatedDialogComponent`: "Job successfully saved as Draft." |
| Published | `UpdatedDialogComponent`: "Job successfully Published." then navigate to job dashboard |
| Published (no jobId fallback) | Snackbar: "Your job was published. View all jobs." |

Minor: "Published" in "Job successfully Published." should be lowercase ("published") for sentence case consistency.

### Error state — PASS with one MEDIUM finding

Error mapping in jobError$ subscription:

| Error string contains | Shown to user |
|---|---|
| "permission" / "access" / "not found" | "We couldn't update this job. It may no longer exist or you may not have access." |
| "review" / "missing" / "required" / "field" | "Please review the highlighted fields." |
| "session" / "token" / "expired" / "unauthorized" / "401" | "Your session has expired. Please sign in again." |
| (catch-all) | "We couldn't update this job. Try again." |

All branches are safe — no SQL, stack traces, or internal schema names exposed via this mechanism.

### Findings

| ID | Issue | Severity |
|---|---|---|
| F-01 | Publish validation toast exposes internal field name "company" | MEDIUM |
| F-02 | "Published" capitalisation inconsistency | LOW |

### F-01 detail

`publishJobPost()` in `job-create.component.ts` builds a concatenated `missingJob` string from internal flag names and shows it in a snackbar:

```
"Your job post can't be published yet. Missing: job type job level company ."
```

The word **"company"** means `companyId` is null — this is an internal scope identifier, not a user-facing concept. If companyId is missing the user cannot fix it from the form. Showing it creates confusion and hints at an internal identity mechanism.

**Recommended copy:** Replace the concatenated field list with a single actionable message:

```
"Please complete all required fields before publishing."
```

If per-field hints are needed, use Angular form validators and template-level error spans — not a runtime snackbar that leaks internal key names.

---

## 5. RATE LIMITING — MESSAGE QUALITY

**File:** `get-hired-BE/server.js`

### BE messages

| Tier | Trigger | Message |
|---|---|---|
| Global | 500 req/15 min | "Too many requests. Please try again later." |
| Write | 100 req/15 min | "Too many requests. Please try again later." |
| Auth | 20 req/15 min | "Too many authentication attempts. Please try again in 15 minutes." |
| Sensitive | 10 req/hr | "Too many attempts. Please try again in an hour." |

### FE 429 handler

**File:** `get-hired-FE/src/app/core/interceptor/unauthorize.interceptor.ts` lines 35–44

```
"You've made too many requests. Please wait a moment and try again."
```

Shown as warn-snackbar (not danger), 5 seconds. Does NOT log the user out (correct — rate limiting is not an auth event).

### Findings

| ID | Issue | Severity |
|---|---|---|
| R-01 | Tier 1/3 message lacks time context — "later" is vaguer than the auth/sensitive tiers' explicit windows | LOW |
| R-02 | FE handler is correctly non-destructive (no logout, warn not danger class) | PASS |
| R-03 | No PII or internal details in any rate-limit message | PASS |

Optional improvement for Tier 1/3: `"Too many requests. Please try again in a few minutes."` — no security impact, small UX improvement.

---

## 6. PAYMONGO WEBHOOK — PII IN LOGS

**File:** `get-hired-BE/controllers/paymentController.js`

### Findings

| ID | Issue | Severity | Status |
|---|---|---|---|
| W-01 | **payment.failed branch logged full webhook payload** — `billing.email`, `billing.name`, `billing.phone` written to be_out.log | HIGH | **FIXED — NOTIFY-FIX-01** |
| W-02 | payment.paid branch — PII already stripped by QA11-FIX-03 (prior session) | PASS | No change |
| W-03 | Signature-fail log — no PII, logs only "request rejected" | PASS | No change |
| W-04 | No user-facing messages — webhook is entirely server-to-server | PASS | Confirmed |

### Fix applied

```javascript
// BEFORE (lines 215-216)
console.log("Payment Failed");
console.log(data);

// AFTER (NOTIFY-FIX-01)
console.log('[paymentController] payment.failed event received, id:', data && data.id);
```

---

## 7. CORS ERROR — USER-FACING VISIBILITY

**File:** `get-hired-FE/src/app/core/interceptor/unauthorize.interceptor.ts`

### What happens on a CORS block (status 0)

1. Browser aborts the request before a response is received
2. Angular `HttpClient` surfaces `HttpErrorResponse` with `status === 0`
3. The interceptor checks for `401 || 403` (no match) and `429` (no match)
4. Falls through to `else { return; }` — interceptor shows no toast
5. NgRx effects receive the error; `err.error` is `null` or a `ProgressEvent`
6. `body.error` and `body.message` are both `undefined`
7. Each effect's hardcoded fallback string is returned to the reducer
8. User sees the fallback message (e.g., "We couldn't delete this job. It may no longer exist or you may not have access.")

**Net result:** Not a silent swallow at the effect level — the user sees a generic error. But the message is misleading (implies a server response when the server was never reached).

### Findings

| ID | Issue | Severity |
|---|---|---|
| C-01 | Interceptor does not handle status 0 — no dedicated toast | MEDIUM |
| C-02 | Effects' fallback copy provides a safety net — user is not left with blank state | PASS (partial) |
| C-03 | Misleading copy on CORS failure — "It may no longer exist or you may not have access" is wrong if the real issue is network/CORS | NOTE |

**Recommended (not applied this pass):** Add `else if (err.status === 0)` to the interceptor:
```typescript
} else if (err.status === 0) {
  this.snackBar.open(
    'Unable to reach the server. Please check your connection and try again.',
    '', { duration: 5000, panelClass: ['warn-snackbar'] }
  );
}
```

---

## SUMMARY OF CHANGES MADE

| ID | File | Change |
|---|---|---|
| NOTIFY-FIX-01 | `controllers/paymentController.js` | Removed `console.log(data)` in payment.failed branch — replaced with id-only log to prevent PII in be_out.log |

## DEFERRED / NOT APPLIED

| ID | Item | Why deferred |
|---|---|---|
| D-01 | Dialog title "Delete job" capitalisation | i18n key change affects other callers |
| D-03 | Dialog confirm button "Continue" → "Delete" | i18n key change affects other callers |
| F-01 | Validation toast field list removal | Logic change in publishJobPost() |
| R-01 | Tier 1/3 rate limit time window | server.js change, low priority |
| C-01 | Status-0 CORS interceptor handler | Out of scope for copy-only audit |
