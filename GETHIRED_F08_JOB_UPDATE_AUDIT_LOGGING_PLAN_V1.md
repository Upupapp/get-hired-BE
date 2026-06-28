# GETHIRED F-08 — AUDIT / LOGGING PLAN
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## Existing Logging Conventions

The codebase uses:
1. `console.error('[controllerName] error:', error)` — structured console errors
2. `insertLogs('Job View', '', id)` in `getJobDetails` — DB-level activity log
3. No dedicated structured logging framework (Winston, pino, etc.) observed
4. PM2 process manager captures stdout/stderr to pm2 logs on Linode

---

## Current Logging State for Job Update Routes

### updateJob
```js
console.error('[updateJob] error:', error);  // On 500 errors
```
No logging on 403 cases (intentional — high-frequency attack path would flood logs).

### updateStatusOfJob
```js
console.error('[jobsController] error:', error);  // On 500
```

### deleteInterviewQuestion
```js
console.error('[jobsController] error:', error);  // On 500
```

---

## Recommended Additions (Within Existing Patterns)

These are low-footprint additions consistent with existing conventions. NOT implemented in this sprint to avoid scope creep — backlogged as P2.

### Option A: Console-based denial logging
```js
// On BOLA denial in updateJob:
console.warn('[updateJob] BOLA attempt: uid=%s, jobId=%s, derivedCompany=%s', 
  req.user.uid, jobId, callerCompany?.companyId || 'none');
```

### Option B: Extend insertLogs for write mutations
```js
// After successful update:
await insertLogs('Job Update', callerCompany.companyId, jobId);
```

This would use the existing `insertLogs` service (already used in `getJobDetails`).

---

## Decision

**Not implemented in this sprint** — the existing `console.error` pattern is sufficient for operational visibility through PM2 logs. Adding BOLA-denial logging carries a small risk of logging sensitive data (uid values) and requires agreement on retention policy.

**Deferred to P2 backlog.**

---

## What IS Logged

- All 500 errors: `console.error('[updateJob] error:', error)` — captured by PM2
- verifyAuth failures: express middleware sends 403 before controller — not logged beyond the request itself
- BOLA denials: not explicitly logged (returns 403 without throw → no console.error)
