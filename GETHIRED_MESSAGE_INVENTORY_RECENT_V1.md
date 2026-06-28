# GETHIRED MESSAGE INVENTORY — RECENT DEPLOYMENT (V1)
**Scope:** deleteJob, job-create F-08, rate limiting, PayMongo webhook, CORS
**Date:** 2026-06-25

Format: ID | Surface | File | Current Copy | Grade | Recommended Copy | Fixed?

---

## deleteJob — CONFIRMATION DIALOG

| ID | Surface | File | Current | Grade | Recommended | Fixed? |
|---|---|---|---|---|---|---|
| MSG-001 | Dialog title | confirmation-dialog.component.html (data from job-list.component.ts) | "Delete job Confirmation" | C — lowercase "job", redundant "Confirmation" suffix | "Delete Job" | No (REC-01) |
| MSG-002 | Dialog body | job-list.component.ts `deleteRow()` | "This action cannot be undone." | B — accurate but missing impact context | "This job and all associated data will be permanently deleted. This cannot be undone." | No (REC-01) |
| MSG-003 | Confirm button | i18n DELETE_WARNING.CONTINUE_BUTTON | "Continue" | C — ambiguous for a destructive action | "Delete" | No (REC-01) |
| MSG-004 | Cancel button | i18n DELETE_WARNING.CANCEL_BUTTON | (existing value) | A — cancel is correct | No change | N/A |

---

## deleteJob — TOAST MESSAGES

| ID | Surface | File | Current | Grade | Recommended | Fixed? |
|---|---|---|---|---|---|---|
| MSG-005 | Success snackbar | job-list.component.ts line 244 | "Job deleted." | B — functional, terse | "Job deleted successfully." | No (REC-02) |
| MSG-006 | Error snackbar (fallback) | job-list.component.ts line 142 | "We couldn't delete this job. It may no longer exist or you may not have access." | A — accurate, safe, non-alarming | No change | N/A |
| MSG-007 | Error snackbar (from BE 404/403) | job.effects.ts line 418 (body.error / body.message) | "Job not found or you do not have access." | A — safe, non-revealing | No change | N/A |

---

## job-create — LOADING / ERROR / SUCCESS STATES (F-08 FE)

| ID | Surface | File | Current | Grade | Recommended | Fixed? |
|---|---|---|---|---|---|---|
| MSG-010 | Draft button in-flight | job-create.component.html | "Saving..." + spinner | A | No change | N/A |
| MSG-011 | Publish button in-flight | job-create.component.html | "Publishing..." + spinner | A | No change | N/A |
| MSG-012 | Draft save success dialog | job-create.component.ts afterSubmit() | "Job successfully saved as Draft." | A | No change | N/A |
| MSG-013 | Publish success dialog | job-create.component.ts afterSubmit() | "Job successfully Published." | B — "Published" capitalisation | "Job successfully published." | No (REC-04) |
| MSG-014 | Publish success fallback snackbar (no jobId) | job-create.component.ts | "Your job was published. View all jobs." | A | No change | N/A |
| MSG-015 | Publish validation toast (missing fields) | job-create.component.ts publishJobPost() | "Your job post can't be published yet. Missing: {fieldList}." | D — exposes internal field name "company"; concatenated list is fragile | "Please complete all required fields before publishing." | No (REC-03) |
| MSG-016 | Error — permission/access/not found | job-create.component.ts ngOnInit | "We couldn't update this job. It may no longer exist or you may not have access." | A — safe | No change | N/A |
| MSG-017 | Error — review/missing/required/field | job-create.component.ts ngOnInit | "Please review the highlighted fields." | A | No change | N/A |
| MSG-018 | Error — session/token/expired | job-create.component.ts ngOnInit | "Your session has expired. Please sign in again." | A | No change | N/A |
| MSG-019 | Error — catch-all | job-create.component.ts ngOnInit | "We couldn't update this job. Try again." | A — simple and safe | No change | N/A |
| MSG-020 | Talent proof publish snackbar | job-create.component.ts afterSubmit() | "Your job is published and ready to be discovered by {talentProofCopy}." | A — personalised, positive | No change | N/A |

---

## RATE LIMITING

| ID | Surface | File | Current | Grade | Recommended | Fixed? |
|---|---|---|---|---|---|---|
| MSG-030 | BE 429 — Global limiter | server.js | "Too many requests. Please try again later." | B — no time window | "Too many requests. Please try again in a few minutes." | No (REC-05) |
| MSG-031 | BE 429 — Write limiter | server.js | "Too many requests. Please try again later." | B — no time window | "Too many requests. Please try again in a few minutes." | No (REC-05) |
| MSG-032 | BE 429 — Auth limiter | server.js | "Too many authentication attempts. Please try again in 15 minutes." | A — includes time window | No change | N/A |
| MSG-033 | BE 429 — Sensitive limiter | server.js | "Too many attempts. Please try again in an hour." | A — includes time window | No change | N/A |
| MSG-034 | FE 429 interceptor snackbar | unauthorize.interceptor.ts | "You've made too many requests. Please wait a moment and try again." | A — friendly, non-destructive, warn class | No change | N/A |

---

## PAYMONGO WEBHOOK (server-to-server — no user-facing messages)

| ID | Surface | File | Current (log only) | Grade | Fixed? |
|---|---|---|---|---|---|
| MSG-040 | payment.paid log | paymentController.js line 174 | "[paymentController] payment.paid event received, id: {id}" | A — PII-free | N/A (prior fix QA11-FIX-03) |
| MSG-041 | payment.failed log (pre-fix) | paymentController.js lines 215-216 | "Payment Failed" + full data dump with billing PII | F — PII leak | FIXED (NOTIFY-FIX-01) |
| MSG-041 | payment.failed log (post-fix) | paymentController.js line 215 | "[paymentController] payment.failed event received, id: {id}" | A — PII-free | FIXED |
| MSG-042 | Signature verification fail log | paymentController.js line 100 | "[paymentController] Webhook signature verification failed — request rejected" | A — no PII | N/A |

---

## CORS / NETWORK ERRORS

| ID | Surface | File | Current | Grade | Recommended | Fixed? |
|---|---|---|---|---|---|---|
| MSG-050 | status-0 — interceptor | unauthorize.interceptor.ts | (no toast — silently returns) | C — no user feedback from interceptor | "Unable to reach the server. Please check your connection and try again." | No (tracked as C-01) |
| MSG-051 | status-0 — deleteJob effect fallback | job.effects.ts | "We couldn't delete this job. It may no longer exist or you may not have access." | C — misleading (implies server responded when it didn't) | "Unable to reach the server. Please try again." | No |
| MSG-052 | status-0 — saveJob effect fallback | job.effects.ts | "Unable to save your job. Please try again." | B — generic enough to cover CORS | No change | N/A |

---

## GRADING KEY

| Grade | Meaning |
|---|---|
| A | Clear, safe, helpful — no change needed |
| B | Minor improvement possible — defer to next copy sprint |
| C | Misleading or incomplete — fix before next QA cycle |
| D | Exposes internal detail or creates user confusion — fix before next QA cycle |
| F | Security / privacy violation — fix before ship |
