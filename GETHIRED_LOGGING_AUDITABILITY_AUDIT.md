# GETHIRED LOGGING & AUDITABILITY AUDIT — QA Cycle 11
Generated: 2026-06-25

---

## Current Logging State

### Mechanism
- Node.js `console.log()` and `console.error()` throughout (121 occurrences in 15 controller files)
- Output goes to `be_out.log` and `be_err.log` on the server (confirmed by files in BE root)
- No structured logging library (no `winston`, `pino`, `morgan`, etc.)
- No log aggregation or SIEM

### Coverage
- **Error logging:** `console.error('[controllerName] error:', error)` pattern applied consistently in all 15 controllers — GOOD
- **Access logging:** No HTTP access log middleware (no `morgan`); no request/response logging
- **Auth event logging:** No logging on login success/failure, token expiry, or auth rejections
- **Security event logging:** No logging on 403 rejections (BOLA blocks are silent to the log)
- **Payment event logging:** `console.log("I am payment.paid")` and `console.log(webHookPaid)` in webhook — unstructured and potentially logs PII (billing name, email, phone)

---

## Audit Trail Assessment

### What IS logged
- Runtime errors (caught exceptions) per controller
- Some payment webhook events (informal console.log)
- `insertLogs()` is called from some job/application flows — but this is an application-level audit log in the DB, not a security log

### What is NOT logged
| Missing Log | Security Impact |
|------------|----------------|
| HTTP access log (IP, method, path, status, latency) | Cannot investigate request patterns after incident |
| Login attempts (success/failure) | Cannot detect brute force in retrospect |
| JWT verification failures | Cannot detect credential stuffing |
| 403 authorization rejections | Cannot detect BOLA probing |
| Rate limit hits | Cannot confirm rate limiting is working post-incident |
| File upload events (who uploaded what) | Cannot audit file activity |
| Admin actions | No admin audit trail |
| Payment events (structured) | Unstructured; PII in logs |

---

## PII in Logs Risk

`paymentController.js` line 129-130:
```js
console.log("I am payment.paid");
console.log(webHookPaid);
```

`webHookPaid` contains billing info (name, email, phone) which would appear in `be_out.log` in plaintext. This violates PCI-DSS requirements if log files are not adequately protected.

**Finding LOG-QA11-01:** Remove `console.log(webHookPaid)` or replace with a sanitized summary that excludes PII fields.

---

## Recommendations (Priority Order)

### P2: Add HTTP Access Logging
```js
// server.js — add before route mounting
import morgan from 'morgan';
app.use(morgan('combined')); // Apache-style log: IP, method, path, status, response-time
```
This provides the minimum baseline for post-incident investigation.

### P2: Log Auth Events
In `verifyAuth.js`, log token verification failures with:
- Timestamp
- Request path
- Error code (token-expired, invalid-token, etc.)
- Client IP (`req.ip`)
- DO NOT log the token value itself

### P2: Log 403 Rejections
Add a middleware or update each 403 return to include a structured log entry with caller UID, attempted resource, and outcome.

### P3: Log Rate Limit Hits
express-rate-limit v6 supports an `onLimitReached` callback (v6) or `handler` override. Log the IP, path, and timestamp when a limit is hit.

### P3: Remove PII from Payment Logs
Replace `console.log(webHookPaid)` with `console.log('[webhook] payment.paid event received, id:', webHookPaid?.id)`.

### P3: Implement Structured Logging
Replace ad-hoc `console.log/error` with `pino` (fastest Node.js logger) or `winston`. This enables:
- JSON-structured log lines (machine-parseable)
- Log levels (debug, info, warn, error)
- Redaction of PII fields
- Easy integration with log aggregation

---

## Summary

| Finding | Severity | Status |
|---------|---------|--------|
| No HTTP access logging | P2 | OPEN |
| No auth event logging | P2 | OPEN |
| No 403 rejection logging | P2 | OPEN |
| PII in payment webhook logs | P2 | NEW — LOG-QA11-01 |
| No log aggregation / SIEM | P3 | OPEN |
| No structured logging | P3 | OPEN |
| Application DB audit log (insertLogs) | PASS — partial coverage | — |
