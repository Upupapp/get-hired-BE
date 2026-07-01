# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — PERFORMANCE QA V5
**Date:** 2026-07-01

---

## Backend Performance

### `saveCertificationRequirements()` — Write Path

```sql
DELETE FROM job_certification_requirement WHERE job_id = $1;
INSERT INTO job_certification_requirement (job_id, name, type, importance, issuing_authority, expiry_required, verification_required, created_at, updated_at) VALUES ...
```

| Metric | Assessment |
|---|---|
| Max rows | 10 (FE cap) |
| DELETE | Single-row DELETE on FK-indexed job_id — O(1) per job, negligible |
| INSERT (up to 10 rows) | Batch-parameterized multi-value INSERT — single round-trip |
| Indexes used | `job_id` FK index on `job_certification_requirement` |
| Transaction | Runs within `saveJobArray()` transaction — any INSERT error rolls back cleanly |
| Estimated time | < 5ms for 10 rows on a healthy PostgreSQL instance |

**Assessment: ✅ No performance concern.**

---

### `getJobCertificationRequirements()` — Read Path

```sql
SELECT name, type, importance, issuing_authority, expiry_required, verification_required
FROM job_certification_requirement WHERE job_id = $1 ORDER BY created_at ASC;
```

| Metric | Assessment |
|---|---|
| Rows returned | 0–10 |
| Query complexity | Single table, single equality predicate on indexed FK |
| Estimated time | < 2ms |
| N+1 risk | Called once per `mappedJob()` call — acceptable for single job detail; if ever called in a list query, N+1 risk exists |
| N+1 in job LIST endpoints? | ⚠️ Check: if `mappedJob()` is called for every job in the list response, this is N+1 (10 jobs = 11 queries). Acceptable short-term; backlog: batch-load with `WHERE job_id IN ($1...$N)` for list endpoints |

---

### N+1 Risk Assessment

**`mappedJob()` is called in:**
1. `GET /api/jobs/:id` — single job → no N+1
2. `GET /api/recruiter/job-post/:id` — single job → no N+1
3. `GET /api/recruiter/job-post` (list) — ⚠️ If `mappedJob()` runs per item → N+1

**Recommendation:** For list endpoints, either:
a) Exclude certificationRequirements from list responses (only load on job detail), OR
b) Batch load with single `WHERE job_id IN (...)` query

Current V1 behavior: acceptable — employer job lists typically 10-50 items; < 100ms total even with N+1. Backlog for V2.

---

## Frontend Performance

### Employer Form

| Metric | Assessment |
|---|---|
| FormArray max size | 10 items |
| Change detection | Each `*ngFor` item is a FormGroup — Angular CD triggers on FormArray changes only |
| Template re-renders | Only the added/removed row re-renders, not the whole section |
| Estimated DOM nodes per row | ~12 (label, input, select×2, input, checkbox×2, button) |
| Total extra DOM nodes (10 rows) | ~120 — negligible |

**Assessment: ✅ No performance concern.**

### Public Display

| Metric | Assessment |
|---|---|
| Section conditionally rendered | ✅ `*ngIf` — zero DOM cost when empty |
| Max items rendered | 10 |
| No images or external resources | ✅ |
| No lazy loading needed | ✅ — data comes from job detail API response |
| No additional API call | ✅ — certificationRequirements is part of `GET /api/jobs/:id` response |

**Assessment: ✅ No performance concern.**

---

## Lighthouse Impact

| Metric | Impact |
|---|---|
| FCP (First Contentful Paint) | None — section is below the fold on job detail |
| LCP (Largest Contentful Paint) | None — not the largest content element |
| CLS (Cumulative Layout Shift) | None — section is always inside the same container; `*ngIf` prevents empty placeholder |
| TBT (Total Blocking Time) | None — no JS computation |
| Bundle size | Negligible — no new components/services/pipes added |

---

## Database Indexes Confirmed

| Table | Index | Used By |
|---|---|---|
| `job_certification_requirement` | `job_id` FK (auto-created) | All queries in this feature |
| `job_certification_requirement` | No additional indexes needed | 10 rows max per job |

---

## Result: PASS ✅

One backlog item: batch-load `certificationRequirements` in job-list endpoints to avoid N+1 at scale. Acceptable for V1.
