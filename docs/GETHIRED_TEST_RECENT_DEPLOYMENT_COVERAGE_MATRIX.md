# GETHIRED_TEST_RECENT_DEPLOYMENT_COVERAGE_MATRIX

**Deployment:** FE 20a44c5 / BE 422d340  
**Date:** 2026-06-24  

---

## Legend

| Symbol | Meaning |
|---|---|
| PASS | Code path confirmed correct by static analysis |
| FAIL | Bug or incorrect behaviour found |
| UNKNOWN | Cannot verify without live DB or build execution |
| N/A | Test case not applicable to this deployment |

---

## Batch Endpoint Tests

| # | Test case | Expected | Actual / Code Evidence | Verdict |
|---|---|---|---|---|
| B-1 | Empty `applicationIds` param (absent) | 400 | `if (!raw) → status.bad` | PASS |
| B-2 | More than 50 IDs | 400 | `applicationIds.length > 50 → status.bad` | PASS |
| B-3 | Comma-separated IDs parsed correctly | Array of trimmed, non-empty strings | `String(raw).split(",").map(s=>s.trim()).filter(Boolean)` | PASS |
| B-4 | IDs belonging to another applicant | Excluded from response (not 403) | `appRows.filter(row => row.candidate_id === uid)` — unowned rows filtered out; result still 200 | PASS |
| B-5 | Mix of owned + unowned IDs | Only owned returned | Same filter as B-4; `verifiedIds` contains only caller-owned IDs | PASS |
| B-6 | IDs with no snapshot row | `hasSnapshot: false` | `snapshotSet.has(id)` → false when ID absent from `application_snapshots` query result | PASS |
| B-7 | IDs with snapshot but no completeness row | `hasSnapshot: true, score: null` | `snapshotSet.has(id)` → true; `comp = completenessMap[id] \|\| null` → null; `completenessScore: null` | PASS |

---

## companyId Guard Tests

| # | Test case | Expected | Actual / Code Evidence | Verdict |
|---|---|---|---|---|
| C-1 | `null` companyId | Returns early, no INSERT attempted | `if (!companyId) { console.warn(...); return result; }` — before all persist calls | PASS |
| C-2 | `undefined` companyId | Returns early | Same `!companyId` guard covers undefined | PASS |
| C-3 | Valid companyId | Continues normally to profile/job fetch and persist | Guard not triggered; execution reaches `appplicantProfile` and `jobDetails` calls | PASS |

---

## Backfill Script Tests

| # | Test case | Expected | Actual / Code Evidence | Verdict |
|---|---|---|---|---|
| BS-1 | `--dry-run` flag set | No DB writes | `if (DRY_RUN) { return { status: "dry-run" } }` — `createApplicationSnapshots` never called | PASS |
| BS-2 | Already-backfilled rows | Skipped (not re-processed) | LEFT JOIN on `application_snapshots WHERE source='backfill_current_data'` + `WHERE aps.id IS NULL` excludes existing rows | PASS |
| BS-3 | One row fails in batch | Does not stop remaining rows | `Promise.allSettled` — each row isolated | PASS |
| BS-4 | Re-run after full backfill | No-op | `getUnsnapshotedApplications` returns 0 rows → "Nothing to do." exit | PASS |

---

## FE Response Shape Tests

| # | Test case | Expected | Actual / Code Evidence | Verdict |
|---|---|---|---|---|
| E-1 | Batch response shape `{data: {snapshots: {id: {...}}}}` | `snapshotsMap` populated correctly | `map((res: any) => res?.data?.snapshots ?? {})` → `Object.entries(snapshots).forEach(([id, data]) => snapshotsMap.set(id, data))` | PASS |
| E-2 | Batch 200 with empty snapshots object `{}` | `snapshotsLoaded=true`, all rows show `#snapSilent` | `Object.entries({})` iterates 0 times; `snapshotsLoaded = true` at end of subscribe; template shows `#snapSilent` fallback | PASS |
| E-3 | Batch call throws | `catchError → of({}) → snapshotsLoaded=true`, graceful | `catchError(() => of({}))` returns `{}` (bypasses map); subscribe receives `{}`; `Object.entries({})` = 0; `snapshotsLoaded=true` | PASS (with caveat — see F-01 in report: `of({})` bypasses `map`, coincidentally produces same result but is pipe-order fragile) |

---

## FE Subscription Lifecycle Tests

| # | Test case | Expected | Actual / Code Evidence | Verdict |
|---|---|---|---|---|
| L-1 | `ngOnDestroy` unsubscribes `appsSub` | No leaked subscription from `getMyApplications` | `this.appsSub?.unsubscribe()` in `ngOnDestroy` | PASS |
| L-2 | `retry()` unsubscribes before reload | No double subscription | `this.appsSub?.unsubscribe()` called before `this.ngOnInit()` which reassigns `appsSub` | PASS |
| L-3 | `loadSnapshots` subscribe lifecycle | Safe for HTTP; not tracked | Inline `.subscribe()` not assigned; HTTP observable completes on response so no leak in practice | PASS (HTTP), UNKNOWN (non-HTTP sources) |

---

## Total

| Status | Count |
|---|---|
| PASS | 16 |
| FAIL | 0 |
| UNKNOWN | 1 (L-3 for non-HTTP sources — not a current risk) |
| N/A | 0 |
