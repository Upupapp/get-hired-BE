# GETHIRED SECURE REPORT — RECENT DEPLOYMENT
**Scope:** FE `5c01c2a` + `fa8865a` | BE `8caa558`
**Date:** 2026-06-29
**Source reports:** SWEEP, TEST, STITCH, ACTIONS

## Executive Summary

| Security Area | Status |
|---|---|
| Authentication | PASS — verifyAuth on new endpoint |
| Authorization (BOLA) | PASS — company-scoped WHERE clause |
| SQL Injection | PASS — parameterized queries only |
| PII Exposure | PASS — COUNT only, no applicant data |
| Frontend XSS | PASS — no innerHTML, safe interpolation |
| Secrets in code | PASS — no new secrets introduced |
| Node 14 safe syntax | PASS — no ?. or ?? in BE |
| Open redirect | PASS — publicUrl is BE-derived path |
| Clickjacking | N/A — no new pages |
| CSRF | N/A — Firebase auth token in header |

**P0 count:** 0
**P1 count:** 0
**P2 count:** 2 (nested role=dialog a11y, double confirm UX)
**P3 count:** 1 (salary DTO unused)
**Code fixes needed:** 0 (all P0/P1 already addressed in deployment)
**External actions needed:** 0 for this deployment

## Phase 1: Threat Model (Recent Deployment Scope)

### New attack surface: GET /api/job/action-summary

**Threat actor: Authenticated recruiter from DIFFERENT company**
- Attempts to read job summary for job belonging to another company
- Attack: supply jobId from another company in query param
- Defense: `getUserCompanyForRequest(req, uid)` → company_id from DB (not from request)
- `WHERE j.job_id=$1 AND j.company_id=$2` → returns 404 if mismatch
- Result: BLOCKED ✅

**Threat actor: Unauthenticated attacker**
- Attempts to access summary without auth token
- Defense: `verifyAuth` middleware fires first → 401/403
- Result: BLOCKED ✅

**Threat actor: Malicious recruiter with valid auth**
- Attempts SQL injection via jobId: `' OR '1'='1`
- Defense: jobId passed as `$1` parameter to pg → treated as literal string
- Result: BLOCKED ✅

**Threat actor: Attacker tries to enumerate applicant data**
- action-summary returns totalApplicants (COUNT integer only)
- No names, emails, UIDs, or any applicant PII returned
- Result: INFORMATION MINIMUM PRINCIPLE APPLIED ✅

**Threat actor: Open redirect via publicUrl**
- publicUrl is constructed BE-side as `/jobs/details/` + jobId
- jobId comes from DB (not user input)
- FE: `window.open(this.publicUrl, '_blank', 'noopener')` — opens relative URL, no external redirect
- Result: NOT A VECTOR ✅

## Phase 2: Authorization Audit

### getJobActionSummary authorization chain:
```
1. verifyAuth(req, res, next)
   - Verifies Firebase ID token from Authorization header
   - Populates req.user.uid with authenticated UID
   - Fails closed: 401/403 if token missing/invalid/expired

2. getUserCompanyForRequest(req, req.user.uid)
   - Fetches company from DB WHERE uid=$1 AND status=active
   - Uses server-derived uid (never trusts body/query UID)
   - Returns callerCompany.companyId

3. SELECT jobs WHERE job_id=$1 AND company_id=$2
   - $1 = req.query.jobId (untrusted, parameterized)
   - $2 = callerCompany.companyId (server-derived, trusted)
   - Cross-company access → 404

Result: FULL AUTHZ CHAIN VERIFIED ✅
```

## Phase 3: SQL Injection Audit

### Parameterized queries used:
```javascript
// Job lookup
dbQuery.query(jobQuery, [jobId, callerCompany.companyId])
// Applicant count
dbQuery.query(`...WHERE job_id = $1`, [jobId])
// Interview questions count
dbQuery.query(`...WHERE jit.job_id = $1`, [jobId])
```

