# GETHIRED SWEEP — RECENT DEPLOYMENT
**Date:** 2026-06-24
**BE commit:** 422d340 | **FE commit:** 20a44c5
**Scope:** applicationSnapshotService.js (companyId guard), applicationController.js (batch endpoint), applicationRoute.js (new route), backfill_application_snapshots.js (new script), application.service.ts, applicant-applications.component.ts/.html/.scss

---

## Executive Summary

**What shipped:**
- A companyId null guard in `createApplicationSnapshots` that prevents silent INSERT failures when companyId is missing.
- A new batch endpoint `GET /applicant/application/snapshots` that returns completeness + hasSnapshot data for up to 50 application IDs in 3 DB queries (down from N×3).
- A one-shot backfill script that processes pre-deployment applications in batches of 10 with dry-run mode.
- FE applicant-applications view now calls the batch endpoint instead of forkJoin-ing N individual requests, adds a loading skeleton, a fade-in reveal, missing-item tips, and an "Update your profile →" CTA.

**Overall quality:** Good — the core logic is correct, the design invariants (ON CONFLICT DO NOTHING, best-effort, ownership check before data access) are upheld. There are no critical security holes in the new code. Three medium/high issues exist around subscription leak, the "already backfilled" check gap, and the max-50 enforcement not being applied on the FE side.

---

### Top 5 Risks

| # | Risk | Severity |
|---|------|----------|
| 1 | `loadSnapshots()` subscribes to a second Observable that is never stored and never unsubscribed — subscription leak on every ngOnDestroy and every `retry()` | HIGH |
| 2 | Backfill "already backfilled" check (`aps.source = 'backfill_current_data'`) filters on source alone — an application with a real `application_submit` snapshot has no backfill row, so it will still be queued for backfill and a second completeness row with `source='backfill_current_data'` may be written | MEDIUM |
| 3 | FE `loadSnapshots()` sends all application IDs without slicing to 50 — BE rejects with 400 if the user has more than 50 applications | MEDIUM |
| 4 | Batch endpoint `hasSnapshot` query filters `source = 'application_submit'` only — backfilled applications will always show `hasSnapshot: false` even after the backfill runs successfully | MEDIUM |
| 5 | `retry()` calls `this.ngOnInit()` directly — Angular lifecycle hooks are framework-managed; calling them manually is a code smell and risks double-subscription | LOW |

### Top 5 Strengths

| # | Strength |
|---|---------|
| 1 | companyId guard placed at the right entry point (before any DB work) and returns the structured `result` object so callers never see a thrown exception |
| 2 | Batch endpoint reduces N×3 queries to exactly 3 queries regardless of list size — correct O(1) DB scaling |
| 3 | Single ownership check query covers all supplied IDs at once; silently excludes non-owned IDs rather than erroring, which is correct for the "stale ID" case |
| 4 | Backfill script has dry-run mode, batches of 10 with 500ms delay, ON CONFLICT DO NOTHING, and source tagging — minimal risk of production damage |
| 5 | FE skeleton loading state matches the shape of the revealed content (3 elements: line, badge row, short line) — prevents layout shift on load |

---

## §1 Batch Endpoint Design

**URL:** `GET /applicant/application/snapshots?applicationIds=id1,id2,...`

**Auth:** Correct. Route is registered with `verifyAuth` middleware. The controller extracts `uid` from `req.user` (set by Firebase token verification). No path to reach the handler unauthenticated.

**Request parsing:**
```js
const applicationIds = String(raw).split(",").map(s => s.trim()).filter(Boolean);
```
`String(raw)` defends against array injection (e.g., `?applicationIds[]=a&applicationIds[]=b` would produce `["a","b"]` in Express without the coerce, which `.split(",")` on an array would concatenate — `String()` normalises it to `"a,b"`). `.filter(Boolean)` removes empty strings. This is correct.

Edge case — all-empty input: `?applicationIds=,,` produces an empty array after filter, correctly rejected with 400.

**Ownership check correctness:**
```js
const verifiedIds = appRows.filter(row => row.candidate_id === uid).map(row => row.job_application_id);
```
Correct. IDs not belonging to the caller are silently dropped. An attacker supplying someone else's IDs gets `{}` for those entries — no data leakage, no enumeration oracle.

If `verifiedIds.length === 0`, returns HTTP 200 `{ snapshots: {} }` — intentional, documented in comment.

**Batch query efficiency:** Two queries regardless of list size — `application_snapshots` (just `application_id`), `application_completeness_snapshots` (score, levels, tips). Match snapshot deliberately excluded (not needed for the applicant tips view). Correct.

