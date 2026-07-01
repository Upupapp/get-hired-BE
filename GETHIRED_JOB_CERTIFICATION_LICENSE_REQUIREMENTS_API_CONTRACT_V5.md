# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — API CONTRACT V5
**Date:** 2026-07-01

---

## Endpoints That Handle certificationRequirements

### POST /api/recruiter/job-post (Create Job)
**Auth:** Firebase JWT required (`verifyAuth` middleware)
**BOLA:** `company_id` derived from JWT via `getUserCompanyForRequest()` — never from body
**Cert handling:** `certificationRequirements` passed to `saveJobArray()` after job INSERT

**Request body (relevant field):**
```json
{
  "certificationRequirements": [
    {
      "name": "Professional Driver's License",
      "type": "license",
      "importance": "required",
      "issuingAuthority": "LTO",
      "expiryRequired": true,
      "verificationRequired": true,
      "canonicalKey": null
    }
  ]
}
```

**Response (relevant field in data):**
```json
{
  "certificationRequirements": [
    {
      "name": "Professional Driver's License",
      "type": "license",
      "importance": "required",
      "issuingAuthority": "LTO",
      "expiryRequired": true,
      "verificationRequired": true
    }
  ]
}
```
Note: `id` and `canonicalKey` stripped (fix applied V5) ✅

---

### PUT /api/recruiter/job-post/:id (Update Job)
**Auth:** Firebase JWT required
**BOLA:** `WHERE job_id=$20 AND company_id=$21` enforces ownership
**Cert handling:** Same as create — passed to `saveJobArray()`

**Save semantics:**
- `certificationRequirements` omitted → existing rows unchanged
- `certificationRequirements: []` → clears all existing rows
- `certificationRequirements: [...]` → replaces all existing rows

---

### GET /api/jobs (Public Job List)
**Auth:** None
**Cert data:** `certificationRequirements` included via `mappedJob()` — published jobs only
**Strip:** `id` and `canonicalKey` stripped (V5 fix) ✅

---

### GET /api/jobs/:id (Public Job Detail)
**Auth:** None
**Cert data:** `certificationRequirements` included for published jobs
**Strip:** `id` and `canonicalKey` stripped (V5 fix) ✅

---

### GET /api/public/company/:slug/jobs (Public Company Jobs)
**Auth:** None
**Filter:** `WHERE job_status_id = 2` (published only) ✅
**Cert data:** Uses simplified job shape (not full `mappedJob()`) — certificationRequirements typically not included in list endpoints (only in detail)

---

## Payload Field Log

| Backend field | API JSON field | FE model field | Employer form label | Public display label | Hide when empty | Public |
|---|---|---|---|---|---|---|
| `name` | `name` | `name` | "Requirement name" | Name (bold) | N/A (whole section hidden) | Yes |
| `type` | `type` | `type` | "Type" | Type (parenthetical) | — | Yes |
| `importance` | `importance` | `importance` | "Required or Preferred" | Group heading | — | Yes |
| `issuing_authority` | `issuingAuthority` | `issuingAuthority` | "Issuing authority (optional)" | Shown if present | Yes | Yes |
| `expiry_required` | `expiryRequired` | `expiryRequired` | "Valid/unexpired document required" | "Valid/unexpired document may be requested" | Yes (if false) | Yes |
| `verification_required` | `verificationRequired` | `verificationRequired` | "Employer may ask for proof" | "Employer may ask for proof" | Yes (if false) | Yes |
| `id` | ~~`id`~~ | `id?` | N/A | N/A | — | **No** (stripped V5) |
| `canonical_key` | ~~`canonicalKey`~~ | `canonicalKey?` | N/A | N/A | — | **No** (stripped V5) |

---

## Frontend Normalization (Incoming API Response)

The FE `PublicJobNormalizerService` handles the following field name variants:
- `certificationRequirements`
- `certification_requirements`
- `jobCertificationRequirements`
- `job_certification_requirements`
- `licenseRequirements`
- `credentialRequirements`
- `null` → `[]`
- `undefined` → `[]`
- Missing field → `[]`

---

## Error Responses

| Scenario | HTTP Code | Body |
|---|---|---|
| Not authenticated | 401 | `{ message: "Unauthorized" }` |
| Company not found / no company | 403 | `{ message: "You don't have permission to do that." }` |
| Job not found / company mismatch | 403 | `{ message: "You don't have permission to update this job." }` |
| Invalid type value | 500 (gap: should be 400) | Generic error (DB CHECK constraint violation) |
| Invalid importance value | 500 (gap: should be 400) | Generic error |
| Blank name items | Silently ignored (server-side filter) | — |

---

## Backward Compatibility Status

| Scenario | Status |
|---|---|
| Old job with no certificationRequirements field | ✅ Normalizes to `[]` gracefully |
| Old job with null certificationRequirements | ✅ Normalizes to `[]` |
| Old job with empty `[]` | ✅ Section hidden (empty guard) |
| New job request without certificationRequirements | ✅ Existing rows unchanged (undefined = skip) |
| Request with certificationRequirements: [] | ✅ Clears all rows (intentional) |
