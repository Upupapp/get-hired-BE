# GETHIRED DELETE JOB — Authorization Contract V1

**Date:** 2026-06-25

---

## Endpoint

`DELETE /job/delete`

## Authentication

- Required: Yes (`verifyAuth` middleware)
- Token: Firebase ID Token in `Authorization: Bearer <token>` header
- Token verification: `firebaseAdmin.auth().verifyIdToken(idToken)` — sets `req.user`

## Authorization

| Claim | Source | Trust |
|-------|--------|-------|
| Caller UID | `req.user.uid` (from verified JWT) | TRUSTED |
| Caller company | `getUserCompany(req.user.uid)` (DB lookup by UID) | TRUSTED |
| Job ID | `req.body.jobId` | UNTRUSTED as scope — used only as target identifier |
| Company ID | req.body.companyId | NOT USED — completely ignored after P2 fix |

## Authorization Logic

```
1. Verify Firebase token (middleware)
2. getUserCompany(req.user.uid) → callerCompany
3. If callerCompany invalid → 403
4. DELETE FROM gethired.jobs WHERE job_id=$1 AND company_id=$2 RETURNING job_id
   [$1 = req.body.jobId, $2 = callerCompany.companyId]
5. If rowCount === 0 → 404 (job not found OR belongs to different company)
6. Return getBasicJobList(callerCompany.companyId) → refreshed list
```

## Cross-Company Protection

- An attacker from Company B who supplies `jobId` belonging to Company A:
  - The DELETE WHERE clause `AND company_id = B.companyId` evaluates false
  - `rowCount = 0` → 404 returned
  - The job is not deleted
  - Company A's job list is never returned
  - No information about Company A leaks

## Response Contract

```json
// 200 OK — success
{ "status": "success", "data": [ /* BasicList[] for caller's company */ ] }

// 404 Not Found — job not found or wrong company
{ "error": "Job not found or you do not have access." }

// 403 Forbidden — caller has no company
{ "message": "Job not found or you do not have access." }

// 500 Internal Server Error
{ "data": "Operation not successful. Please try again." }
```
