# GETHIRED F-08 — DEFERRED BACKLOG (P2/P3)
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## P2 Items (Important — Not Deploy-Blocking)

### P2-01: /job/basiclist and /job/expiredlist — Client-Supplied companyId

**Issue:** Both `GET /job/basiclist?id=<companyId>` and `GET /job/expiredlist?id=<companyId>` accept a client-supplied `id` parameter as companyId. An authenticated employer from Company A could supply Company B's companyId and see their basic job list (titles, status, salary ranges).

**Risk:** Information disclosure — not mutation. No cross-company write capability.  
**Fix:** Derive companyId from `getUserCompany(req.user.uid)` instead of `req.query.id`.  
**Effort:** Small — same pattern as other routes.

---

### P2-02: job_interview_template — Null company_id Historical Rows

**Issue:** If `job_interview_template` rows created before the `company_id` column was populated have `company_id = null`, the new defence-in-depth subquery in `updateQuestionById` will fail for those templates when updating through `updateJob`.

**Risk:** Low — only affects historical data; primary F-08 gate is unaffected.  
**Fix:** DB migration: `UPDATE gethired.job_interview_template jit SET company_id = j.company_id FROM gethired.jobs j WHERE jit.job_id = j.job_id AND jit.company_id IS NULL`  
**Effort:** Small migration + verification.

---

### P2-03: updated_at Not Set on Job Update

**Issue:** The `UPDATE jobs SET ...` in `updateJob` does not include `updated_at = current_timestamp`. If the column exists, it would only be updated via a DB trigger (if any).

**Risk:** Data integrity — dashboard sorting by updated_at may not reflect edits.  
**Fix:** Add `updated_at = current_timestamp` to the SET clause.  
**Effort:** Trivial — one field addition.

---

### P2-04: BOLA Denial Logging

**Issue:** 403 BOLA denials in `updateJob` and related routes are not logged. Repeated cross-company attempts would be invisible in logs.

**Risk:** Operational — cannot detect sustained attack patterns.  
**Fix:** Add `console.warn('[updateJob] BOLA denial: uid=%s jobId=%s', uid, jobId)` before the 403 returns.  
**Effort:** Trivial — 4 lines of code across 3 functions.

---

### P2-05: Rate Limiting on Job Mutation Routes

**Issue:** No rate limiting anywhere in the BE (confirmed in prior SECURE sprint). Job mutation routes have no throttle.

**Risk:** An attacker could automate sequential ID guessing at high volume even though each attempt is blocked.  
**Fix:** Add `express-rate-limit` middleware to `/job/updatejobs`, `/job/changestatus`.  
**Effort:** Medium — requires express-rate-limit setup and store selection.

---

## P3 Items (Nice-to-Have)

### P3-01: CSP / X-Content-Type-Options Headers

Headers `X-Content-Type-Options: nosniff` not confirmed in nginx config or express middleware. Deferred from SECURE sprint.

### P3-02: Job Update Optimistic Lock (ETag/version)

No concurrency control on job updates. Two simultaneous edit sessions for the same job could overwrite each other silently.

### P3-03: Interview Questions — Sequence Reorder on Update

`interviewQuestionsUpdate` does not reorder sequences after update — only after delete. Sequences can drift on multi-edit sessions.

### P3-04: FE Skeleton Shimmer on Job Reload

The sprint spec called for a skeleton shimmer if a reload occurs during edit. Not implemented — the existing `app-inline-loading` spinner serves this role adequately. Full skeleton shimmer would require extracting the form skeleton into a separate template.

### P3-05: Retry Button UX

The error alert shows a message but no explicit "Retry" button — the save/publish buttons remain visible and can be clicked again. Adding a dedicated retry button would improve discoverability on mobile. Deferred.
