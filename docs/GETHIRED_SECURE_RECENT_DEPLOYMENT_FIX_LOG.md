# GETHIRED SECURE — Fix Log (Recent Deployment: Snapshot System)
**Date:** 2026-06-24

---

## Fix 1 — Enumeration Oracle Closed on Employer Snapshot Endpoint

**ID:** FINDING-SD-01  
**Severity:** P1  
**File:** `controllers/applicationController.js`  
**Function:** `getEmployerApplicantSnapshotSummary`

**Before (lines 125-127):**
```js
if (!appRows || appRows.length === 0) {
  return res.status(status.notfound).send({ status: "error", error: "Application not found." });
}
```

**After:**
```js
// SECURE fix (enumeration oracle): use 403 for both "not found" and
// "wrong company" so a recruiter from Company B cannot probe valid
// applicationIds by comparing 404 vs 403 response codes.
if (!appRows || appRows.length === 0) {
  return res.status(403).send({ status: "error", error: "Forbidden." });
}
```

**Why:** The employer endpoint previously returned HTTP 404 for non-existent applicationIds and HTTP 403 for valid IDs from another company. A recruiter from Company B could distinguish these two responses and thereby enumerate valid application IDs from Company A. Collapsing both to 403 removes the oracle.

**Risk of change:** None — the 404 response was informational only; no FE consumer depends on distinguishing "not found" vs "forbidden" for this endpoint. Legitimate employer callers who own the job will receive 200 as before.

---

## Audit-Only Findings (No Code Changes Required)

The following items were audited and found to be already correct. No code changes were applied.

| Finding | Verdict |
|---|---|
| BOLA: Applicant can only read own snapshot | PASS — ownership check in place |
| BOLA: Employer limited to own company's applicants | PASS — 3-step company ownership chain in place |
| All new DB queries parameterized | PASS — all 9 new queries use `$N` placeholders |
| Protected attributes excluded from snapshots | PASS — whitelist-based snapshot builder, EXCLUDED_FIELDS enforced |
| Error messages in all 3 controllers | PASS — safe opaque messages, no raw Error or DB schema info |
| Fire-and-forget: `.catch()` prevents process crash | PASS — both orchestrator-level and per-phase try/catch |
| Both new routes have `verifyAuth` | PASS — verified in applicationRoute.js lines 39 and 41 |
| Cross-company match_snapshots isolation | PASS — retrieval only via application_id with ownership pre-check |
| privacyNote does not leak EXCLUDED_FIELDS array | PASS — hardcoded string, no array serialization |