**Response shape:**
```json
{
  "success": true,
  "data": {
    "snapshots": {
      "<applicationId>": {
        "hasSnapshot": true,
        "completenessScore": 73,
        "completenessLevel": "strong",
        "missingRequired": [...],
        "missingRecommended": [...],
        "disclaimerNote": "...",
        "privacyNote": "..."
      }
    }
  }
}
```
Shape is correct and consistent with the existing `successMessage` envelope pattern.

**Max-50 guard:**
```js
if (applicationIds.length === 0 || applicationIds.length > 50) {
```
Correct: 1–50 inclusive accepted, 0 or 51+ rejected with 400. Error message matches.

**FINDING 1.1 (LOW):** When `verifiedIds.length === 0` the response is `{ snapshots: {} }` with no indication of how many supplied IDs were rejected. Consider adding `verifiedCount` and `requestedCount` to the response to aid debugging when callers get unexpectedly empty results.

---

## §2 companyId Guard

**Location:** `createApplicationSnapshots()` in `applicationSnapshotService.js`, lines 517–520:
```js
if (!companyId) {
  console.warn("[applicationSnapshot] skipped: companyId is missing for applicationId", applicationId);
  return result;
}
```

**Placement correctness:** Fires before `appplicantProfile()` and `jobDetails()` are fetched, and before all three persist calls. This is the right place — earlier than needed is better than later.

**Coverage of all 3 snapshot types:** Yes. The guard returns `result` (the structured summary object) before the three try/catch persist blocks. All three snapshot types are skipped when companyId is missing.

**Log message quality:** Good. Uses `console.warn` (not `console.error` — correct, since this is a data-quality skip, not a code fault). Includes the service file tag and logs `applicationId` for tracing. Could optionally also log `applicantId` and `jobId` for richer cross-referencing.

**FINDING 2.1 (LOW):** The condition `!companyId` catches `null`, `undefined`, `""`, and `0`. In practice companyId is a UUID string so `0` will never appear, but the guard could be made explicit (`companyId == null || companyId === ''`) for self-documentation.

---

## §3 Backfill Script

### Safety mechanisms

| Mechanism | Implementation | Assessment |
|-----------|---------------|------------|
| Dry-run mode | `--dry-run` flag, returns early with `{status: "dry-run"}`, no writes | Correct |
| ON CONFLICT DO NOTHING | Delegated to `createApplicationSnapshots` which uses it on all 3 INSERT statements | Correct |
| Batch + delay | `BATCH_SIZE = 10`, `BATCH_DELAY_MS = 500ms`, `await sleep()` between batches | Correct |
| Source scoping | `source: "backfill_current_data"` passed throughout | Correct |
| Fire-and-forget per item | `Promise.allSettled()` — one failure does not stop the batch | Correct |
| Limit flag | `--limit=N` processed before query | Correct |
| Table existence check | Documented in header comment only, not enforced in code | See R-06 |

**FINDING 3.1 (MEDIUM — "Already backfilled" check gap):**

The `getUnsnapshotedApplications()` query:
```sql
LEFT JOIN application_snapshots aps
  ON aps.application_id = ja.job_application_id
  AND aps.source = 'backfill_current_data'
WHERE aps.id IS NULL
```
This identifies applications with no backfill row. However, an application that already has a real-time `source='application_submit'` snapshot will satisfy `aps.id IS NULL` (no backfill row exists yet) and will be included in the backfill batch.

At INSERT time, the `application_snapshots` ON CONFLICT will silently skip the duplicate. But `application_completeness_snapshots` and `match_snapshots` may not have a unique index covering both `application_id` AND `source`. If they don't, a second row with `source='backfill_current_data'` will be written alongside the real submission-time row. The retrieval helpers use `ORDER BY created_at DESC LIMIT 1` — a backfill row written later would shadow the real submission-time record.

**Recommended fix:** Change the JOIN condition to exclude any application that already has ANY snapshot row regardless of source:
```sql
LEFT JOIN application_snapshots aps ON aps.application_id = ja.job_application_id
WHERE aps.id IS NULL
```

**FINDING 3.2 (LOW):** No runtime preflight check that tables exist. If `application_snapshots` is missing, the query at `getUnsnapshotedApplications()` will throw and `process.exit(1)` will fire cleanly. However, if the table exists but `application_completeness_snapshots` does not, the main query succeeds, the batch begins, and each individual application fails silently (logged as partial). Consider adding a preflight `SELECT to_regclass(...)` check for all three tables at startup.

**Note on current-vs-submission profile:** Documented clearly in the script header. The `source='backfill_current_data'` tag propagates into `provenance_json`. The batch endpoint intentionally filters `source = 'application_submit'` for `hasSnapshot`, so backfilled applications correctly show `hasSnapshot: false`. The completeness tips still work because `application_completeness_snapshots` is fetched separately. This two-tier treatment is the right design.

---

## §4 FE Integration

### Response shape alignment

