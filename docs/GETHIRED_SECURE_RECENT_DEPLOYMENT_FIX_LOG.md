# GETHIRED SECURE — Fix Log (Recent Deployment: Batch Snapshot Endpoint)
**Date:** 2026-06-24
**Deployment:** FE 20a44c5, BE 422d340

---

## Fix 1 — Explicit type guard on `raw` query param (P1, RR-04)

**File:** `controllers/applicationController.js` — `getApplicantApplicationSnapshotsBatch`

**Before:**
```js
const applicationIds = String(raw).split(",").map(s => s.trim()).filter(Boolean);
```

**After:**
```js
const rawStr = Array.isArray(raw) ? raw.join(',') : (typeof raw === 'string' ? raw : '');
const applicationIds = rawStr.split(",").map(s => s.trim()).filter(Boolean);
```

**Why:** Express query-string parsing produces Array for repeated params (`?applicationIds=a&applicationIds=b`) and a plain object for nested params (`?applicationIds[foo]=bar`). The original `String(raw)` on an Array accidentally works (`String(['a','b'])` = `"a,b"`), but on a plain object produces `"[object Object]"` — one bogus token passes `filter(Boolean)` and reaches the DB ownership check (no real breach, but semantically wrong and noisy). The explicit guard makes the behavior intentional and rejects plain objects cleanly via the `length === 0` check that follows.

---

## Fix 2 — Backfill script: startup env log + --confirm gate (P1, RR-05)

**File:** `scripts/backfill_application_snapshots.js`

**Added:**
```js
const CONFIRM = process.argv.includes("--confirm");
```

In `run()`, before any DB access:
```js
console.log(`  DB host:     ${env.host || "(not set)"}`);
console.log(`  DB database: ${env.database || "(not set)"}`);
console.log(`  DB schema:   ${dbSchema || "(not set)"}`);

if (!DRY_RUN && !CONFIRM) {
  console.error("\n[ABORT] Live run requires --confirm flag to prevent accidental production writes.");
  console.error("  Add --confirm to proceed, or --dry-run to preview without writing.");
  process.exit(1);
}
```

**Why:** The script reads from whichever `.env` is loaded. Without a startup log or confirmation gate, a developer running it from a prod server context has no signal that they are about to write to production. The `--confirm` flag (opt-in, not opt-out) plus the DB host/schema log gives a clear "am I on the right environment?" moment before any write occurs. `--dry-run` is unaffected (no `--confirm` needed for dry-run mode).

---

## Fix 3 — FE chunks >50 IDs via forkJoin (P1, RR-02)

**File:** `src/app/applicant-panel/applicant-applications/applicant-applications.component.ts`

**Before:** `loadSnapshots()` called `getApplicationSnapshots(ids)` with the full array. If `ids.length > 50`, the BE returned HTTP 400 and `catchError(() => of({}))` silently gave every application a null completeness score.

**After:** `loadSnapshots()` slices `ids` into chunks of 50, maps each chunk to a `getApplicationSnapshots(chunk)` call (with `catchError`), fans them out via `forkJoin`, and merges all returned snapshot maps into `snapshotsMap`.

```ts
import { forkJoin } from 'rxjs';   // added to imports

private loadSnapshots(): void {
  const ids = ...;
  const BATCH_LIMIT = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
    chunks.push(ids.slice(i, i + BATCH_LIMIT));
  }
  const batchRequests = chunks.map(chunk =>
    this.applicationService.getApplicationSnapshots(chunk).pipe(
      map((res: any) => res?.data?.snapshots ?? {}),
      catchError(() => of({} as Record<string, any>)),
    )
  );
  this.snapshotsSub = forkJoin(batchRequests).subscribe((results) => {
    results.forEach(snapshots =>
      Object.entries(snapshots).forEach(([id, data]) => this.snapshotsMap.set(id, data))
    );
    this.snapshotsLoaded = true;
  });
}
```

**Why:** A user with 51+ applications would see all completeness tiles blank with no error — a silent data-loss bug. Chunking ensures the feature works for power users.

---

## Non-fix observations (no code change needed)

| Item | Reason not fixed |
|------|-----------------|
| No rate limiting (RR-01) | Repo-wide architectural gap; adding `express-rate-limit` to this route alone is inconsistent. Logged for a dedicated rate-limiting pass. |
| Subscription leak on retry (RR-03) | Already fixed in the prior deployment pass — the component already has `snapshotsSub?.unsubscribe()` in both `retry()` and `ngOnDestroy()`. |
| companyId falsy guard (Gate F) | Correct for UUID/string company IDs; no fix needed. |
| Max-50 bypass via %2C (Gate D) | Express decodes before controller; bypass is impossible. No fix needed. |