All three queries use parameterized placeholders. No string interpolation of user input.
Result: SAFE ✅

## Phase 4: PII Analysis

### What action-summary returns vs. what it does NOT return:
| Returned | Not returned |
|---|---|
| Applicant COUNT (integer) | Applicant names |
| Interview question COUNT | Applicant emails |
| Job metadata (title, status, etc.) | Applicant UIDs |
| Action flags (booleans) | CV/document data |
| Salary label (pre-formatted string) | Application details |

Result: MINIMUM INFORMATION PRINCIPLE APPLIED ✅

## Phase 5: Frontend Security Audit

### table-control-modal.component.ts:
- No `innerHTML` bindings ✅
- No `DomSanitizer` usage ✅
- No `dangerouslySetInnerHTML` ✅
- `window.open(publicUrl, '_blank', 'noopener')` — `noopener` prevents opener access ✅
- `clipboard.copy(url)` — url = `window.location.origin + this.publicUrl` where publicUrl is `/jobs/details/jobId` (server-provided, not user input) ✅
- No debug `console.log` with sensitive data in new code ✅

### job-posts-details.component.html:
- `isPrivacyBoilerplate()` receives jobDescription string — no HTML injection risk ✅
- `selectedJobPost?.jobDescription` interpolated with `{{ }}` — Angular auto-escapes ✅

### V7 general:
- All interpolation via `{{ }}` — XSS-safe ✅
- No `[innerHTML]` binding ✅

## Phase 6: Secrets Check

### New code reviewed:
- `jobsController.js` — no hardcoded secrets, API keys, passwords ✅
- `jobsRoute.js` — no hardcoded secrets ✅
- `table-control-modal.component.ts` — no hardcoded secrets ✅
- `job.service.ts` — uses `this.jobUrl` from environment (not hardcoded) ✅

## Phase 7: Node 14 Safety

Required: no `?.` (optional chaining) or `??` (nullish coalescing) in BE files.

### getJobActionSummary scan:
```
const jobId = req.query && req.query.jobId;                   ← && pattern ✅
const callerCompany = await getUserCompanyForRequest(...)
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) ← ternary ✅
const salaryCurrency = row.salary_currency || 'PHP';          ← || fallback ✅
const totalApplicants = (countResult.rows && countResult.rows[0]) ... ← && chain ✅
```

Result: NODE 14 SAFE ✅

## Phase 8: Security Risk Register (Recent Deployment)

| ID | Title | Severity | Status |
|---|---|---|---|
| SR-001 | Cross-company job access (BOLA) | P0 | MITIGATED — company scope enforced |
| SR-002 | Unauthenticated endpoint access | P0 | MITIGATED — verifyAuth applied |
| SR-003 | SQL injection via jobId | P0 | MITIGATED — parameterized |
| SR-004 | Applicant PII in response | P1 | MITIGATED — COUNT only |
| SR-005 | Open redirect via publicUrl | P1 | NOT A VECTOR — server-derived path |
| SR-006 | XSS via job description display | P1 | MITIGATED — Angular interpolation |
| SR-007 | Nested role=dialog (a11y/UX) | P2 | DEFERRED — ACT-006 |
| SR-008 | Double confirm confusion | P2 | DEFERRED — ACT-004 |

## Phase 9: Release Gate

| Gate | Status |
|---|---|
| A Secret safety | PASS |
| B Auth protection | PASS |
| C Object-level authz (BOLA) | PASS |
| D Function-level authz | PASS |
| E SQL injection safety | PASS |
| F File/CV privacy | N/A |
| G Payment webhook safety | N/A |
| H Frontend security | PASS |
| I Dependency/runtime | PASS (no new deps) |
| J Privacy/data protection | PASS (COUNT only) |
| K Abuse prevention | PASS (verifyAuth rate-limits at auth layer) |
| L Regression safety | PASS |

**Result: GO — No P0/P1 findings for this deployment**
**Confidence: HIGH**
