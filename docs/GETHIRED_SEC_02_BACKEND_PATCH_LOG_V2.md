# GETHIRED SEC-02 — Backend Patch Log

**Date:** 2026-06-25

---

## File 1: `middleware/optionalVerifyAuth.js` (NEW)

**Reason:** No optional-auth middleware existed. GET /job/details must be a public endpoint (for anonymous job browsing) but must also attach verified identity when a valid token is provided.

**Before:** Did not exist.

**After:** Middleware that:
- If no Authorization header and no cookie session → `req.user = null`, proceed
- If valid Bearer token → `req.user = decodedToken`, proceed  
- If invalid/expired token → 401 with generic message (never falls back to query uid)

**Security impact:** Establishes a safe optional-auth pattern. Prevents invalid tokens from silently falling through to query-uid fallback.

**Compatibility impact:** None — new file, no existing consumers changed.

**Risk:** Low. Verified against verifyAuth.js — same Firebase verification logic, same trusted uid field.

---

## File 2: `routes/jobsRoute.js`

**Reason:** GET /job/details had no auth middleware at all.

**Before:**
```javascript
router.get("/job/details", getJobDetails);
```

**After:**
```javascript
import optionalVerifyAuth from "../middleware/optionalVerifyAuth";
// ...
router.get("/job/details", optionalVerifyAuth, getJobDetails);
```

**Security impact:** All requests to GET /job/details now pass through auth verification. Anonymous callers proceed without auth. Callers with invalid tokens are rejected before reaching the controller.

**Compatibility impact:** None — anonymous callers are unaffected (they proceed with `req.user = null`).

---

## File 3: `controllers/jobsController.js` — `getJobDetails`

**Reason:** Controller used `req.query.uid` to fetch applicant history without any authorization check. Any caller could supply any uid.

**Before:**
```javascript
const getJobDetails = async (req, res) => {
  const { id, uid } = req.query;
  let isApplied = false;

  try {
    if (uid) {
      const applied = await listOfJobAppliedByApplicant(uid);
      const filtered = applied.filter((item) => item.jobId == id);
      isApplied = filtered.length != 0;
    }
    // ...
    return res.status(status.success).json(successResponse({ ...details, isApplied }));
  }
};
```

**After:**
```javascript
const getJobDetails = async (req, res) => {
  const { id } = req.query;
  let isApplied = false;

  // SEC-02 FIX: viewer identity from verified token only
  const viewerUid = req.user?.uid ?? null;

  // SEC-02 FIX: mismatch detection for all caller-supplied user identifier params
  const suppliedUid = req.query.uid || req.query.userId || req.query.applicantId
    || req.query.candidateId || req.query.profileId;

  if (suppliedUid && viewerUid && suppliedUid !== viewerUid) {
    console.warn('[SEC_02_JOB_DETAILS_UID_PARAM_PROBE_BLOCKED]', { ... });
    return res.status(403).json({ message: "Unable to load this job for the current session." });
  }

  try {
    if (viewerUid) {
      const applied = await listOfJobAppliedByApplicant(viewerUid);  // viewerUid from token
      const filtered = applied.filter((item) => item.jobId == id);
      isApplied = filtered.length != 0;
    }
    // ...
    return res.status(status.success).json(successResponse({ ...details, isApplied }));
  }
};
```

**Security impact (critical):**
- Applicant history now fetched using `viewerUid = req.user?.uid` (verified token)
- `req.query.uid` and all alternate param names never reach the DB query
- BOLA mismatch: 403 + security log
- Anonymous caller: public job only (`viewerUid = null`, `isApplied = false`)

**Compatibility impact:** 
- Anonymous users: unchanged behavior (public job, `isApplied: false`)
- Authenticated applicants who previously sent `uid=own_uid`: now token-derived (same result, safe)
- Employer callers: if they sent an applicant's uid, they now get 403 (correct — this route was never intended for employer applicant lookup)

**Error message update:** Changed generic BE error from "Operation not successful" to "Unable to load this job. Please try again." (matches security UX contract)
