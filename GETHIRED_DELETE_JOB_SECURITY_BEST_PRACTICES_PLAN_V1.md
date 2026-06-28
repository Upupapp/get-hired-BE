# GETHIRED DELETE JOB — Security Best Practices Plan V1

**Date:** 2026-06-25

---

## OWASP BOLA (Broken Object Level Authorization) Pattern

Delete operations are the highest-risk mutation because they are irreversible. The correct pattern:

1. Extract caller identity from verified JWT (`req.user.uid`) — never from request body/query.
2. Resolve company scope via `getUserCompany(req.user.uid)` — server-side only.
3. Fold ownership into the destructive query (`WHERE id=$1 AND company_id=$2`) — eliminates a separate SELECT round-trip.
4. Check `rowCount` (or `RETURNING`) — 0 rows = not found or wrong company; return 404 (not 403) to avoid confirming existence.
5. Never use caller-supplied companyId, employerId, or userId for scope.
6. Refresh response list scoped to caller's company only.

## Authorization Chain for deleteJob

```
HTTP DELETE /job/delete
  ↓ verifyAuth middleware (Firebase token verification)
  ↓ req.user.uid = verified Firebase UID
  ↓ getUserCompany(req.user.uid) → callerCompany.companyId
  ↓ DELETE FROM jobs WHERE job_id=$1 AND company_id=$2 RETURNING job_id
  ↓ rowCount === 0 → 404 "Job not found or you do not have access."
  ↓ getBasicJobList(callerCompany.companyId) → return refreshed list
```

## What NOT to Trust

- `req.body.companyId` — spoofable
- `req.query.companyId` — spoofable
- `req.body.employerId` — spoofable
- `req.body.userId` — spoofable
- `req.body.role` — spoofable

## Response Shape Best Practices

- 200: `{ status: "success", data: BasicList[] }` — refreshed list after delete
- 404: `{ error: "Job not found or you do not have access." }` — no existence leak
- 403: `{ message: "..." }` — only if callerCompany lookup fails (not for job mismatch)
- 500: `{ data: "Operation not successful. Please try again." }` — generic server error

## Audit Logging Plan

Future: Log to an audit table on every successful delete: `(job_id, company_id, deleted_by_uid, deleted_at)`. Currently not implemented (see AUDIT_LOGGING_PLAN).
