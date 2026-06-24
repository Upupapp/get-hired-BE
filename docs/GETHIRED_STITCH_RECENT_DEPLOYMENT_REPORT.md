# GETHIRED STITCH — Recent Deployment Report
_Scoped to FE HEAD 5ab9a05 / BE applicationController.js snapshot+batch endpoints_
_Generated: 2026-06-24_

---

## Scope

Two new API call patterns deployed:

| Pattern | FE Method | Endpoint | FE Read Path |
|---|---|---|---|
| Batch (list) | `getApplicationSnapshots(ids[])` | `GET /applicant/application/snapshots?applicationIds=…` | `res?.data?.snapshots ?? {}` |
| Single (detail) | `getApplicationSnapshot(applicationId)` | `GET /applicant/application/snapshot?applicationId=…` | `res?.data ?? null` |

---

## Seam-by-Seam Findings

### Seam 1 — Single endpoint response shape vs FE consumption (Gate B)

**BE sends (applicationController.js line 86–98):**
```js
successMessage.data = {
  applicationId,
  hasSnapshot: !!snap,
  snapshotCreatedAt: snap ? snap.created_at : null,
  completenessScore: comp ? comp.completeness_score : null,
  completenessLevel: comp ? comp.completeness_level : null,
  completedSections: comp ? comp.completed_sections : null,
  missingRequired: comp ? comp.missing_required : null,
  missingRecommended: comp ? comp.missing_recommended : null,
  disclaimerNote: "...",
  privacyNote: "...",
};
return res.status(200).send(successMessage);
// => { status: "success", data: { applicationId, hasSnapshot, snapshotCreatedAt, ... } }
```

`successMessage` is the shared singleton `{ status: "success" }` from `helpers/status.js`. After mutation: `{ status: "success", data: { ... } }`.

**FE reads (applicant-application-detail.component.ts line 54):**
```ts
map((res: any) => res?.data ?? null)
```
`res.data` resolves to the full inner object `{ applicationId, hasSnapshot, snapshotCreatedAt, ... }`.

**Result: MATCH.** FE correctly unwraps the single level of wrapping. `this.snapshot` receives the flat data object.

---

### Seam 2 — `snapshotCreatedAt` path in card template (Gate B continued)

**Card template (application-completeness-card.component.html line 39):**
```html
<span class="acdc-timestamp" *ngIf="snapshot.snapshotCreatedAt">
  Captured {{ snapshot.snapshotCreatedAt | date:'mediumDate' }}
</span>
```

`this.snapshot` = `res.data` = `{ snapshotCreatedAt: snap?.created_at, ... }`. So `snapshot.snapshotCreatedAt` is at depth 1 — correct.

**Result: CORRECT.** The `snapshotCreatedAt` field is present at the right level. The batch endpoint does NOT include `snapshotCreatedAt` (by design — list card shows badge only, not timestamp). The detail view is the only consumer of this field, and it uses the single endpoint which includes it. No mismatch.

---

### Seam 3 — `null?.length > 0` guard in Angular template (Gate C)

**Card template (line 83):**
```html
*ngIf="snapshot.missingRequired?.length > 0"
```

**Batch BE response (applicationController.js line 239):**
```js
missingRequired: comp ? comp.missing_required : null,
```
When no completeness row exists: `comp = null` → `missingRequired = null`.
When rows exist but field is empty: `comp.missing_required` may be `null` or `[]`.

**Angular evaluation chain:**
- `null?.length` → `undefined` (optional chain short-circuits)
- `undefined > 0` → `false` (JS coerces undefined to NaN; NaN > 0 is false)
- Result: `*ngIf` is `false` → section hidden. Correct behavior.

Same chain applies to `missingRecommended?.length > 0`.

The `isComplete` getter in the TS component (line 79) uses `!this.snapshot.missingRequired?.length` which is `!undefined` = `true` when null — also correct.

**Result: SAFE.** Null is handled correctly by optional chaining in both the template and the component getter.

---

### Seam 4 — Route order: `applications` before `applications/:id` (Gate D)

**applicant-panel.module.ts lines 52–58:**
```ts
{
  path: 'applications',
  component: ApplicantApplicationsComponent,
},
{
  path: 'applications/:id',
  component: ApplicantApplicationDetailComponent,
},
```

Angular's router uses first-match wins within a `children` array. However, `applications` (exact match) and `applications/:id` (parameterized) are not in conflict for any actual URL:

- `/user/applications` → matches `applications` (no trailing segment) → correct
- `/user/applications/some-uuid` → does NOT match `applications` (different segment count); matches `applications/:id` → correct

Angular does not shadow parameterized routes with exact siblings because it matches path segments independently. The default `pathMatch` is `'prefix'` but `applications` only matches when there is no further segment (the child router strips the parent prefix). No shadow exists.

