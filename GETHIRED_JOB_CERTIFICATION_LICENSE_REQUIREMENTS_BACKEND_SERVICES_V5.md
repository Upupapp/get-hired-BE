# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — BACKEND SERVICES V5
**Date:** 2026-07-01

---

## JobCertificationRequirementService → `services/job.service.js`

### `saveCertificationRequirements(jobId, items)`
**Lines:** 195–221
**Purpose:** Insert validated requirement rows for a job (called after parent rows cleared)
**Node 14 safe:** Uses `for...of` loop, no `?.` or `??` ✅
**XSS protection:** Called after `stripJobBodyTags` middleware ✅
**Blank-name filter:** `items.filter((item) => item && typeof item.name === 'string' && item.name.trim() !== '')` ✅
**Parameterized queries:** All 8 parameters bound via `$1-$8` ✅

```javascript
// Blank names silently dropped (mirrors chip-list behavior)
const validItems = items.filter((item) => item && typeof item.name === 'string' && item.name.trim() !== '');
```

**Why blank-name filter:** Previously an empty cert row (when employer clicks "Add" but doesn't fill name) would throw a NOT NULL violation on the `name` column, failing the ENTIRE job save. Fix: filter them out server-side.

---

### `getJobCertificationRequirements(jobId)` [V5 UPDATED]
**Lines:** 223–248
**Purpose:** Retrieve all certification requirements for a job, sorted by creation order
**V5 Change:** Returns public-safe fields only (stripped `id` and `canonicalKey`)
**Before:** `{ id, name, type, importance, issuingAuthority, expiryRequired, verificationRequired, canonicalKey }`
**After:** `{ name, type, importance, issuingAuthority, expiryRequired, verificationRequired }`
**Why safe:** Delete-then-reinsert save pattern means `id` is never used by FE for update operations. `canonicalKey` is future-only and null in V1.
**Error handling:** Graceful fallback for `table does not exist` error → returns `[]` (supports environments without migration applied)

---

### `saveJobArray()` — certification block
**Lines:** 358–368
**Purpose:** Delete-then-reinsert certification requirements as part of parent job save
**Semantics:**
- `if (certificationRequirements)` — only processes if field is truthy
  - `undefined` → falsy → skip block → existing rows unchanged ✅
  - `null` → falsy → skip block → existing rows unchanged ✅
  - `[]` → truthy → delete all → condition `length != 0` fails → no inserts → all rows cleared ✅
  - `[{...}]` → truthy → delete all → insert new set ✅

**Atomicity:** `deleteArrayJobEntry` runs before `saveCertificationRequirements`. Not in a BEGIN/COMMIT transaction — consistent with other child arrays (tags, skills, etc.) in the same function. Risk: if insert fails mid-way, rows are left partially deleted. Acceptable for V1; note for V2 (transaction wrapper for child arrays).

---

### `mappedJob(raw)` — certificationRequirements field
**Line:** 775
**Purpose:** Build full job response including child arrays
**Note:** Used for BOTH employer and public responses. V5 fix in `getJobCertificationRequirements()` makes all responses public-safe.

---

## JobCertificationRequirementValidationService (Inline in Controller)
**Status:** Minimal — blank-name filter only
**Gap:** No explicit type/importance enum validation (relies on DB CHECK constraint)
**Recommendation (backlog):** Add inline validation before `saveCertificationRequirements()`:
```javascript
var VALID_TYPES = ['certification', 'license', 'permit', 'eligibility', 'other'];
var VALID_IMPORTANCE = ['required', 'preferred'];
var invalid = validItems.filter(function(item) {
  return VALID_TYPES.indexOf(item.type) === -1 || VALID_IMPORTANCE.indexOf(item.importance) === -1;
});
if (invalid.length > 0) {
  return res.status(400).json({ message: 'Invalid credential type or importance value.', code: 'invalid_requirement_type' });
}
```

---

## JobCertificationRequirementPresenter [V5 FIX APPLIED]
**Location:** `getJobCertificationRequirements()` return mapper
**Before:**
```javascript
return rows.map((row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  importance: row.importance,
  issuingAuthority: row.issuing_authority,
  expiryRequired: row.expiry_required,
  verificationRequired: row.verification_required,
  canonicalKey: row.canonical_key,
}));
```
**After:**
```javascript
return rows.map((row) => ({
  name: row.name,
  type: row.type,
  importance: row.importance,
  issuingAuthority: row.issuing_authority,
  expiryRequired: row.expiry_required,
  verificationRequired: row.verification_required,
}));
```

---

## Services NOT Modified (Preserved)
- `JobCompatibilityService` — not touched ✅
- `MatchEvidencePedigree` — not touched ✅
- `ProfileQualityService` — not touched ✅
- `CVDoctorService` — not touched ✅
- All payment/billing services — not touched ✅
- All SendGrid services — not touched ✅
- `interviewQuestionsUpdate()` — not touched ✅
