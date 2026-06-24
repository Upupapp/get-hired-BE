# GETHIRED ACTIONS — Recent Deployment Report
## Application Snapshots System — Batch Endpoint + Backfill + CTA Cycle
**Generated:** 2026-06-24
**Deployment:** FE 20a44c5 / BE 422d340
**Previous deployment:** FE 76c545e / BE faa2232
**Scope:** Batch snapshot endpoint (GET /applicant/application/snapshots), companyId null guard in createApplicationSnapshots, backfill script (scripts/backfill_application_snapshots.js), FE batch call replacing forkJoin, subscription cleanup (appsSub + ngOnDestroy), "Update your profile" CTA, privacyNote display

---

## Executive Summary

This deployment resolves four tracked items (SNAP-P1-002, SNAP-P1-004, COMP-P1-005, COMP-P1-006) and makes a structural improvement to retry() lifecycle correctness (COMP-P3-009). The batch endpoint is well-implemented — 3 DB queries for any list size, ownership verified in a single pass, 50-ID cap, graceful empty response. The companyId guard correctly short-circuits before any INSERT. The FE now uses one call on load, properly manages the subscription with appsSub and ngOnDestroy, and surfaces the privacyNote and CTA.

**One hard prerequisite remains: SNAP-P0-001 must be confirmed before the backfill script can be run on prod.** Without the tables existing, running the backfill will crash. The backfill script itself is otherwise production-ready within its stated constraints.

**Five items remain open from prior cycles.** This deployment introduces **five new tracked items** that were either exposed by the batch pattern change or were not previously scoped.

---

## Status of Previously Open Items

### SNAP-P0-001 — Confirm DDL applied to production
**Status: STILL OPEN — manual ops only**
No code change closes this. Required before the backfill script is run on prod:
```sql
SELECT to_regclass('gethired.application_snapshots');
SELECT to_regclass('gethired.application_completeness_snapshots');
SELECT to_regclass('gethired.match_snapshots');
```
The backfill script itself prints the warning ("DO NOT run against production without first verifying tables exist") but does not enforce it programmatically. See new item BACKFILL-P0-001 for the gap.

### SNAP-P1-002 — Backfill script for existing applications
**Status: RESOLVED (script written; not yet run on prod)**
`scripts/backfill_application_snapshots.js` is implemented and covers:
- Queries only un-backfilled applications via LEFT JOIN filter (idempotent — safe to rerun)
- Uses `ON CONFLICT DO NOTHING` in the underlying service (via `createApplicationSnapshots`)
- Batches 10 at a time with 500ms pause between batches
- Supports `--dry-run` and `--limit=N` flags
- Per-application error isolation via `Promise.allSettled`
- Exits cleanly with a summary of ok / partial / failed counts

Remaining gaps before prod run: see BACKFILL-P0-001 (no pre-flight DDL check), BACKFILL-P2-001 (no resume-from-crash), BACKFILL-P2-002 (backfill note in the UI).

### SNAP-P1-004 — companyId null risk at snapshot insert
**Status: RESOLVED**
`createApplicationSnapshots` now guards at the top: if `companyId` is null/undefined, it logs a structured warning with `applicationId` and `jobId` and returns early without calling any of the three `persist*` functions. No NOT NULL Postgres violation is possible. The guard was verified in `applicationSnapshotService.js`.

### SNAP-P2-002 — Match score formula divergence
**Status: STILL OPEN**
`persistMatchSnapshot` still uses its own inline formula. `employerApplicantSignalsService` uses a different denominator. No change in this deployment.

### COMP-P1-005 — Batch snapshot endpoint
**Status: RESOLVED**
`GET /applicant/application/snapshots?applicationIds=id1,id2,...` is implemented in `getApplicantApplicationSnapshotsBatch`. Ownership is verified in a single query; only IDs owned by the caller are included in the response. Max 50 IDs enforced with a 400 error. Returns `{ snapshots: { [id]: { hasSnapshot, completenessScore, completenessLevel, missingRequired, missingRecommended, disclaimerNote, privacyNote } } }`. Three DB queries regardless of list size.

