# GetHired — Application Completeness Data Loading Log V2

**Date:** 2026-06-24  
**Phase:** 13

---

## Loading Architecture

### Sequence
1. `ngOnInit()` → calls `loadData()` (not ngOnInit directly)
2. `loadData()` → `getMyApplications()` → on success, calls `loadSnapshots()`
3. `loadSnapshots()` → chunks IDs by 50 → `forkJoin(batchRequests)` → merges into `snapshotsMap`
4. Cards render from `snapshotsMap` data — no additional requests on expand

### Subscriptions
| Sub | Variable | Cleaned up |
|-----|----------|------------|
| Applications list | `appsSub` | ngOnDestroy + retry |
| Snapshots batch | `snapshotsSub` | ngOnDestroy + retry + onSnapshotRetry |

### Error Handling
- App list error → `this.error = true` → full error state
- Snapshot batch error (per chunk) → `catchError(() => of({}))` → partial data (silent, no entry for failed IDs)
- Snapshot batch error (forkJoin-level) → `snapshotsError = true` → card error state + retry

Note: Per-chunk catchError means a partial batch failure silently shows "Unavailable" for affected IDs rather than failing the whole page.

### Retry Logic
- `retry()` — full reset: clears appsSub, snapshotsSub, map, flags, calls `loadData()`
- `onSnapshotRetry()` — partial reset: clears snapshotsSub, map, flags, calls `loadSnapshots()` only (preserves the app list)

### Data Flow to Components

```
applicant-applications.component
  ↓ snapshotsMap (Map<id, snapshot>)
  ↓ snapshotFor(id) → snapshot | null
  ↓
[list row]
  app-application-completeness-badge
    inputs: level, score, loading  ← computed from snapshotFor()

[expanded row]
  app-application-completeness-card
    inputs: snapshot, loading, error  ← snapshotFor(), !snapshotsLoaded, snapshotsError
```

### Memory / Performance
- `snapshotsMap` held in component instance, garbage-collected on destroy
- No cache between navigations (intentional — data freshness > memory persistence)
- forkJoin: all batch requests complete before `snapshotsLoaded = true`; partial results not shown incrementally (acceptable for typical 1-3 application count)
