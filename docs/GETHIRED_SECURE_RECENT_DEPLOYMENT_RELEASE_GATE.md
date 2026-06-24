# GETHIRED SECURE — Release Gate (Recent Deployment: Snapshot System)
**Date:** 2026-06-24  
**Scope:** Application Snapshots System only

---

## Gate A — BOLA Prevention
**Status: PASS**

- Applicant snapshot endpoint (`GET /applicant/application/snapshot`):
  - Queries `job_applicants WHERE job_application_id = $1`
  - Asserts `rows[0].candidate_id === req.user.uid` before returning any data
  - Returns 403 if mismatch
  - Returns 404 if applicationId does not exist (acceptable — applicant knows their own IDs)

- Employer snapshot endpoint (`GET /job/applicant/snapshot-summary`):
  - Queries application → resolves `job_id`
  - Queries job → resolves `company_id`
  - Calls `getUserCompany(uid)` → gets caller's company from DB (not from request)
  - Asserts `callerCompany.companyId === jobRows[0].company_id`
  - Returns 403 if any check fails, including when applicationId does not exist (fixed: enumeration oracle closed)

**Evidence:** `controllers/applicationController.js` lines 70-79 (applicant check), lines 122-145 (employer check)

---

## Gate B — SQL Safety
**Status: PASS**

All nine new DB queries in this deployment are parameterized:

| Query | Parameters |
|---|---|
| `job_applicants WHERE job_application_id = $1` | applicationId |
| `jobs WHERE job_id = $1` | job_id from DB result |
| `application_snapshots INSERT` | 13 $N params |
| `application_completeness_snapshots INSERT` | 16 $N params |
| `match_snapshots INSERT` | 13 $N params |
| `application_snapshots SELECT WHERE application_id = $1` | applicationId |
| `application_completeness_snapshots SELECT WHERE application_id = $1` | applicationId |
| `match_snapshots SELECT WHERE application_id = $1` | applicationId |
| `job_applicants ownership check WHERE job_application_id = $1` | applicationId |

No user-supplied strings are interpolated into any of the above queries.

**Evidence:** `applicationSnapshotService.js` lines 333-355, 366-395, 453-477, 572-593; `applicationController.js` lines 70-73, 121-125, 130-133

---

## Gate C — Information Disclosure
**Status: PASS**

- Protected attributes (gender, religion, race, disability, etc.) are excluded by a whitelist-based snapshot builder. EXCLUDED_FIELDS is enforced at build time, not filter time.
- Error responses in all three controllers use opaque, safe messages. No stack traces, no DB schema names, no table names, no column names in any response body.
- The employer snapshot summary returns only: hasSnapshot, snapshotSource, snapshotCreatedAt, completenessScore, completenessLevel, matchScore, matchLevel, hasMatchSnapshot, matchDisclaimer. No applicant PII (email, phone) is included in the summary.
- The applicant response returns only their own completeness metadata. No raw profile snapshot content is returned (only derived fields: score, level, missing sections).
- privacyNote is a hardcoded string; EXCLUDED_FIELDS array is not serialized into any response.

**Evidence:** `applicationSnapshotService.js` lines 31-38 (EXCLUDED_FIELDS), 197-240 (whitelist builder), 600-618 (employer summary); `applicationController.js` lines 86-97, 147-149

---

## Gate D — Fire-and-Forget Safety
**Status: PASS**

`createApplicationSnapshots()` is called in `jobApply()` without `await`. The call is immediately chained with `.catch()`:

```js
createApplicationSnapshots({ ... }).catch((err) => {
  console.error("[applicationSnapshot] snapshot creation failed:", err);
});
```

Additionally, `createApplicationSnapshots()` itself wraps each snapshot phase in its own `try/catch` and accumulates errors in a result object without re-throwing. This means:
- If phase 1 (application snapshot) fails: phases 2 and 3 still run
- If phase 2 (completeness snapshot) fails: phase 3 still runs
- If phase 3 (match snapshot) fails: function still resolves
- The Promise returned by `createApplicationSnapshots()` always resolves, never rejects under normal failure conditions
- The `.catch()` is belt-and-suspenders for any unexpected throw from the orchestrator itself

Node.js process cannot be crashed by snapshot failure.

**Evidence:** `application.service.js` lines 146-158; `applicationSnapshotService.js` lines 497-568

---

## Gate E — Auth Coverage
**Status: PASS**

Both new endpoints are protected by `verifyAuth` middleware:

```js
router.get("/applicant/application/snapshot", verifyAuth, getApplicantApplicationSnapshot)
router.get("/job/applicant/snapshot-summary", verifyAuth, getEmployerApplicantSnapshotSummary)
```

`req.user.uid` is used as the identity source in both controllers. Neither controller reads identity from request body or query params.

**Evidence:** `routes/applicationRoute.js` lines 39-41

---

## Overall Gate Result

| Gate | Result | Notes |
|---|---|---|
| A — BOLA Prevention | PASS | 1 fix applied (enumeration oracle on employer endpoint) |
| B — SQL Safety | PASS | All 9 new queries parameterized |
| C — Information Disclosure | PASS | No protected attrs, safe error msgs, no cross-company data |
| D — Fire-and-Forget Safety | PASS | .catch() present, orchestrator never throws |
| E — Auth | PASS | Both routes have verifyAuth |

**Release verdict for snapshot system: GO WITH CAUTION**

The snapshot system itself is safe to release. "With caution" refers to the platform-level pre-existing P0s (webhook verification missing, secrets in git history) which are unresolved and affect the broader platform risk posture, not this deployment specifically.
