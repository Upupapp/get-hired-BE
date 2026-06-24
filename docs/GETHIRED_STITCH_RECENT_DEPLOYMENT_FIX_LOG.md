# GETHIRED STITCH — Recent Deployment Fix Log
## Deployment: Batch Snapshot Endpoint (FE 20a44c5 / BE 422d340)
**Date:** 2026-06-24  
**Scope:** `GET /applicant/application/snapshots` integration seams  
**Policy:** Small, safe, additive fixes only. No route renames, no field removals, no auth behavior changes, no DB schema changes, no UI redesign.

---

## Fixes Applied This Pass

**None.**

All five contract seams verified clean. No code changes were required to reach a safe-to-ship state.

---

## Issues Documented (Not Fixed — Outside Scope)

### DEFERRED-1: No FE-side guard on 51+ application IDs

**Seam:** Gate D  
**Severity:** Low (silent degradation, not data loss or security issue)  
**Files:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts`

**Behaviour:** An applicant with 51+ applications triggers a batch request that BE rejects with HTTP 400. The `catchError(() => of({}))` handler catches it gracefully — no crash, no user-visible error — but all completeness badges silently show the "no snapshot" state.

**Why not fixed this pass:** The correct fix is FE-side batching (slice IDs into groups of 50 and merge results), which is outside the small/safe scope of STITCH. An inline slice without the merge would silently drop IDs beyond the first 50, which is worse than the current behaviour.

**Recommended fix (next sprint):**
```ts
// In loadSnapshots(), replace:
this.applicationService.getApplicationSnapshots(ids)

// With a batched approach:
import { forkJoin, of } from 'rxjs';

private chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

private loadSnapshots(): void {
  const ids = this.applications.map(app => app.jobApplicationId).filter(Boolean) as string[];
  if (ids.length === 0) { this.snapshotsLoaded = true; return; }

  const batches = this.chunkArray(ids, 50);
  const requests = batches.map(batch =>
    this.applicationService.getApplicationSnapshots(batch).pipe(
      map((res: any) => res?.data?.snapshots ?? {}),
      catchError(() => of({})),
    )
  );

  forkJoin(requests).subscribe((results: Record<string, any>[]) => {
    results.forEach(snapshots =>
      Object.entries(snapshots).forEach(([id, data]) => this.snapshotsMap.set(id, data))
    );
    this.snapshotsLoaded = true;
  });
}
```

---

### DEFERRED-2: successMessage singleton mutation (tech debt, not a bug)

**Seam:** Gate B (cross-cutting)  
**Severity:** Tech debt — not a current bug  
**Files:** `get-hired-BE/helpers/status.js`, all 15 controllers (124 mutation sites)

**Behaviour:** `successMessage` and `errorMessage` are module-level singletons mutated before every `res.send()`. In current code there is no `await` between mutation and send, so Node's single-threaded event loop prevents races. The risk is latent: a future refactor with an `await` between mutation and send could corrupt concurrent responses.

**Why not fixed this pass:** 124 occurrences across 15 controllers — a mechanical refactor beyond the scope of a single deployment STITCH pass.

**Recommended fix:** Replace singleton mutation with inline response objects:
```js
// Instead of:
successMessage.data = { snapshots };
return res.status(status.success).send(successMessage);

// Use:
return res.status(200).json({ status: "success", data: { snapshots } });
```

---

## Fixes Forbidden (Policy Reminder)

The following were not applied and must not be applied without an explicit feature ticket:

- Route renames or path changes
- Removing or renaming response fields (`hasSnapshot`, `completenessScore`, etc.)
- Changing auth middleware or ownership rules
- DB schema changes
- UI redesign or template restructuring
- Raising or removing the max-50 cap without FE batching in place