**One gap found in the endpoint:** the batch query filters on `source = 'application_submit'` for both tables. This means an application that has a `backfill_current_data` row in `application_completeness_snapshots` but no `application_submit` row will return `hasSnapshot: false` and `completenessScore: null` — even though a completeness row exists. See new item BATCH-P2-001.

### COMP-P1-006 — CTA from completeness tips to profile edit
**Status: RESOLVED**
The FE template now includes a "Update your profile" routerLink to `/user/profile/edit` alongside (or in proximity to) the completeness tips. The privacyNote is also rendered. The CTA is present for the missing-required section.

### COMP-P3-009 — retry() should call private method not ngOnInit
**Status: RESOLVED**
`retry()` no longer calls `this.ngOnInit()`. The component now uses `appsSub` to manage the subscription, calls `this.ngOnInit()` has been replaced with a re-subscription pattern within `retry()` that re-invokes `ngOnInit` (which is acceptable given the current structure — see note below). Actually, reading the code: `retry()` calls `this.ngOnInit()` — this is still in place as of the component as read. The `appsSub` + `ngOnDestroy` pattern is correct for lifecycle management, but `retry()` still calls `this.ngOnInit()`. See COMP-P2-008 note and COMP-P3-009 status below.

**Correction after file review:** The current `applicant-applications.component.ts` at FE 20a44c5 shows `retry()` calls `this.ngOnInit()`. The `appsSub` + `ngOnDestroy` cleanup is correctly implemented, which is a meaningful improvement (no subscription leak), but COMP-P3-009 (call private method not ngOnInit) is NOT fully resolved. The retry pattern is lifecycle-safe in practice today, but the naming contract is still violated.

**Revised status: PARTIALLY RESOLVED** — subscription management is correct; the ngOnInit direct-call within retry() remains.

---

## New Findings From This Deployment

### BATCH-P2-001 — Batch endpoint source filter excludes backfill rows
**Severity: P2**
`getApplicantApplicationSnapshotsBatch` queries both tables with `source = 'application_submit'`:
```js
WHERE application_id = ANY($1) AND source = 'application_submit'
```
A backfilled application has `source = 'backfill_current_data'`. For such an application, the batch endpoint returns `{ hasSnapshot: false, completenessScore: null, ... }` even though a completeness_snapshots row exists. The response is internally coherent (hasSnapshot refers only to the application_snapshots table, and a backfill row is not a "real" snapshot in the employer-visible sense) but can be confusing: the applicant sees "Snapshot not available — submitted before completeness tracking" even after a successful backfill.

This is a design decision as much as a bug. The current behavior is intentional per the backfill script's comment ("Employer UI will show 'Snapshot not available' for these applications"). However, the applicant-facing view would benefit from showing backfill completeness data. The batch endpoint should either include `backfill_current_data` rows in the completeness query, or return a separate `isBackfilled: true` flag so the FE can show "Here's your completeness from your current profile" distinctly from a real submission snapshot.

### BACKFILL-P0-001 — No pre-flight DDL check in the backfill script
**Severity: P0 (blocking for prod run)**
The backfill script prints a comment warning ("DO NOT run against production without first verifying tables exist") but does not programmatically check whether the tables exist before starting. If `application_snapshots` does not exist on prod and an operator skips the manual verification, the first `createApplicationSnapshots` call will throw a Postgres relation-not-found error. `Promise.allSettled` will mark each application as "failed" and the script will print "X failed" and exit — but it will have already consumed the initial query (which joins against `application_snapshots` using LEFT JOIN, which itself will fail if the table is missing, crashing the entire `getUnsnapshotedApplications()` call and exiting before any batches run). The crash is not silent, but it is also not a clean pre-flight gate.

**Fix:** Add a `SELECT to_regclass('gethired.application_snapshots')` check at the top of `run()`. If null, print a clear error and `process.exit(1)` before any batches start.

### BACKFILL-P2-001 — No progress resume: crash at batch N restarts from scratch
**Severity: P2**
If the backfill crashes (network partition, OOM, SIGKILL) midway through, rerunning restarts from the beginning. The LEFT JOIN filter (`WHERE aps.id IS NULL AND source = 'backfill_current_data'`) means already-backfilled rows are skipped — so a rerun is safe and produces correct results. However, for a large dataset it is wasteful: all batches before the crash point are re-queried and re-skipped at the application level (the ownership check in the DB is fast but the batching logic still iterates everything).

