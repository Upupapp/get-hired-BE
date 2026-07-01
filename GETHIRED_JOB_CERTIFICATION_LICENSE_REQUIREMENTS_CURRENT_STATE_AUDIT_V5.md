# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — CURRENT STATE AUDIT V5
**Date:** 2026-07-01 | **Phase:** 1 — Current State Audit

---

## Audit Summary

**Status: FULLY IMPLEMENTED end-to-end.** This is a stabilization command — the V1 feature was built in a prior session. The goal here is to document, harden, and verify correctness.

---

## Backend Audit

### Database
**File:** `get-hired-BE/db/job_certification_requirement_ddl.sql`
**Status:** ✅ Table exists with all required columns

```sql
CREATE TABLE gethired.job_certification_requirement (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id VARCHAR NOT NULL REFERENCES gethired.jobs(job_id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  type VARCHAR DEFAULT 'certification' CHECK (type IN ('certification','license','permit','eligibility','other')),
  importance VARCHAR DEFAULT 'required' CHECK (importance IN ('required','preferred')),
  issuing_authority VARCHAR,
  expiry_required BOOLEAN DEFAULT false,
  verification_required BOOLEAN DEFAULT false,
  canonical_key VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Notes:**
- CASCADE delete on job deletion ✅
- type CHECK constraint enforces enum ✅
- importance CHECK constraint enforces enum ✅
- `canonical_key` unused (future MATCH hook) ✅
- No `deleted_at` soft-delete column (hard delete pattern matches other child tables) ✅

---

### Backend Service
**File:** `get-hired-BE/services/job.service.js`

| Function | Status | Notes |
|---|---|---|
| `saveCertificationRequirements(jobId, items)` | ✅ Implemented | Filters blank names server-side; INSERT parameterized (no SQLi) |
| `getJobCertificationRequirements(jobId)` | ✅ Implemented | Returns mapped rows; graceful fallback for table-not-exist |
| `saveJobArray()` — certification block | ✅ Implemented | Delete-then-reinsert; `undefined` = skip, `[]` = clear all |
| `mappedJob()` — includes certificationRequirements | ✅ Implemented | Calls `getJobCertificationRequirements()` |

**Fix applied this command:**
- `getJobCertificationRequirements()` now returns public-safe fields only (strips `id` and `canonicalKey`) — see FIX-LOG-V5

---

### Backend Controller
**File:** `get-hired-BE/controllers/jobsController.js`

| Handler | Status | Notes |
|---|---|---|
| `createJobs()` | ✅ Implemented | Passes `certificationRequirements` to `saveJobArray()` after BOLA check |
| `updateJob()` | ✅ Implemented | Passes `certificationRequirements` to `saveJobArray()` after BOLA check |

**BOLA protection:**
- Create: `getUserCompanyForRequest(req, uid)` → `companyId` from JWT, never from body ✅
- Update: `getUserCompanyForRequest(req, req.user.uid)` + `WHERE job_id=$20 AND company_id=$21` → zero rows = 403 ✅
- `saveJobArray()` called AFTER BOLA check passes → certification requirements inherit parent-level BOLA protection ✅

---

### Backend Middleware
**File:** `get-hired-BE/middleware/jobMiddleware.js`

| Middleware | Status | Notes |
|---|---|---|
| XSS sanitization of `certificationRequirements` array | ✅ Present | Strips HTML tags from all string fields in each cert row |
| `validateJobPublishPayload` | ✅ Present | Does NOT require certifications for publish (optional) ✅ |

**Gap identified:** No enum validation middleware for `type` and `importance` fields — BE relies on DB CHECK constraint (acceptable, throws 500 on invalid; should ideally return 400).

---

### Public Job Detail Controller
**File:** `get-hired-BE/controllers/publicCompanyController.js`
- Public company jobs route: `WHERE job_status_id = 2` — published only ✅
- `mappedJob()` used for both public and employer responses → same `certificationRequirements` shape
- **Gap fixed this command:** `getJobCertificationRequirements()` now strips `id` and `canonicalKey` from all responses

---

## Frontend Audit

### TypeScript Models
**File:** `src/app/job/job.model.ts` (Lines 11–20)
```typescript
export interface JobCertificationRequirement {
  id?: string;
  name: string;
  type: 'certification' | 'license' | 'permit' | 'eligibility' | 'other';
  importance: 'required' | 'preferred';
  issuingAuthority?: string | null;
  expiryRequired?: boolean;
  verificationRequired?: boolean;
  canonicalKey?: string | null;
}
```
**Status:** ✅ Matches BE contract. `id` and `canonicalKey` now stripped from responses (BE fix).

**File:** `src/app/public/services/public-job-normalizer.model.ts` (Lines 19–27)
- `NormalizedCertificationRequirement` — display layer model ✅

**File:** `src/app/job/job-create/job-create.models.ts` (Lines 63–71)
- `CertificationRequirementEntry` — form state model ✅

---

### Employer Form
**File:** `src/app/job/job-create/components/job-post-detail-step/job-post-detail-step.component.html` (Lines 406–491)
**File:** `src/app/job/job-create/components/job-post-detail-step/job-post-detail-step.component.ts`

**Status:** ✅ FULLY IMPLEMENTED

Fields present:
- Requirement name (text input, required)
- Type dropdown (certification/license/permit/eligibility/other)
- Importance dropdown (required/preferred)
- Issuing authority (text input, optional)
- Expiry required (checkbox)
- Verification required (checkbox)

FormArray management:
- `certificationRequirements: FormArray` ✅
- `addCertificationRequirement()` — adds new row ✅
- `removeCertificationRequirement(index)` — removes row ✅
- Max 10 rows enforced in TS ✅

---

### Public/Applicant Display
**File:** `src/app/jobs/job-posts-details/job-posts-details.component.html` (Lines 214–229)
**Status:** ✅ IMPLEMENTED — Section hidden when empty (`*ngIf="nJob.certificationRequirements?.length > 0"`)

Fields shown:
- Name (bold)
- Required/Preferred badge (i18n)
- Type in parentheses
- Issuing authority if present
- "Verification required" if flag set
- "Expiry required" if flag set

---

## Gaps Found

| ID | Gap | Severity | Fix |
|---|---|---|---|
| GAP-001 | `getJobCertificationRequirements()` returned `id` + `canonicalKey` on public API | Low | **FIXED this command** — stripped from mapper |
| GAP-002 | No enum validation (type/importance) returns 400 — DB CHECK throws 500 | Low | Documented, backlog |
| GAP-003 | No per-requirement BOLA test in existing test suite | Low | Documented in TEST_LOG_V5 |
| GAP-004 | `displayOrder` column not yet in schema (only in FE model as optional) | Low | Backlog (not needed in V1) |
| GAP-005 | Fair-hiring copy guard not enforced BE-side (no profanity/discriminatory filter) | Low | Backlog |
