# GETHIRED DELETE JOB — Audit Logging Plan V1

**Date:** 2026-06-25

---

## Current State

No audit logging exists for job delete. When a job is deleted, there is no record of:
- Which user deleted it
- When it was deleted
- What the job's state was at time of deletion

## Recommended Future Implementation

### Option A: Soft Delete with Audit Trail (Preferred)

Change `DELETE` to `UPDATE ... SET deleted_at=NOW(), deleted_by=$2` instead of a hard delete.

**Pros:** Preserves data, enables recovery, creates audit trail automatically.
**Cons:** All queries that fetch jobs must add `WHERE deleted_at IS NULL`.

### Option B: Audit Log Table (Current Code Path)

Insert to a `job_audit_log` table after a successful delete:

```sql
INSERT INTO gethired.job_audit_log (job_id, company_id, action, performed_by_uid, performed_at)
VALUES ($1, $2, 'DELETE', $3, NOW());
```

Called after `rowCount > 0` is confirmed.

### Option C: insertLogs (Existing Pattern)

The codebase already has `insertLogs("Job View", "", jobId)` in `getJobDetails`. A similar call could be added:

```javascript
await insertLogs("Job Delete", req.user.uid, jobId);
```

This is the least-effort path using existing infrastructure.

---

## Priority

P3 — backlog. The security fix (BOLA) is the P2 that was shipped. Audit logging is a governance/compliance concern, not a security blocker for the current release.

## Blockers

- No `job_audit_log` table in production schema (would need migration)
- Soft delete would require schema change + query updates across ~15 job-related queries
- `insertLogs` destination table schema unknown — needs verification before use for delete events

## Recommendation

Log to existing `insertLogs` in the next BE sprint: `insertLogs("Job Delete", req.user.uid, jobId)` after confirmed delete. No schema migration required.
