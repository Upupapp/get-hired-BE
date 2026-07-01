# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — MIDDLEWARE SECURITY LOG V5
**Date:** 2026-07-01

---

## Middleware Chain — Certification Requirement Mutation Endpoints

All employer job create/update routes pass through:

```
POST/PUT /api/recruiter/job-post
  → verifyAuth (Firebase JWT verification)
  → stripJobBodyTags (XSS sanitization including certificationRequirements)
  → validateJobPublishPayload (publish field validation — cert NOT required)
  → jobsController.createJobs / updateJob
       → getUserCompanyForRequest() (BOLA: company from JWT, never from body)
       → saveJobArray() → saveCertificationRequirements()
```

---

## Middleware Inventory

### 1. RequireRecruiterAuthMiddleware → `verifyAuth`
**Route:** All `/api/recruiter/*` endpoints
**Purpose:** Verify Firebase JWT; reject if missing/expired
**Status:** ✅ Present (`middleware/verifyAuth.js` or equivalent)
**Failure:** 401 Unauthorized

---

### 2. ResolveCompanyFromAuthMiddleware → `getUserCompanyForRequest(req, uid)`
**Location:** `jobsController.js` — called in `createJobs()` and `updateJob()`
**Purpose:** Derive `company_id` from authenticated employer's Firebase UID — NEVER from req.body
**Status:** ✅ Implemented (BOLA fix applied in prior sessions)
**Failure:** 403 if no company found for this user

---

### 3. ResolveJobOwnershipMiddleware → UPDATE WHERE clause
**Location:** `jobsController.js:354` — `WHERE job_id=$20 AND company_id=$21`
**Purpose:** Verify parent job belongs to authenticated company
**Status:** ✅ Implemented
**Failure:** 403 if 0 rows returned (mismatch)

---

### 4. CertificationRequirementPayloadParserMiddleware → `stripJobBodyTags`
**Location:** `middleware/jobMiddleware.js:92-103`
**Purpose:** Strip HTML tags from all string fields in each certification requirement row
**Status:** ✅ Implemented

```javascript
var certs = req.body.certificationRequirements;
if (certs && Array.isArray(certs)) {
  req.body.certificationRequirements = certs.map(function(cert) {
    if (!cert || typeof cert !== 'object') return cert;
    var out = {};
    Object.keys(cert).forEach(function(k) {
      out[k] = typeof cert[k] === 'string' ? stripAllTags(cert[k]) : cert[k];
    });
    return out;
  });
}
```

**Gap:** Does not cap string lengths or validate enum values — relies on DB CHECK constraint for type/importance.

---

### 5. CertificationRequirementEnumValidationMiddleware
**Status:** ❌ Not a separate middleware — validation handled by DB CHECK constraint
**Risk:** DB CHECK violation returns 500 instead of 400 — poor developer experience
**Fix (backlog):** Add explicit enum check before DB INSERT

---

### 6. CertificationRequirementFairHiringGuardMiddleware
**Status:** ❌ Not implemented in V1
**Scope:** Future — detect "with pleasing personality", "young and dynamic", "female only" in requirement name field
**Backlog:** Add as warning (not blocker) with structured error `unsafe_requirement_language`

---

### 7. CertificationRequirementCopyClaimsGuardMiddleware
**Status:** ❌ Not implemented in V1
**Scope:** Future — detect "auto-match", "AI verify", "GetHired verified" in any touched copy
**Backlog:** Add to CI as lint rule

---

### 8. CertificationRequirementTransactionalSaveMiddleware → `saveJobArray()`
**Location:** `services/job.service.js:358-368`
**Purpose:** Delete-then-reinsert atomically per job
**Status:** ✅ Implemented (await ensures sequential, within parent job transaction)
**Semantics:**
- `undefined` (omitted) → skip entirely, existing rows unchanged
- `[]` (empty sent) → delete all, insert none
- `[...]` → delete all, insert new set

---

### 9. CertificationRequirementOwnershipGuardMiddleware
**Status:** ✅ Implemented (inherits from parent job BOLA check)
**Pattern:** Since save is delete-then-reinsert with `jobId` derived from the BOLA-verified job, there's no individual requirement ID that could be spoofed. All requirements for a job are replaced atomically.
**No individual requirement ID mutation endpoint exists.**

---

### 10. CertificationRequirementPresenterMiddleware → `getJobCertificationRequirements()`
**Location:** `services/job.service.js:223-248`
**Purpose:** Map DB rows to canonical DTO; strip internal fields
**Status:** ✅ Fixed this command — `id` and `canonicalKey` no longer returned
**Before:** `{ id, name, type, importance, issuingAuthority, expiryRequired, verificationRequired, canonicalKey }`
**After:** `{ name, type, importance, issuingAuthority, expiryRequired, verificationRequired }`

---

### 11. PublicJobVisibilityMiddleware
**Status:** ✅ Public routes filter `job_status_id = 2` (confirmed in `publicCompanyController.js`)
**Note:** Draft jobs' certification requirements are never exposed on public routes because the parent job is not accessible publicly when draft.

---

### 12. CertificationRequirementNoMatchGuardMiddleware
**Status:** ✅ Verified — `saveCertificationRequirements()` and `getJobCertificationRequirements()` do NOT call `JobCompatibilityService` or any MATCH service. No MATCH fields in response.

---

### 13. CertificationRequirementErrorPresenterMiddleware
**Status:** Partial
| Error Code | HTTP | Implemented |
|---|---|---|
| `requirement_not_found` | 404 | N/A (no individual requirement endpoint) |
| `job_scope_denied` | 403 | ✅ (via parent job BOLA) |
| `permission_denied` | 403 | ✅ (via verifyAuth) |
| `invalid_requirement_type` | 400 | ❌ (DB CHECK throws 500) |
| `invalid_requirement_importance` | 400 | ❌ (DB CHECK throws 500) |
| `server_error` | 500 | ✅ (generic error message returned) |

---

## BOLA Test Matrix

| Test | Expected | Status |
|---|---|---|
| Employer A updates Employer B's job requirements | 403 (via WHERE company_id=$21 = 0 rows) | ✅ Protected |
| Employer A sends `certificationRequirements` with spoofed job_id | Requirements saved under BOLA-verified jobId, not client-supplied one | ✅ Protected |
| Applicant calls POST /api/recruiter/job-post | 401/403 (verifyAuth + company check) | ✅ Protected |
| Anonymous calls POST /api/recruiter/job-post | 401 | ✅ Protected |
| Public sends requirement ID from another job | No individual requirement endpoint exists | ✅ N/A |
| Public reads draft job certificationRequirements | Public route gates to published (job_status_id=2) | ✅ Protected |
