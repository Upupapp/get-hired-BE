# GETHIRED SECURE — Recent Deployment Risk Register
**Scope:** Batch Snapshot Endpoint (FE 20a44c5, BE 422d340)
**Date:** 2026-06-24

---

| ID | Severity | Category | Title | File | Status |
|----|----------|----------|-------|------|--------|
| RR-01 | P1 | DoS/Amplification | No rate limiting on batch snapshot endpoint | `routes/applicationRoute.js`, `server.js` | OPEN — no rate limiting exists repo-wide |
| RR-02 | P1 | Data Integrity / UX | FE does not chunk >50 IDs — silent null scores for power users | `applicant-applications.component.ts` | FIXED (see fix log) |
| RR-03 | P1 | Memory Leak | Subscription orphaned on retry() | `applicant-applications.component.ts` | FIXED (see fix log) |
| RR-04 | P1 | Input Validation | No explicit type guard on `raw` query param (repeated param creates Array; accidental safety via String(Array)) | `controllers/applicationController.js` | FIXED (see fix log) |
| RR-05 | P1 | Ops Safety | Backfill script has no startup env confirmation log — operator cannot confirm dev-vs-prod before run | `scripts/backfill_application_snapshots.js` | FIXED (see fix log) |
| RR-06 | P0 | BOLA | Cross-applicant IDs in batch response | `controllers/applicationController.js` | CLOSED — filter by candidate_id === uid before verifiedIds; batch queries use verifiedIds only |
| RR-07 | P0 | SQL Injection | ANY($1::text[]) parameterization | `controllers/applicationController.js` | CLOSED — pg driver handles array params at protocol level, no interpolation |
| RR-08 | P1 | Input Bypass | Max-50 guard bypass via %2C encoding | `controllers/applicationController.js` | CLOSED — Express decodes before controller; guard operates on decoded value |

---

## RR-01 Detail: No Rate Limiting (Standing Issue, Not Fixed This Pass)

**Impact:** The batch endpoint executes 3 DB queries per call (ownership lookup, snapshots query, completeness query). An authenticated attacker with a valid token could issue hundreds of calls per second, causing sustained DB load with a 3x amplification factor.

**Workaround while open:** Auth requirement (`verifyAuth`) means unauthenticated callers are already blocked. Risk is limited to legitimate-account holders abusing the endpoint.

**Recommended fix:** Install `express-rate-limit` and apply to all snapshot endpoints at minimum:
```js
const rateLimit = require('express-rate-limit');
const snapshotLimiter = rateLimit({ windowMs: 60_000, max: 60 });
router.get('/applicant/application/snapshots', verifyAuth, snapshotLimiter, getApplicantApplicationSnapshotsBatch);
```

---

## RR-02 Detail: FE Does Not Chunk >50 IDs (FIXED)

**Impact:** Users with >50 applications see all completeness scores silently return null because the BE returns HTTP 400 and the `catchError` fallback produces `{}`.

**Fix applied:** `loadSnapshots()` now slices `ids` into batches of 50, calls `getApplicationSnapshots` for each batch in parallel via `forkJoin`, and merges all returned `snapshots` maps before populating `snapshotsMap`.

---

## RR-03 Detail: Subscription Leak on Retry (FIXED)

**Impact:** Each `retry()` call adds a new `appsSub` without unsubscribing the prior one. On a flaky network, repeated retries produce N orphaned subscriptions. `ngOnDestroy` only cleans up the most recent one.

**Fix applied:** `retry()` now calls `this.appsSub?.unsubscribe()` before calling `this.ngOnInit()`.

---

## RR-04 Detail: Implicit Type Coercion on Raw Query Param (FIXED)

**Current behavior before fix:**
- Single param: `?applicationIds=id1,id2` — raw is `"id1,id2"` — String coercion works correctly.
- Repeated param: `?applicationIds=id1&applicationIds=id2` — raw is `["id1","id2"]` — `String(["id1","id2"])` = `"id1,id2"` — works accidentally.
- Nested object: `?applicationIds[foo]=bar` — raw is `{ foo: "bar" }` — `String({...})` = `"[object Object]"` — one bogus token reaches DB (no security breach, but unexpected).

**Fix applied:** Explicit type guard before `String(raw)`:
```js
const rawStr = Array.isArray(raw) ? raw.join(',') : (typeof raw === 'string' ? raw : '');
```

---

## RR-05 Detail: Backfill Script Env Confirmation (FIXED)

**Risk:** No interactive or logging gate before live writes begin. If run from a server environment with production `.env`, it writes to production without warning.

**Mitigations already in place (limiting severity):**
- `ON CONFLICT DO NOTHING` — existing real snapshots are never overwritten.
- `source = 'backfill_current_data'` — backfill rows are distinguishable from real submission rows.
- `--dry-run` mode available.

**Fix applied:** Startup log now prints connected DB host/database/schema before any writes. Live runs require `--confirm` flag or will abort.
