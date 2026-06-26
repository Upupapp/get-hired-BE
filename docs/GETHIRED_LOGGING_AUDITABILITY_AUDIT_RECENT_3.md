# GetHired — Logging & Auditability Audit (SECURE 3)
**Date:** 2026-06-26

---

## Logging Infrastructure

| Component | Log destination | Retention |
|---|---|---|
| PM2 stdout | `be_out.log` on Linode | PM2 log rotation (default) |
| PM2 stderr | `be_error.log` on Linode | PM2 log rotation (default) |
| Firebase Auth | Firebase Console | Firebase-managed |
| PayMongo | PayMongo Dashboard | PayMongo-managed |
| PostgreSQL | Supabase logs | Supabase-managed |

---

## Security Event Logging

### Logged (positive — security events captured):

| Event | Location | Log format | PII risk |
|---|---|---|---|
| Applicant IDOR attempt (SEC-01) | `applicantsController.js` line 260 | `[SEC_01_...] endpoint= authenticatedUid=xxx*** suppliedId=xxx***` | LOW — UID redacted to 3+***+3 chars |
| Job details BOLA probe (SEC-02) | `jobsController.js` line 638 | `[SEC_02_...] endpoint= jobId= suppliedParam= action=blocked_403` | NONE — no PII |
| Firebase Admin init source | `firebaseApp.js` line 122 | `Firebase Admin: initializing via env-base64` | NONE |
| PayMongo webhook signature failure | `paymentController.js` line 98 | `[paymentController] Webhook signature verification failed` | NONE |
| PayMongo payment.paid event | `paymentController.js` line 171 | Event id only | LOW — no billing PII |
| PayMongo payment.failed event | `paymentController.js` line 214 | Event type + data.id | LOW |
| DB query errors | `dbQuery.js` line 33 | `[dbQuery] query error: err.message` | MEDIUM — may contain column/table info |
| Contact/Candidate import results | `contactsController.js`, `candidateController.js` | Aggregate counts only | NONE |

### Not Logged (gaps):

| Event | Impact |
|---|---|
| Successful login | No audit trail for "who logged in when" |
| Failed login (wrong password) | No credential-stuffing audit trail |
| Account deletion | No audit event for destructive action |
| Company creation | No creation audit trail |
| Job status changes (publish/unpublish) | Partial — Google Indexing API logs job URL |
| Role changes | None |
| Subscription creation | None |

---

## PII Safety in Logs

### Confirmed safe:
- Payment webhook logs (fixed): only IDs, no billing data
- Security event logs: UIDs redacted
- Contact/candidate import logs: aggregate counts only

### Remaining concern:
- `dbQuery.js` line 33: `console.error('[dbQuery] query error:', err.message)` — DB error messages may contain column names, constraint names, or (in edge cases) partial query text. Not user PII, but internal schema information.
- `candidateController.js` candidateList: `console.log(dbResponse)` logs full candidate list to stdout — **confirmed still present**. Server-side only; not externally accessible. Low severity.

---

## Log Injection Risk

Console logging uses template literals and object serialization:
```js
console.error('[SEC_01_...] endpoint=GET /applicant/userprofile authenticatedUid=' + redactUid(tokenUid));
```

If log content is ever forwarded to a log aggregation service (ELK, Datadog), log injection could occur if user-controlled values are embedded in log messages. Currently PM2 stdout only; lower risk.

**Recommendation:** If log aggregation is added, use structured logging (JSON) with explicit field separation.

---

## Structured Logging Gap

No structured logging library (winston, pino, bunyan) is installed. All logging is via `console.log/error/warn/info`. This means:
- No log levels configurable without code changes
- No structured JSON format for parsing
- No correlation IDs for request tracing
- No centralized log shipping

**Recommendation:** Add `pino` or `winston` for production logging. This is a P3 improvement, not a blocking security issue.

---

## Summary

| Area | Status |
|---|---|
| Security probe logging (SEC-01, SEC-02) | PASS |
| PII in payment logs | FIXED |
| PII in import logs | PASS |
| Remaining PII risk (candidateList console.log) | LOW |
| DB error message leakage in logs | LOW |
| Audit trail for login/logout | PARTIAL — logout logged; login not logged |
| Structured logging | NOT IMPLEMENTED |
| Log retention policy | UNKNOWN (PM2 default rotation) |
