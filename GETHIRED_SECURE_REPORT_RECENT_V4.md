# GETHIRED SECURE REPORT — Easy Job Post Assistant V2 (RECENT V4)
**Date:** 2026-06-28 | **Baseline:** SWEEP RECENT V4, TEST RECENT V4

---

## Executive Summary

Scoped security audit of the Easy Job Post Assistant V2 deployment. Strong security posture overall.
No P0 findings. Two P1 findings: missing upload-specific rate limit, and a single error message 
path could leak "Invalid URL format" detail (minor but noted). All critical protections verified.

**Release Gate: GO WITH CAUTION — add extraction rate limit before high-traffic.**

---

## P0 Checks — All Pass

| Check | Status | Evidence |
|---|---|---|
| No unauthenticated access | ✅ Pass | verifyAuth middleware on both routes |
| No BOLA (company from JWT) | ✅ Pass | getUserCompanyForRequest(req, uid) |
| No disk writes | ✅ Pass | multer.memoryStorage() only |
| No SQL injection surface | ✅ Pass | No DB queries in extraction files |
| SSRF protection | ✅ Pass | DNS lookup + 13 private-range patterns |
| Magic-byte validation | ✅ Pass | All 5 file types validated |
| No secrets in code | ✅ Pass | Verified all 3 new BE files |
| Error sanitization | ✅ Pass | Private network errors mapped to safe user message |
| No auto-publish | ✅ Pass | Returns extractedFields only; draft status set by form |

---

## P1 Findings

### EJP-SEC-001 — Missing Extraction-Specific Rate Limit (P1)

**Issue:** Both `/upload` and `/link` endpoints are CPU/memory intensive (pdf-parse, mammoth, axios fetch). The general `writeLimiter` (likely 30-100 req/min across all writes) does not specifically protect against extraction abuse. A malicious authenticated recruiter could send 10 concurrent large PDFs, consuming Node.js heap.

**Exploit scenario:** Authenticated recruiter (real token + company) sends 20 concurrent 10MB PDF uploads → pdf-parse processes all 20 × 10MB in memory simultaneously → OOM or severe CPU stall.

**Recommended fix:**
```javascript
// In easyJobPostRoutes.js — add before verifyAuth
import rateLimit from 'express-rate-limit';
const extractionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Too many import requests. Please wait a minute and try again.' },
  keyGenerator: (req) => req.user && req.user.uid || req.ip,
});
```
Apply after verifyAuth so keyGenerator can use `req.user.uid`.

**Status:** Open — documented here, fix via next maintenance window.

### EJP-SEC-002 — URL Validation Error Message Slightly Informative (P1-Low)

**Issue:** `extractTextFromUrl` throws `'Invalid URL format.'` which is returned to the FE after sanitization. The FE shows the BE message directly in some paths. "Invalid URL format" is acceptable (not sensitive), but "Could not resolve the URL hostname" is conditionally shown before the sanitization check catches it.

**Review of sanitization logic in controller:**
```javascript
if (msg.includes('private network') || msg.includes('resolve')) {
  return res.status(422).json({ message: 'The URL could not be reached or is not allowed.' });
}
```
This correctly catches `'Could not resolve the URL hostname.'` (contains 'resolve'). ✅ The sanitization IS working correctly. Status: **RESOLVED — already safe.**

---

## P2 Findings

### EJP-SEC-003 — No Timeout on mammoth/pdf-parse (P2)

**Issue:** `extractTextFromBuffer()` calls `mammoth.extractRawText()` and `pdfParse(buffer)` with no wrapping timeout. A malformed/crafted file could cause these to hang indefinitely. Only PM2/Express connection timeout would eventually kill it.

**Recommended fix:**
```javascript
async function withTimeout(promise, ms, label) {
  var timer;
  var timeout = new Promise(function(_, reject) {
    timer = setTimeout(function() {
      reject(new Error(label + ' timed out after ' + ms + 'ms'));
    }, ms);
  });
  return Promise.race([promise, timeout]).then(function(v) {
    clearTimeout(timer);
    return v;
  });
}
// Usage: await withTimeout(extractTextFromPdf(buffer), 30000, 'PDF extraction')
```

**Status:** Open — recommend adding in next iteration.

---

## SSRF Protection Audit — Pass

Checking 172.16.x.x/12 range coverage:
```javascript
var m = ip.match(/^172\.(\d+)\./);
if (m && parseInt(m[1], 10) >= 16 && parseInt(m[1], 10) <= 31) return true;
```
✅ Correctly covers 172.16.0.0/12 (172.16.x through 172.31.x)

All private ranges covered:
- ✅ 10.x (RFC1918)
- ✅ 127.x (loopback)
- ✅ 169.254.x (link-local)
- ✅ 192.168.x (RFC1918)
- ✅ 172.16-31.x (RFC1918)
- ✅ ::1 (IPv6 loopback)
- ✅ fc/fd IPv6 (unique local)

DNS rebinding partially mitigated: lookup done once before fetch, but rebinding between lookup and fetch remains theoretically possible. At low severity for this context (file extraction from job posting URLs).

---

## Authorization Matrix — New Endpoints

| Role | /api/recruiter/job-post-assistant/upload | /api/recruiter/job-post-assistant/link |
|---|---|---|
| Anonymous | ❌ 403 (verifyAuth) | ❌ 403 (verifyAuth) |
| Applicant (role 3) | ❌ 403 (no company) | ❌ 403 (no company) |
| Recruiter (role 2) | ✅ Allowed if company exists | ✅ Allowed if company exists |
| Admin (role 1) | ✅ Allowed if company exists | ✅ Allowed if company exists |

**Cross-company BOLA:** `getUserCompanyForRequest(req, uid)` uses the authenticated token UID to fetch company — cannot be spoofed via request body. ✅

---

## Dependency Security

| Package | Version | Node 14 Compat | Known Issues |
|---|---|---|---|
| mammoth | 1.12.0 | ✅ | None |
| pdf-parse | 1.1.1 | ✅ | v2.x was incompatible (ES2022 private fields) |
| axios | pre-existing | ✅ | Used with strict timeout + maxContentLength |
| dns (Node built-in) | built-in | ✅ | Used for SSRF DNS check |

**Removed:** cheerio (transitive undici dep used ??= not in Node 14) ✅

---

## Secure Release Gate

| Gate | Status | Notes |
|---|---|---|
| A — Secret Safety | ✅ Pass | No secrets in new code |
| B — Auth Protection | ✅ Pass | verifyAuth on both routes |
| C — Object-Level Authorization | ✅ Pass | companyId from JWT |
| D — Function-Level Authorization | ✅ Pass | Role 2+ with company required |
| E — SQL Injection Safety | ✅ Pass | No SQL in new files |
| F — File/CV Privacy | ✅ Pass | No file persistence, buffer not stored |
| G — Payment Webhook Safety | N/A | Not touched |
| H — Frontend Security | ✅ Pass | No unsafe innerHTML, FormData correct |
| I — Dependency/Runtime | ✅ Pass | Node 14 compat verified |
| J — Privacy/Data Protection | ✅ Pass | Extracted text not logged or stored |
| K — Abuse Prevention | ⚠️ Caution | No extraction-specific rate limit |
| L — Regression Safety | ✅ Pass | No existing endpoints modified |

**Final: GO WITH CAUTION — add extraction rate limiter (EJP-SEC-001) before high-traffic period.**
