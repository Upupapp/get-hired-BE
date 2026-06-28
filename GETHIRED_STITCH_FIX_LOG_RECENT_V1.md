# GETHIRED STITCH FIX LOG — RECENT DEPLOYMENT — V1 (UPDATED 2026-06-25)

**Date:** 2026-06-25
**Scope:** 7 integration seams (deleteJob, NgRx chain, PayMongo, CORS, F-08, P2-01, schema)

---

## Applied Fixes

None applied in this pass. All 6 passing seams are correct as-is. The one failing seam (Seam 7) requires a DB migration that cannot be applied from source files — it requires direct DB access.

---

## Required Action — P0 (Seam 7)

### FIX-P0: Apply migration to add company_id and created_by to job_interview_template

**Status:** PENDING — requires production DB access

**Why needed:**
- `interview.service.js` line 48-50 inserts `(company_id, created_by)` into `job_interview_template`
- DDL files `db/job_ddl.sql` and `db/complete_ddl.sql` do NOT define these columns
- If columns are absent from the live DB, job creation with interview questions throws a Postgres column-not-found error

**Verification step (run first):**
```sql
-- Connect to production Postgres, schema gethired
\d gethired.job_interview_template
-- or:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'gethired'
  AND table_name = 'job_interview_template'
ORDER BY ordinal_position;
```

**If columns are missing, apply this migration:**
```sql
-- Migration: add company_id and created_by to job_interview_template
-- Safe: both are nullable — existing rows are unaffected

ALTER TABLE gethired.job_interview_template
  ADD COLUMN IF NOT EXISTS company_id VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR NULL;

-- Verify
\d gethired.job_interview_template
```

**After migration, update DDL reference file:**
Add these two column definitions to `db/job_ddl.sql` inside the `job_interview_template` CREATE TABLE block to keep source files in sync:
```sql
company_id varchar NULL,
created_by varchar NULL,
```

---

## Deferred Items

### DEFER-S1 — Staging env.js APP_URL_DEV bug

**File:** `get-hired-BE/env.js` lines 57-59
**Issue:**
```javascript
app_url: process.env.APP_URL_DEV ? process.env.APP_URL : 'http://localhost:4200'
```
Checks `APP_URL_DEV` for truthiness but reads `APP_URL` (not `APP_URL_DEV`) as the CORS origin value. If `APP_URL_DEV` is set but `APP_URL` is unset/wrong, staging CORS is misconfigured.

**Fix:**
```javascript
// Change line 58 from:
app_url: process.env.APP_URL_DEV ? process.env.APP_URL : 'http://localhost:4200',
// To:
app_url: process.env.APP_URL_DEV ? process.env.APP_URL_DEV : 'http://localhost:4200',
```
**Priority:** Low (staging only; does not affect production)

---

### DEFER-S2 — PayMongo padEnd length normalization (low-severity security note)

**File:** `get-hired-BE/controllers/paymentController.js` line 89
**Issue:** `sig.padEnd(expected.length, "0")` before hex-to-Buffer conversion is non-idiomatic. The standard approach for constant-time comparison is to compare two hex strings of equal known length (both should be 64 hex chars from SHA-256).

**Preferred fix:**
```javascript
// Replace the try block in verifyPaymongoSignature with:
try {
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
} catch {
  return false;
}
```
This works correctly because both `sig` and `expected` are 64-char hex strings from the same HMAC-SHA256. If `sig` is not a valid 64-char hex string, `Buffer.from(sig, "hex")` will produce a shorter buffer and the length check catches it.

**Priority:** Low (current code is safe, not exploitable — purely idiomatic improvement)

---

### DEFER-S3 — Verify APP_URL env var on production server

**Context:** CORS passes if `APP_URL=https://gethiredonline.app` is set. Cannot be verified from source files.
**Action:** Confirm `APP_URL` env var on the Linode production server:
```bash
grep APP_URL /path/to/.env
```
Should read: `APP_URL=https://gethiredonline.app`

**Priority:** Low (code path is correct; verification only)
