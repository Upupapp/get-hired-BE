# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — TEST LOG V5
**Date:** 2026-07-01

---

## Test Coverage Assessment

### Existing Tests (Pre-V5)

No dedicated test files for `job_certification_requirement` were found in the pre-V5 audit. The feature relies on:
- Integration test coverage via the broader job create/update flow
- DB CHECK constraints enforcing enum values
- Middleware XSS sanitization (tested as part of job middleware)

---

## V5 Change: What Needs Test Coverage

**Change:** `getJobCertificationRequirements()` no longer returns `id` or `canonicalKey`.

**Test cases needed (not yet written — backlog):**

### Test 1: Public API Response Does Not Expose Internal Fields
```javascript
// GET /api/jobs/:id for a published job with certification requirements
// Assert: response.certificationRequirements[0] does NOT have 'id' key
// Assert: response.certificationRequirements[0] does NOT have 'canonicalKey' key
// Assert: response.certificationRequirements[0] HAS 'name', 'type', 'importance', 'issuingAuthority', 'expiryRequired', 'verificationRequired'
```

### Test 2: Save Preserves Requirements (Integration)
```javascript
// POST /api/recruiter/job-post with certificationRequirements: [{ name: 'PRC License', type: 'license', importance: 'required' }]
// Assert: 200 OK
// GET the job
// Assert: certificationRequirements.length === 1
// Assert: certificationRequirements[0].name === 'PRC License'
```

### Test 3: Full Replacement on Update
```javascript
// Create job with 2 requirements
// PUT with 1 requirement (different one)
// GET: assert only 1 requirement exists (old ones deleted)
```

### Test 4: Blank Name Rows Filtered
```javascript
// POST with certificationRequirements: [{ name: '', type: 'license', importance: 'required' }, { name: 'PRC', type: 'license', importance: 'required' }]
// GET: assert only 1 row returned (blank filtered)
```

### Test 5: BOLA — Cannot Read Another Company's Job Certifications
```javascript
// Company A creates job with requirements
// Company B employer tries GET /api/jobs/:id — succeeds (public endpoint)
// Company B employer tries to POST to that job — blocked (jobsController company_id check)
```

### Test 6: Empty Requirements — Section Hidden
```javascript
// FE unit test: job with certificationRequirements: [] → *ngIf false → section not in DOM
// FE unit test: job with certificationRequirements: null → *ngIf false → section not in DOM
```

### Test 7: Type Enum Validation
```javascript
// POST with type: 'invalid_type' → DB CHECK constraint fails → 400 or 500 with DB error
// (Confirm the error is caught and doesn't leak stack trace)
```

---

## Constraint-Based Coverage (Already Active)

| Constraint | Coverage |
|---|---|
| `type` CHECK (`certification, license, permit, eligibility, other`) | ✅ DB-level — enforced on any INSERT |
| `importance` CHECK (`required, preferred`) | ✅ DB-level — enforced on any INSERT |
| `job_id` FK CASCADE DELETE | ✅ DB-level — certifications deleted when job deleted |
| `name` NOT NULL | ✅ DB-level; also filtered in saveCertificationRequirements() |
| XSS sanitization | ✅ jobMiddleware.js (existing, covers all job body fields) |

---

## Manual QA Test Script (Run in Browser)

1. Create a new job draft
2. Open "Certifications & Licenses" section
3. Add a requirement: name="PRC License", type=License, importance=Required, authority="LTO"
4. Add a second: name="BOSH Certificate", type=Certification, importance=Preferred
5. Save Draft
6. Close and reopen the draft — verify both requirements appear prefilled
7. Remove the second requirement, save → verify only 1 remains
8. Publish the job
9. Open the public job detail page — verify section appears with "Required" group containing "PRC License"
10. Check DevTools Network → `GET /api/jobs/:id` → certificationRequirements array → confirm no `id` or `canonicalKey` keys
11. Apply to the job — verify the application proceeds normally (no credential gate)

---

## Result: Test coverage plan documented; automated tests are a next-sprint backlog item ⚠️