BE sends (wrapped in `successMessage`):
```json
{ "success": true, "data": { "snapshots": { "<id>": { "hasSnapshot": ..., ... } } } }
```

FE extracts:
```ts
map((res: any) => res?.data?.snapshots ?? {})
```
Correctly unwraps `res.data.snapshots`. Optional chaining means a null/undefined response degrades to `{}` rather than throwing.

**snapshotsMap population:**
```ts
Object.entries(snapshots).forEach(([id, data]) => this.snapshotsMap.set(id, data));
```
`Object.entries({})` returns `[]` — empty response is a no-op. Entries are keyed by application ID string, matching how `snapshotFor()` looks them up.

**`snapshotFor()` correctness:**
```ts
snapshotFor(applicationId: string): any {
  return this.snapshotsMap.get(applicationId) ?? null;
}
```
Returns `null` when ID not in map. Template uses `*ngIf="snapshotFor(app.jobApplicationId) as snap; else snapSilent"` — null is falsy, so Angular falls through to `#snapSilent`. Correct.

**FINDING 4.1 (MEDIUM):** `loadSnapshots()` sends all IDs without capping at 50:
```ts
const ids = this.applications.map(app => app.jobApplicationId).filter(Boolean) as string[];
```
If `applications.length > 50`, the BE returns 400 and the `catchError(() => of({}))` swallows it, leaving every card in the "Snapshot unavailable right now." state. Fix: add `.slice(0, 50)`.

**FINDING 4.2 (LOW):** `snapshotFor()` is called from `*ngFor` template bindings, meaning it is called on every change-detection cycle for every row. `Map.get()` is O(1) so this is acceptable for typical list sizes, but if the applications list grows or the component becomes more interactive, pre-computing a map keyed by applicationId outside the template is the safer pattern.

---

## §5 Subscription Management

**Primary subscription (`appsSub`) — correctly managed:**
```ts
private appsSub: Subscription | null = null;
// assigned in ngOnInit, unsubscribed in both ngOnDestroy and retry()
```

**FINDING 5.1 (HIGH — Subscription leak):**
`loadSnapshots()` creates a second subscription that is never tracked:
```ts
this.applicationService.getApplicationSnapshots(ids).pipe(
  map(...),
  catchError(...),
).subscribe((snapshots) => {
  Object.entries(snapshots).forEach(([id, data]) => this.snapshotsMap.set(id, data));
  this.snapshotsLoaded = true;
});
```
This subscription is not stored. If the user navigates away while the HTTP request is in-flight:
1. `ngOnDestroy` fires and unsubscribes only `appsSub`.
2. The HTTP request completes and the callback fires on a destroyed component instance.
3. `this.snapshotsMap.set(...)` and `this.snapshotsLoaded = true` mutate a dead object.
4. If Angular's CD is still partially alive (e.g., in a route transition), this can produce `ExpressionChangedAfterItHasBeenCheckedError`.

Additionally, `retry()` calls `ngOnInit()` which calls `loadSnapshots()` again. If the previous snapshot request is still in-flight, two untracked subscriptions are now racing to populate `snapshotsMap`, and `snapshotsLoaded` can be set `true` from the stale first response before the retry's response arrives.

**Fix:**
```ts
private appsSub: Subscription | null = null;
private snapSub: Subscription | null = null;

private loadSnapshots(): void {
  // ...
  this.snapSub = this.applicationService.getApplicationSnapshots(ids).pipe(
    map((res: any) => res?.data?.snapshots ?? {}),
    catchError(() => of({})),
  ).subscribe((snapshots: Record<string, any>) => {
    Object.entries(snapshots).forEach(([id, data]) => this.snapshotsMap.set(id, data));
    this.snapshotsLoaded = true;
  });
}

retry(): void {
  this.appsSub?.unsubscribe();
  this.snapSub?.unsubscribe();
  this.loading = true;
  this.error = false;
  this.snapshotsMap.clear();
  this.snapshotsLoaded = false;
  this.ngOnInit();
}

ngOnDestroy(): void {
  this.appsSub?.unsubscribe();
  this.snapSub?.unsubscribe();
}
```

**FINDING 5.2 (LOW):** `retry()` calls `this.ngOnInit()` directly. Angular lifecycle hooks are framework-managed; calling them manually is a code smell. Better pattern: extract the load logic into a private `loadApplications()` method, call it from both `ngOnInit()` and `retry()`.

---

## §6 "Update your profile" CTA

**Markup:**
```html
<a class="app-snapshot-cta" routerLink="/user/profile/edit">Update your profile →</a>
```

**routerLink correctness:** The path `/user/profile/edit` needs to match an actual route in the Angular router config. If the profile edit route is at a different path (e.g., `/applicant/profile/edit`), this navigates silently to the default/404 route. Requires verification against `app-routing.module.ts` before release.