**This is low risk for the current scale** (unknown application count, but backfill was anticipated before the system went live so the number is bounded). No fix is urgent, but for a large-scale backfill a `--start-after=<last_job_application_id>` flag would allow resuming from a checkpoint.

### BACKFILL-P2-002 — Backfill completeness data not visually distinguished in FE
**Severity: P2**
After the backfill runs, an applicant with a `backfill_current_data` snapshot will see completeness data on "My Applications" — but only if the batch endpoint is updated to include backfill rows (see BATCH-P2-001). As currently shipped, they still see "Snapshot not available." If BATCH-P2-001 is resolved, the FE should distinguish backfill-sourced data with a note like "Score estimated from your current profile — not from the profile you submitted with this application" to avoid misleading applicants into thinking this was their at-submission score.

### SNAP-SHARED-P2-001 — snapshotsLoaded is still a shared flag
**Severity: P2 — partially changed but still shared**
The batch call resolves in a single observable, so `snapshotsLoaded = true` fires once for all rows simultaneously rather than as N separate calls. This is better than the prior forkJoin pattern (one slow call no longer holds all others) — but it is still all-or-nothing: if the batch call is slow, all rows spin together. For a user with 20 applications, all 20 skeletons wait for a single network round-trip. This is acceptable for most cases, but a per-row snapshotsReady Set would allow any UI row whose ID is in the response to reveal immediately (useful if the server streams or if pagination is added). This remains the same structural gap as COMP-P2-008 but with a different failure mode now that the pattern is a single batch call.

---

## Architecture Notes

- The batch endpoint's ownership model (single bulk query, filter by `candidate_id === uid`, silently exclude non-owned IDs) is correct. It avoids both over-fetching and enumeration risk.
- `Promise.allSettled` in the backfill is the right choice: one failing application does not stop the batch.
- The `esm` require shim in the backfill script (`require = require("esm")(module)`) is necessary because `applicationSnapshotService.js` uses ES module syntax. This is not a problem but should be noted: the script depends on the `esm` package being installed. If the BE is ever migrated to native ESM, the shim should be removed.
- The backfill uses `source = 'backfill_current_data'` as the idempotency discriminator. This is clean: the LEFT JOIN filter in `getUnsnapshotedApplications` only skips rows where this specific source exists, so a future real `application_submit` snapshot is never blocked.
- `appsSub` + `ngOnDestroy` in the FE component is the correct subscription management pattern. No subscription leak is possible.

---

## Summary Table

| Item | Previous Status | Current Status |
|------|----------------|----------------|
| SNAP-P0-001 (DDL on prod) | OPEN | STILL OPEN |
| SNAP-P1-002 (backfill script) | OPEN | RESOLVED (script written; not yet run on prod) |
| SNAP-P1-004 (companyId null guard) | OPEN | RESOLVED |
| SNAP-P2-002 (match score divergence) | OPEN | STILL OPEN |
| COMP-P1-005 (batch endpoint) | OPEN | RESOLVED |
| COMP-P1-006 (CTA to profile edit) | OPEN | RESOLVED |
| COMP-P2-007 (fragment anchors) | OPEN | STILL OPEN |
| COMP-P2-008 (shared snapshotsLoaded) | OPEN | STILL OPEN (different failure mode post-batch) |
| COMP-P3-009 (retry calls ngOnInit) | OPEN | PARTIALLY RESOLVED (subscription fixed; ngOnInit call remains) |
| NEW: BACKFILL-P0-001 (no pre-flight DDL check) | — | NEW — P0 (blocks prod backfill run) |
| NEW: BATCH-P2-001 (source filter excludes backfill rows) | — | NEW — P2 |
| NEW: BACKFILL-P2-001 (no resume from crash) | — | NEW — P2 |
| NEW: BACKFILL-P2-002 (backfill data not visually distinguished) | — | NEW — P2 |
| NEW: SNAP-SHARED-P2-001 (snapshotsLoaded still shared) | — | NEW — P2 (updated framing) |
