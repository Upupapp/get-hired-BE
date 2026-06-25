# GETHIRED SEC-02 — Current State Audit

**Command:** GETHIRED_SEC_02_JOB_DETAILS_UID_PARAM_APPLICANT_HISTORY_BOLA_FIX_P1_RESEARCH_EXPANDED_V2  
**Date:** 2026-06-25  
**Priority:** P1

---

## Vulnerability

**Class:** OWASP API1 — Broken Object Level Authorization (BOLA / IDOR)  
**Endpoint:** `GET /job/details` (mounted at `/api/job/details`)  
**Root cause:** `req.query.uid` used directly to fetch applicant application history without authentication or authorization check.

---

## Exact Vulnerable Code

**`controllers/jobsController.js` lines 598–619 (pre-fix):**
```javascript
const getJobDetails = async (req, res) => {
  const { id, uid } = req.query;   // uid is untrusted, caller-supplied
  let isApplied = false;

  try {
    if (uid) {
      const applied = await listOfJobAppliedByApplicant(uid);  // fetches ANY uid's history
      const filtered = applied.filter((item) => item.jobId == id);
      isApplied = filtered.length != 0;
    }

    const details = await jobDetails(id);
    return res.status(status.success).json(successResponse({ ...details, isApplied }));
  }
};
```

**`services/applicant.service.js` lines 926–944:**
```javascript
const listOfJobAppliedByApplicant = async (uid) => {
  const selectQuery = `select * from ${dbSchema}.job_applicants where candidate_id = $1`;
  // Returns: jobApplicationId, jobId, dateApplied, candidateId, applicationStatusId
  // for the supplied uid — parameterized but receives untrusted uid
};
```

**`routes/jobsRoute.js` (pre-fix):**
```javascript
router.get("/job/details", getJobDetails);  // No auth middleware whatsoever
```

---

## Taint Flow

```
HTTP GET /api/job/details?id=JB123&uid=TARGET_FIREBASE_UID
     ↓
req.query.uid (untrusted)
     ↓
listOfJobAppliedByApplicant(uid)
     ↓
SELECT * FROM gethired.job_applicants WHERE candidate_id = $1
     ↓
{ isApplied: true|false }  ← leaks whether target uid has applied to this job
```

---

## Exploit Path

Any unauthenticated attacker or authenticated user can:
1. Call `GET /api/job/details?id=<any_job_id>&uid=<target_firebase_uid>`
2. Learn whether the target user has applied to any job
3. By iterating over job IDs for any given uid, reconstruct an applicant's full application history
4. By iterating over known uids, scan which users applied to a specific job

No authentication is required. No token is required. No ownership check exists.

---

## Data at Risk

- `isApplied` (boolean) — whether a specific user applied to a specific job
- `jobApplicationId`, `dateApplied`, `candidateId`, `applicationStatusId` (implicitly, because `isApplied` is derived from the full `job_applicants` row set for the target uid)

---

## Frontend Taint Flow

**`job/job.service.ts` (pre-fix):**
```typescript
getJobById(jobId: string) {
  const user = localStorage.getItem('user');
  const uid = user ? JSON.parse(user)._id : null;  // reads _id from localStorage
  return this.baseService.get<Model.Job[]>(`${this.jobUrl}/details?id=${jobId}&uid=${uid}`);
}
```

The frontend reads uid from localStorage (`user._id`) and sends it as `?uid=`. An attacker calling the API directly can substitute any uid — the frontend behavior doesn't constrain the backend.

---

## Auth Middleware Audit

**`middleware/verifyAuth.js`:** Requires `Authorization: Bearer <token>` header; verifies with `firebaseAdmin.auth().verifyIdToken()`; attaches `req.user = decodedToken`; trusted uid field: `req.user.uid`.

**`middleware/optionalVerifyAuth.js`:** Did not exist before this fix. Created as part of SEC-02 remediation.

---

## Current Anonymous Job Detail Behavior

Without auth, `/job/details?id=X` returns full public job details. This is intentional — the job detail page is a public page. The vulnerability is the addition of `isApplied` derived from an untrusted uid parameter, not the public job detail data itself.

---

## Response Fields (pre-fix)

From `jobDetails(id)` service: public job fields (title, company, description, location, salary, type, requirements, interview questions, etc.)  
Added by controller: `isApplied` — **private applicant data derived from untrusted uid**

---

## Rollback Risk

Low. The fix is additive (new middleware) + targeted controller change. Public job detail continues to work. Frontend no longer sends `uid` query param — this is backward-compatible since the backend now derives viewer context from the token.

---

## Release Urgency

**P1.** The endpoint is fully public, requires zero authentication, and allows enumeration of any applicant's application history by any caller with only a target uid (which may be obtainable from public profiles or employer dashboards).