**Result: SAFE.** Route order is not a concern here. Both routes resolve independently regardless of declaration order.

---

### Seam 5 — `applicationId` flow to card analytics in both contexts (Gate E)

**List context (applicant-applications.component.html line 54):**
```html
[applicationId]="app.jobApplicationId"
```
Source: `app.jobApplicationId` from the `getMyApplications()` response array.

**Detail context (applicant-application-detail.component.html line 23):**
```html
[applicationId]="applicationId"
```
Source: `this.applicationId` set from `this.route.snapshot.paramMap.get('id')` (line 34 of detail component TS).

The route param `:id` is populated from `[routerLink]="['/user/applications', app.jobApplicationId]"` in the list template (line 59 of list HTML). So both paths originate from the same `app.jobApplicationId` value.

**Card component (application-completeness-card.component.ts lines 55–58):**
```ts
onCtaClick(label: string): void {
  if (this.applicationId) {
    this.analytics.trackApplicationCompletenessCtaClicked(this.applicationId, label);
  }
}
```
Guard `if (this.applicationId)` prevents analytics call with empty string (safe for both contexts before data loads).

**Result: CORRECT.** Both contexts deliver the same UUID to the card's `applicationId` input. Analytics fires with a valid, consistent ID in both list and detail views.

---

## Batch Response Shape Verification (Gate A)

**BE sends (applicationController.js line 246):**
```js
successMessage.data = { snapshots };
// => { status: "success", data: { snapshots: { [applicationId]: { hasSnapshot, completenessScore, ... } } } }
```

**FE reads (applicant-applications.component.ts line 77):**
```ts
map((res: any) => res?.data?.snapshots ?? {})
```

`res.data.snapshots` resolves to the keyed map. The fallback `{}` is used if the batch returns an empty result (BE returns `{ snapshots: {} }` which also resolves cleanly).

**Result: MATCH.**

---

## Notable Non-Blocking Observations

### OBS-1: `successMessage` is a shared mutable singleton
`helpers/status.js` exports `successMessage = { status: "success" }` as a module-level singleton. All controllers in `applicationController.js` mutate `.data` directly on it. Under concurrent async operations (two requests racing), the second `successMessage.data =` assignment could overwrite the first before the first `res.send()` completes.

**Risk level: LOW-MEDIUM.** Node.js is single-threaded (no true race on a CPU tick), and `res.send()` is called synchronously after the assignment. Under normal single-instance Node operation this is safe. Under high concurrency with event-loop interleaving at await points this is theoretically unsafe. The pattern is widespread across the codebase (not introduced by this deployment) and is not fixed here — tracked for a future SECURE pass.

### OBS-2: Batch endpoint — `forkJoin` error handling
If all chunks fail, `forkJoin` emits to the `error` handler and `snapshotsError = true`. The UI shows a retry button. If some chunks succeed and some fail, the individual `catchError(() => of({}))` per chunk means partial results are merged — failed chunk IDs get no entry in `snapshotsMap`, so `snapshotFor(id)` returns `null`, rendering the "unavailable" state. Behavior is acceptable.

### OBS-3: `snapshotCreatedAt` absent from batch response (by design)
The batch endpoint does not include `snapshotCreatedAt`. The list view (which uses the batch) does not display it. The detail view (which uses the single endpoint) does display it via `snapshot.snapshotCreatedAt | date:'mediumDate'`. This division is intentional and correct.

### OBS-4: Detail component — `getCurrentNavigation()` timing
`this.router.getCurrentNavigation()` on line 37 of the detail component returns `null` when `ngOnInit` fires after navigation has completed (which is common). The fallback `window.history.state ?? {}` handles this correctly, as Angular populates `history.state` with navigation extras. No functional gap.

---

## Summary

| Gate | Status | Evidence |
|---|---|---|
| A | PASS | Batch: BE sends `{data:{snapshots:{...}}}`, FE reads `res?.data?.snapshots` — exact match |
| B | PASS | Single: BE sends `{data:{applicationId, snapshotCreatedAt, ...}}`, FE reads `res?.data` → `snapshot.snapshotCreatedAt` correct |
| C | PASS | `null?.length > 0` evaluates to `false` via optional chain → undefined → NaN > 0 → false; section hidden correctly |
| D | PASS | No route shadow: `applications` and `applications/:id` have different segment counts, Angular resolves independently |
| E | PASS | Both list (`app.jobApplicationId`) and detail (route param from same UUID) deliver identical ID to card `[applicationId]` input |

**Seams verified: 5**
**Issues found: 0 blocking, 1 low-medium non-blocking (OBS-1 singleton mutation), 3 informational**
**Fixes applied: 0**
