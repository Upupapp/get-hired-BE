# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — CRITICAL FEATURE PRESERVATION QA V5
**Date:** 2026-07-01

---

## Purpose

Verify that no code change made in this session (the `getJobCertificationRequirements()` public API strip fix) breaks any existing feature.

---

## Change Made

**File:** `services/job.service.js`
**Method:** `getJobCertificationRequirements()`
**Change:** Removed `id` and `canonicalKey` from return DTO.

---

## Feature Preservation Matrix

### Core Job Features

| Feature | Could This Change Break It? | Analysis | Status |
|---|---|---|---|
| Save Draft | No — `saveCertificationRequirements()` was not touched | ✅ Safe |
| Autosave | No | ✅ Safe |
| Resume Draft | No — FE `JobCertificationRequirement` interface marks `id` and `canonicalKey` as `optional` (`id?: string`, `canonicalKey?: string | null`) | ✅ Safe |
| Publish Job | No | ✅ Safe |
| Update Published Job | No — update path uses `saveCertificationRequirements()` + full delete-then-reinsert; `id` is never used by FE to target a specific row | ✅ Safe |
| Delete Requirement Row | No — delete is done by deleting ALL rows for job_id then reinserting; `id` never sent back to BE | ✅ Safe |
| Easy Job Post | No | ✅ Safe |
| AI Job Create | No | ✅ Safe |
| Public Job Detail | No — strips `id`/`canonicalKey` which were never displayed | ✅ Safe |
| Employer Job List | No | ✅ Safe |

### Application Flow

| Feature | Risk | Status |
|---|---|---|
| Applicant applies to job | No certificationRequirements check in application flow | ✅ Safe |
| Apply button | Not gated by certificationRequirements | ✅ Safe |
| Application review by employer | Employer sees applicant data, not cert requirements | ✅ Safe |

### PayMongo / Subscription

| Feature | Risk | Status |
|---|---|---|
| PayMongo webhook | No relation to cert requirements | ✅ Safe |
| Job slot gating | No relation | ✅ Safe |
| Subscription plan limits | No relation | ✅ Safe |

### Interview / Video Answer

| Feature | Risk | Status |
|---|---|---|
| Interview questions | Not affected | ✅ Safe |
| Video answer feature | Not affected | ✅ Safe |

### MATCH / PROFILE / CVCOACH

| Feature | Risk | Status |
|---|---|---|
| MATCH scoring | No change — no MATCH integration in V1 | ✅ Safe |
| ProfileQualityService | No change | ✅ Safe |
| CVCOACH | No change | ✅ Safe |

### FE Model Compatibility

```typescript
// job.model.ts
export interface JobCertificationRequirement {
  id?: string;          // optional — undefined now (was UUID string)
  name: string;         // required — still returned ✅
  type: '...';          // required — still returned ✅
  importance: '...';    // required — still returned ✅
  issuingAuthority?: string | null; // optional — still returned ✅
  expiryRequired?: boolean;         // optional — still returned ✅
  verificationRequired?: boolean;   // optional — still returned ✅
  canonicalKey?: string | null;     // optional — undefined now (was string/null)
}
```

- `id` is `optional` → TypeScript treats `undefined` same as "not present" ✅
- `canonicalKey` is `optional` → same ✅
- No FE code reads `id` or `canonicalKey` for display or save purposes (confirmed: save uses delete-then-reinsert, not id-based update)
- FE FormArray builds rows from the response fields — `id` was always included in `buildRequirementGroup()` but never sent back to BE on save

**FE compatibility: CONFIRMED SAFE** ✅

---

## Regression Risk: None

The change is a strict subset of the previous response — same fields minus 2 unused internal ones. Any consumer that worked before will continue to work.

---

## Result: PASS ✅ — No feature regressions introduced
