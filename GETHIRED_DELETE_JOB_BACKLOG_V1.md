# GETHIRED DELETE JOB — Backlog V1

**Date:** 2026-06-25

---

## Shipped in This Sprint

- P2: deleteJob BOLA fix (route + controller + FE NgRx chain)
- FE UX: real delete dispatch, confirmation copy, success/error toasts

---

## P3 Backlog (Not Shipped)

### BL-01: Audit Logging for Delete

Add `insertLogs("Job Delete", req.user.uid, jobId)` after successful delete in the controller. Requires verification that the `insertLogs` function supports a UID as the second parameter (current usage passes `""` or a job ID).

**Effort:** S (1–2 hours)

---

### BL-02: Cascade Delete for Child Tables

When a job is deleted, its child rows remain in:
- `job_badges`
- `job_requirement`
- `job_goodtohave`
- `job_educationalbackground`
- `job_skills`
- `job_tags`
- `job_certification_requirement`
- `job_interview_template` / `interview_template_question`
- `interview_answers`
- `job_applicants`

These are orphaned rows. Option: DB-level `ON DELETE CASCADE` constraints, or application-level cleanup in the controller.

**Effort:** M (DB migration + application cleanup)
**Risk:** High if not done in a transaction — partial deletes possible

---

### BL-03: Prevent Delete of Jobs with Active Applicants

Business rule: should employers be allowed to delete a job that has applicants? Currently no guard exists. Consider a pre-delete check:

```sql
SELECT COUNT(*) FROM gethired.job_applicants WHERE job_id=$1
```

If count > 0, block delete and return `400 "Cannot delete a job with existing applications."`.

**Effort:** S (30 min)

---

### BL-04: Soft Delete with Recovery Window

Change hard DELETE to `UPDATE SET deleted_at=NOW()` with a 30-day recovery window. This requires:
- Schema change: `deleted_at TIMESTAMP DEFAULT NULL`
- All job queries: `WHERE deleted_at IS NULL`
- Recovery endpoint: `POST /job/restore`

**Effort:** L (multi-day schema migration + query updates)

---

### BL-05: Toast Animation Polish

Add a subtle row fade-out animation before the row is removed from the list:
- `@keyframes gh-row-delete-fade { to { opacity: 0; transform: translateX(16px); } }`
- `@media (prefers-reduced-motion: reduce)` fallback: immediate removal

**Effort:** S (CSS only)

---

### BL-06: Job-Expired Page Delete Support

`job-expired.component.ts` has `viewMenu()` stubbed out with a commented dialog. It doesn't have a delete flow. Add the same delete flow as job-list if expired jobs should also be deleteable.

**Effort:** S (30 min — copy the deleteRow pattern from job-list)

---

### BL-07: Rate Limiting on Delete Endpoint

Add `express-rate-limit` to `DELETE /job/delete`. Current state: no rate limiting on any endpoint (confirmed repo-wide in prior security sprint). A malicious authenticated employer could spam deletes.

**Effort:** S (30 min, same as the rate-limiting sprint already flagged)
