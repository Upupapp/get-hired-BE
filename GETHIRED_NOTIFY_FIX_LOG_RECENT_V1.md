# GETHIRED NOTIFY FIX LOG — RECENT DEPLOYMENT (V1)
**Scope:** deleteJob, job-create F-08 FE, rate limiting, PayMongo webhook, CORS
**Date:** 2026-06-25

Format: Fix ID | File | Type | What changed | Why

---

## FIXES APPLIED THIS PASS

### NOTIFY-FIX-01 — PayMongo payment.failed PII leak
| Field | Value |
|---|---|
| **Fix ID** | NOTIFY-FIX-01 |
| **Severity** | HIGH |
| **File** | `get-hired-BE/controllers/paymentController.js` |
| **Type** | Security / Privacy |
| **Lines changed** | 215-216 (old) → 215 (new, single line) |

**Before:**
```javascript
console.log("Payment Failed");
console.log(data);
```

**After:**
```javascript
console.log('[paymentController] payment.failed event received, id:', data && data.id);
```

**Why:** `data` is `req.body.data` from the PayMongo webhook payload. The `payment.failed` event includes `billing.email`, `billing.name`, and `billing.phone` from the payment attempt. Writing `console.log(data)` dumps this PII in plaintext to be_out.log. Only the non-PII payment id is now logged, consistent with the QA11-FIX-03 fix already applied to the `payment.paid` branch.

**Risk of change:** Zero — this is a log statement only. No business logic, no response shape, no DB query was touched.

---

## FIXES RECOMMENDED BUT NOT APPLIED

These are safe copy-only changes. They are listed here for tracking. Apply them as a separate commit with the relevant i18n or template owner.

### REC-01 — deleteJob confirmation dialog copy
| Field | Value |
|---|---|
| **Severity** | LOW |
| **File** | `get-hired-FE/src/app/job/job-list/job-list.component.ts` (data payload) + i18n key `DELETE_WARNING.CONTINUE_BUTTON` |
| **Type** | Copy |

**Change needed:**
- `action` from `'Delete job'` to `'Delete Job'` (title-case)
- `message` from `'This action cannot be undone.'` to `'This job and all associated data will be permanently deleted. This cannot be undone.'`
- i18n key `DELETE_WARNING.CONTINUE_BUTTON` value from `'Continue'` to `'Delete'`

**Caveat:** i18n key change affects all callers of ConfirmationDialogComponent.

### REC-02 — deleteJob success toast
| Field | Value |
|---|---|
| **Severity** | LOW |
| **File** | `get-hired-FE/src/app/job/job-list/job-list.component.ts` line 244 |
| **Type** | Copy |

**Change needed:** `'Job deleted.'` → `'Job deleted successfully.'`

### REC-03 — job-create publish validation toast
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **File** | `get-hired-FE/src/app/job/job-create/job-create.component.ts` `publishJobPost()` ~line 490 |
| **Type** | Copy / Logic |

**Change needed:** Replace `"Your job post can't be published yet. Missing: ${missingJob.trim()}."` with `"Please complete all required fields before publishing."`

**Why:** The concatenated field list includes internal identifiers like "company" that are meaningless to the user and expose internal scope concepts.

### REC-04 — job-create success dialog capitalisation
| Field | Value |
|---|---|
| **Severity** | LOW |
| **File** | `get-hired-FE/src/app/job/job-create/job-create.component.ts` `afterSubmit()` ~line 537 |
| **Type** | Copy |

**Change needed:** `'Job successfully Published.'` → `'Job successfully published.'`

### REC-05 — Rate limit Tier 1/3 time window (optional)
| Field | Value |
|---|---|
| **Severity** | LOW |
| **File** | `get-hired-BE/server.js` globalLimiter and writeLimiter message |
| **Type** | Copy |

**Change needed:** `"Too many requests. Please try again later."` → `"Too many requests. Please try again in a few minutes."`

---

## NOT CHANGED — CONFIRMED PASS

| Item | File | Verdict |
|---|---|---|
| deleteJob error message | job.effects.ts, job-list.component.ts | Safe, accurate |
| payment.paid logging | paymentController.js | PII already stripped by QA11-FIX-03 |
| Webhook signature-fail log | paymentController.js | No PII |
| Rate limit auth/sensitive messages | server.js | Include time window; clear |
| FE 429 interceptor message | unauthorize.interceptor.ts | Correct — non-destructive warn |
| F-08 job-create loading states | job-create.component.ts/.html | All states covered, aria-live in place |
| F-08 job-create error mapping | job-create.component.ts | Safe — no security internals exposed |
| JobCompatibilityService | services/match/ | NOT TOUCHED — out of scope per standing guardrail |
