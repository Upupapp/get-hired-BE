# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — SECURITY/PRIVACY QA V5
**Date:** 2026-07-01

---

## Code Fix Applied This Session

**File:** `services/job.service.js` — `getJobCertificationRequirements()`
**Fix:** Stripped `id` and `canonicalKey` from the public API response DTO.

| Field | Before | After | Reason |
|---|---|---|---|
| `id` (UUID) | Exposed | ✅ Stripped | Internal PK; no FE use (delete-then-reinsert saves); leaks row enumeration |
| `canonicalKey` | Exposed | ✅ Stripped | Internal normalization key; no FE display use; leaks business logic |
| `name` | Exposed | Exposed | Required display field |
| `type` | Exposed | Exposed | Required display field |
| `importance` | Exposed | Exposed | Required display field |
| `issuingAuthority` | Exposed | Exposed | Optional employer-entered info; employer-intended-public |
| `expiryRequired` | Exposed | Exposed | Employer-set flag; informational |
| `verificationRequired` | Exposed | Exposed | Employer-set flag; informational |

---

## BOLA / Company Isolation

| Check | Status |
|---|---|
| `createJobs()` scopes to company via `getUserCompanyForRequest()` | ✅ Confirmed (jobsController.js) |
| `updateJob()` includes `WHERE company_id=$21` in query | ✅ Confirmed (jobsController.js:309) |
| `saveCertificationRequirements()` scoped to `job_id` which is already company-scoped | ✅ Safe |
| Public `getJobCertificationRequirements()` only takes `job_id` — no employer auth needed (correct for public data) | ✅ Correct |

---

## XSS

| Check | Status |
|---|---|
| `jobMiddleware.js` XSS sanitizes certificationRequirements array strings | ✅ Lines 92-103 |
| `name` sanitized | ✅ |
| `type` sanitized (but also constrained to DB CHECK enum) | ✅ |
| `importance` sanitized (also constrained to DB CHECK enum) | ✅ |
| `issuingAuthority` sanitized | ✅ |
| `expiryRequired` / `verificationRequired` — booleans, not string paths | ✅ No XSS vector |

---

## SQL Injection

| Check | Status |
|---|---|
| `saveCertificationRequirements()` uses parameterized `$1..$N` values | ✅ No string interpolation |
| `getJobCertificationRequirements()` uses `WHERE job_id = $1` | ✅ Parameterized |
| No dynamic column/table name construction | ✅ |

---

## Input Validation (Server-side)

| Field | Validation | Status |
|---|---|---|
| `name` | XSS sanitize; no maxLength enforced in middleware (FE validates 200) | ⚠️ Minor: should add `if (item.name.length > 200) throw` in saveCertificationRequirements — backlog |
| `type` | DB CHECK constraint (`certification, license, permit, eligibility, other`) | ✅ |
| `importance` | DB CHECK constraint (`required, preferred`) | ✅ |
| `issuingAuthority` | XSS sanitize; no maxLength in MW (FE validates 200) | ⚠️ Same minor gap — backlog |
| `expiryRequired` | Implicitly cast to boolean in INSERT | ✅ |
| `verificationRequired` | Implicitly cast to boolean in INSERT | ✅ |
| Blank name rows filtered | `saveCertificationRequirements()` filters falsy names before INSERT | ✅ |
| Max rows (10) | Enforced FE-side only | ⚠️ BE should enforce `if (reqs.length > 10) throw` — backlog |

---

## Privacy

| Check | Status |
|---|---|
| `certificationRequirements` only appear on PUBLISHED jobs' public endpoint | ✅ Draft jobs not served publicly |
| No applicant credential data stored in this table | ✅ This table is EMPLOYER-declared requirements only |
| No applicant profile data exposed | ✅ `mappedJob()` only returns job-level data |
| No cross-tenant leakage (BOLA protection via company_id chain) | ✅ Confirmed |

---

## Auth

| Check | Status |
|---|---|
| Public `GET /api/jobs/:id` — no auth required (correct) | ✅ |
| `POST /api/recruiter/job-post` — employer JWT required | ✅ |
| `PUT /api/recruiter/job-post/:id` — employer JWT + company_id match | ✅ |

---

## Findings Summary

| Severity | Finding | Action |
|---|---|---|
| FIXED | `id` / `canonicalKey` exposed in public API | Fixed in services/job.service.js |
| BACKLOG (low) | No BE maxLength validation on `name` / `issuingAuthority` | Add in next pass |
| BACKLOG (low) | No BE max-rows (10) cap on certificationRequirements array | Add in next pass |

---

## Result: PASS (with 2 low-severity backlog items) ✅