**Accessibility:**
- Link text "Update your profile →" is descriptive and meaningful — screen reader friendly.
- Correct element type (`<a>` for navigation, not `<button>`).
- The arrow `→` is a Unicode character; some screen readers will read it as "rightwards arrow" or "right arrow". Wrapping in `<span aria-hidden="true">` suppresses this if the arrow is decorative.
- No redundant `aria-label` needed given the descriptive text.

**Placement:** Inside `.app-snapshot-tips--required`, shown only when `snap.missingRequired?.length > 0`. Contextually correct — the CTA appears only when there are actionable gaps. The recommended tips block has no CTA, which is correct (recommended items are optional).

**FINDING 6.1 (LOW):** The `→` arrow will be announced by some screen readers. Wrap in `<span aria-hidden="true">→</span>` if this is undesirable.

**FINDING 6.2 (LOW):** `routerLink="/user/profile/edit"` is hardcoded with no compile-time check. Verify the route exists in the router config before production release.

---

## §7 Risk Register

| ID | Area | Severity | Description | Fix Required |
|----|------|----------|-------------|--------------|
| R-01 | FE Subscription | HIGH | `loadSnapshots()` subscription never stored/unsubscribed — leak on navigate-away, race condition on `retry()` | Store as `snapSub`, unsubscribe in `ngOnDestroy` and `retry()` |
| R-02 | Backfill Script | MEDIUM | "Already backfilled" check only excludes `source='backfill_current_data'` rows — real `application_submit` snapshots don't block the backfill, risking a shadow completeness row that overwrites the real one on retrieval | Broaden JOIN to exclude any existing snapshot row regardless of source |
| R-03 | FE Batch Size | MEDIUM | `loadSnapshots()` sends all IDs without slicing to 50 — BE returns 400, swallowed by `catchError`, all snapshot cards show "unavailable" for users with >50 applications | Add `.slice(0, 50)` |
| R-04 | Batch Endpoint | MEDIUM | `hasSnapshot` query filters `source = 'application_submit'` only — backfilled applications always show `hasSnapshot: false` even after a successful backfill run | Clarify intentional or include `'backfill_current_data'` in the IN list |
| R-05 | FE Lifecycle | LOW | `retry()` calls `this.ngOnInit()` directly — bad Angular pattern | Extract to `private loadApplications()` |
| R-06 | Backfill Script | LOW | No runtime preflight check that all 3 snapshot tables exist | Add `SELECT to_regclass(...)` checks at startup |
| R-07 | companyId Guard | LOW | `!companyId` matches `0` as well as null/undefined/empty string | Change to `companyId == null \|\| companyId === ''` |
| R-08 | CTA Accessibility | LOW | Arrow `→` in CTA text announced by some screen readers | Wrap in `<span aria-hidden="true">` |
| R-09 | CTA Route | LOW | `routerLink="/user/profile/edit"` unverified against actual router config | Verify route in `app-routing.module.ts` |
| R-10 | Batch Response | LOW | Empty `verifiedIds` returns `{ snapshots: {} }` with no count metadata — opaque for debugging | Add `verifiedCount` / `requestedCount` to response |

**Critical risks: 0**
**High risks: 1 (R-01)**
**Medium risks: 3 (R-02, R-03, R-04)**
**Low risks: 6 (R-05 through R-10)**

---

## §8 Opportunity Register

| ID | Area | Opportunity |
|----|------|------------|
| O-01 | FE Performance | Pre-compute a keyed lookup object aligned with `applications` array once in `loadSnapshots()` rather than calling `snapshotFor()` (function call) from the template on every CD cycle |
| O-02 | Backfill Script | Add `--offset=N` flag to allow resuming a partial backfill from a specific starting position without re-processing already-completed applications |
| O-03 | Batch Endpoint | Return `requestedCount`, `verifiedCount`, `foundCount` alongside `snapshots` map for easier client debugging and analytics |
| O-04 | Backfill Script | Add `--application-id=<id>` flag for one-off targeted backfills of a specific application (useful for support or debugging) |
| O-05 | FE UX | "Update your profile →" CTA links to profile edit root — consider deep-linking to the specific missing section (e.g., `/user/profile/edit#work-experience`) to reduce friction |
| O-06 | BE Logging | `getApplicantApplicationSnapshotsBatch` logs on error but does not log requested vs verified count — adding that improves observability |
| O-07 | FE Accessibility | Completeness score percentage (`{{ snap.completenessScore }}%`) has no contextual `aria-label` — consider `aria-label="{{ snap.completenessScore }}% application completeness"` on the containing element |
| O-08 | Backfill Script | Add to final summary the count of applications that were skipped because a real `application_submit` row already existed, to distinguish "nothing written because already covered" from "nothing written because no applications found" |

---

*Generated by SWEEP RECENT DEPLOYMENT — GetHired, 2026-06-24*
