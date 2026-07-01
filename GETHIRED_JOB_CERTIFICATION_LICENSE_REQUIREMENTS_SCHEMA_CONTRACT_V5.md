# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — SCHEMA CONTRACT V5
**Date:** 2026-07-01

---

## Table: `gethired.job_certification_requirement`

**Status:** EXISTS in production. DDL at `get-hired-BE/db/job_certification_requirement_ddl.sql`

### Columns

| Column | Type | Nullable | Default | Constraint | Notes |
|---|---|---|---|---|---|
| `id` | VARCHAR | No | uuid_generate_v4() | PK | UUID auto-generated |
| `job_id` | VARCHAR | No | — | FK → jobs.job_id ON DELETE CASCADE | Parent job |
| `name` | VARCHAR | No | — | NOT NULL | Credential name |
| `type` | VARCHAR | No | 'certification' | CHECK IN (...) | See enum below |
| `importance` | VARCHAR | No | 'required' | CHECK IN (...) | 'required' or 'preferred' |
| `issuing_authority` | VARCHAR | Yes | NULL | — | Optional issuer |
| `expiry_required` | BOOLEAN | No | false | — | Whether valid/unexpired doc needed |
| `verification_required` | BOOLEAN | No | false | — | Whether employer may ask for proof |
| `canonical_key` | VARCHAR | Yes | NULL | — | Future MATCH taxonomy (V1 unused) |
| `created_at` | TIMESTAMP | Yes | — | — | Insert timestamp |
| `updated_at` | TIMESTAMP | Yes | — | — | Update timestamp |

### Type Enum CHECK
```sql
CHECK (type IN ('certification', 'license', 'permit', 'eligibility', 'other'))
```

### Importance Enum CHECK
```sql
CHECK (importance IN ('required', 'preferred'))
```

### Foreign Key
```sql
FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE
```
Cascade ensures requirements are cleaned up when a job is hard-deleted.

---

## Missing Column: `display_order`

The canonical contract includes `displayOrder` as optional. The DB does not have a `display_order` column yet. The service sorts by `created_at ASC` as a substitute.

**Decision:** Do not add `display_order` in V1. Sort by insertion order (created_at ASC) is acceptable. Backlog for V2.

---

## Indexes

| Index | Columns | Purpose |
|---|---|---|
| PK | `id` | Row lookup |
| FK index | `job_id` | Query by parent job (likely auto-created with FK) |

**Recommended additional index (backlog):**
```sql
CREATE INDEX idx_job_cert_req_job_importance 
  ON gethired.job_certification_requirement(job_id, importance);
```
Useful for grouped Required/Preferred queries.

---

## Save Pattern

**Pattern:** Delete-then-reinsert (full replacement per save)
```sql
-- Step 1: Delete existing rows for this job
DELETE FROM gethired.job_certification_requirement WHERE job_id = $1;

-- Step 2: Insert new rows (filtered for non-blank names)
INSERT INTO gethired.job_certification_requirement 
  (job_id, name, type, importance, issuing_authority, expiry_required, verification_required, canonical_key)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *;
```

**Semantics:**
- `certificationRequirements: undefined` (omitted from body) → skip block → existing rows preserved
- `certificationRequirements: []` (empty array sent) → delete all, insert none → clears all requirements
- `certificationRequirements: [...]` → delete all, insert new set → full replacement

**Safety:** Blank-name items are filtered in `saveCertificationRequirements()` before any INSERT, preventing NOT NULL violations.

---

## Backward Compatibility

| Scenario | Behavior |
|---|---|
| Old job created before table existed | `getJobCertificationRequirements()` returns `[]` gracefully |
| Old job API response with no field | FE normalizer returns `[]` |
| NULL in any optional field | Handled — issuingAuthority/canonicalKey explicitly set to `null` on insert |
| Type/importance mismatch | DB CHECK constraint rejects; service throws; controller returns 500 (gap: should be 400) |

---

## No-Op Guarantees

- Job deletion cascades to requirement rows ✅
- Draft job changes do not affect published-job requirements (different jobs) ✅
- certificationRequirements do not affect MATCH scoring ✅
- certificationRequirements do not create applicant data ✅
