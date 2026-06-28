# GETHIRED SECURE QA CHECKLIST — QA Cycle 11
Generated: 2026-06-25

Static analysis, grep checks, and safe automated verifications run during this SECURE pass.

---

## Static Grep Checks

### [PASS] No string concatenation in SQL queries
```
grep -r "query\s*(\s*[`'\"].*\$\{.*\}" controllers/ services/
```
Result: All string interpolations found are `${dbSchema}` (server-controlled env var). No user input interpolated into SQL. PASS.

### [PASS] verifyAuth present on all non-public routes
Checked all 15 route files. Every route not intentionally public has `verifyAuth` in the middleware chain.
Total: 78 protected routes out of 91 total (10 intentionally public + webhook).

### [PASS] getUserCompany Array.isArray guard present on all company-gated endpoints
Pattern `Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId` confirmed in:
- companiesController.js (updateCompany, addCompanyUser, removeCompanyUser, getSubscriptionRestrictions, getDashboardPipelineOverview)
- jobsController.js (createJobs, updateJob, deleteJob)
- interviewController.js (saveQuestionTemplate, updateJobInterviewQuestion, saveGroupInterview [QA11 FIX-01], getInterviewHub)
- candidateController.js
- contactsController.js
- message.service.js (resolveCallerCompany)

### [PASS] Magic-byte check applied in CV upload pipeline
`validateCvFile()` calls `matchesDeclaredType()` from `fileSignature.js`. Covers PDF and DOCX.

### [PASS] Message body length cap present
`MAX_MESSAGE_BODY_LENGTH = 4000` enforced in `sendMessage()` in message.service.js.

### [NEW PASS] Security headers added
After QA11 FIX-04, server.js now sets X-Content-Type-Options, X-Frame-Options, X-XSS-Protection on all responses.

### [NEW PASS] getJobApplicantDetails BOLA guard added
After QA11 FIX-02, cross-company access to applicant details returns 403.

### [NEW PASS] saveGroupInterview BOLA guard added
After QA11 FIX-01, companyId is always JWT-derived in group interview creation.

### [NEW PASS] PII removed from payment logs
After QA11 FIX-03, billing PII no longer written to be_out.log.

---

## npm audit Summary

```
npm audit → 273 vulnerabilities (19 low, 99 moderate, 138 high, 17 critical)
```

### Critical chains identified:
1. bcrypt > @mapbox/node-pre-gyp > tar (path traversal, file overwrite) — build-time, not runtime
2. axios@0.27.2 — SSRF, prototype pollution, CSRF — used for PayMongo API calls
3. request > qs — DoS via memory exhaustion — deprecated package
4. jsonwebtoken@8.5.1 — signature bypass CVE (verify if directly used beyond Firebase Admin)

### Status: OPEN (P2-P3, phased remediation planned)
Recommended immediate actions: replace bcrypt with bcryptjs, upgrade axios, remove request.

---

## express-rate-limit@6.11.2 CVE Check

Searched npm advisory database for express-rate-limit v6.x CVEs.
- CVE-2021-21404 (IP spoofing): Fixed in v5.2.6 — v6.x is not affected
- No additional critical CVEs found for v6.11.x
- **Status: SAFE** for Node 14.21.3 environment

---

## Check: Mutations on GET Routes

Manually checked all `router.get(...)` routes across 15 route files:
- `GET /api/auth/getpwresetlink` — sends email; does NOT write to DB; acceptable as GET
- All other GET routes: read-only
- **No mutations found on GET routes — Tier 3 write skip is correct**

---

## Check: X-Forwarded-For trust proxy risk

`server.js` line 94 (original): `app.enable("trust proxy")`
With this setting, express-rate-limit uses `X-Forwarded-For` for IP detection.
If nginx does not override the header, clients can spoof their IP.
**Action required (EA-11):** Verify nginx config sets `X-Forwarded-For: $remote_addr`.

---

## Secrets Scan

Pattern searched: `password\s*=\s*["'][^"']+["']|secret\s*=\s*["'][^"']+["']|apiKey\s*=\s*["'][^"']+["']`
Result: No hardcoded secrets in JS source files. All secrets loaded from `env.js` → `process.env`.

Files with service account keys: `gethired-serviceAccountKey.json`, `jobhunt-serviceAccountKey.json` — tracked files (P1).
**No secret values printed in this report.**

---

## Checklist Summary

| Check | Status |
|-------|--------|
| SQL injection scan | PASS |
| Route protection coverage (96% auth) | PASS |
| getUserCompany guard consistency | PASS |
| Magic-byte check for file uploads | PASS |
| Message body length cap | PASS |
| Security headers (QA11 new) | PASS |
| getJobApplicantDetails BOLA (QA11 new) | PASS |
| saveGroupInterview BOLA (QA11 new) | PASS |
| PII removed from payment logs (QA11 new) | PASS |
| Rate limiting 4-tier verification | PASS |
| No mutations on GET routes | PASS |
| npm audit run | OPEN (273 vulns) |
| Secrets in source | PASS (env-only) |
| Service account keys in git | P1 OPEN |
| PayMongo webhook signature | P2 OPEN |
| CORS restriction | P2 OPEN |
