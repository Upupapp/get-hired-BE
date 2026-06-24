# GETHIRED SWEEP — RECENT DEPLOYMENT
**Scope:** FE HEAD 5ab9a05 (Phase A: 6c123d2 + Phase B: 5ab9a05)
**Date:** 2026-06-24
**Auditor:** Claude Code (claude-sonnet-4-6)

---

## §1 Component Architecture — Badge + Card as Shared Components

### Placement
Both components live in `src/app/shared/components/` — the correct location for reusable, cross-feature components in this codebase. The card is already consumed in two places (list view inline expand, detail page), confirming the shared placement was the right call.

### Declaration
Both are declared in `SharedModule` (`src/app/shared/shared.module.ts`, lines 80-81) inside the `classesToInclude` array, which is used for both `declarations` and `exports`. They are also listed in `entryComponents` (line 95), though `entryComponents` is a no-op in Ivy (Angular 9+) — dead metadata, not a bug.

`ApplicationCompletenessBadgeComponent` is also used inside `ApplicationCompletenessCardComponent` template (card HTML lines 45-50). Because both are declared in the same `SharedModule` and that module exports them, the card can reference the badge with no extra wiring needed — correct.

### Export
`SharedModule` exports everything in `classesToInclude` plus `RouterModule`. Any feature module that imports `SharedModule` gets both components and the router directives (`routerLink`) they depend on. `ApplicantPanelModule` imports `SharedModule`, so the list and detail views can use both components without re-declaring them.

**Finding:** Architecture is correct. No declaration gaps, no double-declaration, no orphaned exports.

**Minor note:** `BrowserModule` and `BrowserAnimationsModule` are imported in `shared.module.ts` (lines 2, 5) but not added to the `@NgModule` imports or exports array — dead imports. Pre-existing, not a regression from this deployment.

---

## §2 Detail Route — `applications/:id` vs `applications` (List)

### Route table (applicant-panel.module.ts)

```
line 52:  path: 'applications'       -> ApplicantApplicationsComponent
line 56:  path: 'applications/:id'   -> ApplicantApplicationDetailComponent
```

### Angular Router matching
Angular matches routes top-to-bottom and stops at the first full match. The static segment `applications` uses the default prefix matcher. A request to `/user/applications/abc123` will:

1. Try `applications` — the prefix matches, but the remaining `/abc123` segment cannot be consumed by a component route with no child config. Angular continues.
2. Try `applications/:id` — matches the full URL. Correct component activated.

A request to `/user/applications` matches `applications` exactly and never reaches `applications/:id`.

**Finding:** Route order is safe. No wildcard conflict. Adding `pathMatch: 'full'` to the static route would also be safe but is unnecessary.

---

## §3 Router State — `window.history.state` Fallback

### Code under review (applicant-application-detail.component.ts, lines 37-38)

```ts
const nav = this.router.getCurrentNavigation();
const state = nav?.extras?.state ?? (window.history.state ?? {});
```

### The `getCurrentNavigation()` timing issue
`router.getCurrentNavigation()` is only non-null **while a navigation is actively in progress**. By `ngOnInit`, navigation is complete and the component is being initialized — `getCurrentNavigation()` returns `null`. The primary path (`nav?.extras?.state`) is therefore **always null** for this component. The code always falls through to `window.history.state`.

### Is `window.history.state` safe?
Angular's `Router.navigate()` with `{ state: {...} }` populates `history.state` alongside the internal `navigationId` key. The value persists until the next navigation. Accessing it in `ngOnInit` (which runs synchronously after the route resolves) reliably returns the state from the landing navigation.

**Caveat:** If the user arrives at `applications/:id` via any means other than the list's `[routerLink]` + `[state]` binding (bookmarks, back/forward, deep link, copy-paste), `window.history.state` will be `{}` or contain only Angular internal keys. In those cases `jobTitle`, `companyName`, and `statusName` will be empty strings. The template falls back to the `Application Details` heading (detail HTML, line 14). The fallback is handled correctly.

### Angular's preferred API
The idiomatic approach is to read `getCurrentNavigation()` in the **constructor** (where navigation is still active):

```ts
constructor(private router: Router) {
  const nav = this.router.getCurrentNavigation();
  const state = nav?.extras?.state ?? {};
  this.jobTitle = state['jobTitle'] ?? '';
}
```

The current code is functionally equivalent via `window.history.state`, but the primary path is dead code and `window` is a SSR-hostile global.

**Finding:** Works correctly in this CSR-only SPA. The `getCurrentNavigation()` branch is dead code. Low risk, refactor opportunity.

---

## §4 Single vs Batch Endpoint — `snapshotCreatedAt` Optionality

### Endpoints

| Context | Method | Endpoint | Returns snapshotCreatedAt? |
|---|---|---|---|
| List view (batch) | `getApplicationSnapshots(ids[])` | `/applicant/application/snapshots` | Not returned |
| Detail view (single) | `getApplicationSnapshot(id)` | `/applicant/application/snapshot` | Yes |

### Card template handling
The card renders the timestamp only when truthy (card HTML, lines 38-40):

```html
<span class="acdc-timestamp" *ngIf="snapshot.snapshotCreatedAt">
  Captured {{ snapshot.snapshotCreatedAt | date:'mediumDate' }}
</span>
```

This guard is correct. When used in the list view (batch data, no `snapshotCreatedAt`), the span is not rendered. When used in the detail view (single endpoint, `snapshotCreatedAt` present), it renders. The `| date:'mediumDate'` pipe is safe on a valid ISO date string; an unexpected format will silently produce empty output in Angular default mode.

### Error flag semantics differ between contexts
In the detail view (applicant-application-detail.component.ts, lines 55-59):

```ts
catchError(() => of(null)),
...
this.error = data === null;
```

A network error AND a server "no snapshot exists" 200 (data returned as null) both produce `snapshot = null, error = true`. The card shows the retry block for both cases. If the server legitimately returned "no snapshot," the user sees a retry button that will never succeed — they should see card state 3 (unavailable) instead.

In the list view, `snapshotsError` (network failure flag) and `snapshotFor(id)` (returns null from map for missing entry) are kept separate — correctly distinguishing network error from no-data.

**Finding:** `snapshotCreatedAt` optionality is correctly guarded. The `error` flag conflation on the single endpoint is a latent UX bug. Needs a fix.

---

## §5 Analytics Wiring — `applicationId` on CTA Click

### Guard in `onCtaClick` (application-completeness-card.component.ts, lines 55-58)

```ts
onCtaClick(label: string): void {
  if (this.applicationId) {
    this.analytics.trackApplicationCompletenessCtaClicked(this.applicationId, label);
  }
}
```

The guard prevents a call with an empty string. If `applicationId` is never passed, analytics are silently skipped — no crash, just silent data loss.

### Paths where `applicationId` could be empty

**Path 1 — List view:** `[applicationId]="app.jobApplicationId"` (list HTML, line 54). If the backend omits `jobApplicationId`, Angular coerces `undefined` to `''` for the `string` Input default. Guard catches it. No crash.

**Path 2 — Detail view:** `[applicationId]="applicationId"` (detail HTML, line 23). `applicationId` is set from `route.snapshot.paramMap.get('id') ?? ''`. If no `id` param, `error = true` is set and no CTAs are visible — `onCtaClick` cannot be triggered. Safe.

**Path 3 — Future use without binding:** The `@Input()` defaults to `''`, so forgetting to bind it silently suppresses analytics. No lint-time or runtime warning fires.

**Finding:** No crash path exists. Analytics silently drop CTA clicks when `applicationId` is empty. The guard is the right pattern. A `console.warn` in non-production when `applicationId` is empty at click time would surface mis-wiring during development.

---

## §6 Risk Register

| ID | Area | Severity | Description | Fix Required |
|---|---|---|---|---|
| R1 | Detail — Router state | Medium | `router.getCurrentNavigation()` in `ngOnInit` is always null; primary state path is dead code. `window.history.state` is the actual data source — SSR-hostile, bypasses Angular abstraction. Works in CSR-only mode. | No (works); refactor to constructor recommended |
| R2 | Detail — Error vs no-data semantics | Medium | Single endpoint conflates network error and "no snapshot exists" into `error = true`. User sees retry button for a case where retrying cannot help. Should show card state 3 (unavailable) for no-data, retry only for HTTP error. | Yes — fix `load()` to distinguish catchError from data === null |
| R3 | Analytics — Silent `applicationId` gap | Low | Empty `applicationId` silently suppresses CTA analytics with no dev signal. Possible if backend omits `jobApplicationId` or future consumer forgets to bind the Input. | No (no crash); add console.warn in dev |
| R4 | SharedModule — Dead imports | Low | `BrowserModule` and `BrowserAnimationsModule` imported in `shared.module.ts` but not in `@NgModule` imports/exports. Dead litter. Pre-existing. | No |
| R5 | SharedModule — `entryComponents` | Trivial | `entryComponents` is a no-op in Angular Ivy. Pre-existing codebase pattern. | No |
| R6 | Card — `snapshotCreatedAt` pipe format | Low | `| date:'mediumDate'` on an unexpected value type may silently produce empty output. Upstream contract is ISO string — low risk unless BE changes date format. | No |
| R7 | Detail — No document title update | Low | `<title>` is never updated on navigation to detail page. Screen reader announces wrong tab label. Affects a11y and browser history. | No (not blocking); add Title.setTitle() |
| R8 | Detail — Hardcoded back navigation | Low | `goBack()` always navigates to `/user/applications`, not `location.back()`. Deep-linked users lose prior navigation context. | No; acceptable trade-off |

**Critical: 0 | High: 0 | Medium: 2 | Low: 5 | Trivial: 1**

---

## §7 Opportunity Register

| ID | Area | Description | Value |
|---|---|---|---|
| O1 | Detail — Router state | Refactor state read to constructor using `getCurrentNavigation()`, removing `window` dependency. | Code quality, SSR readiness |
| O2 | Detail — Error/no-data distinction | In `load()`, use `catchError` to set `error = true` and return `of(undefined)`, then check `data == null` separately to set `snapshot = null` without triggering `error`. Shows card state 3 for no-data. | UX correctness |
| O3 | Analytics — Dev observability | Add `console.warn('[ApplicationCompletenessCard] onCtaClick with empty applicationId')` in non-production when applicationId is missing. | Dev experience |
| O4 | Card — Timestamp fallback copy | When `snapshot.hasSnapshot` is true but `snapshotCreatedAt` is absent, a subtle "Date unavailable" sub-label would close the information gap. | UX polish |
| O5 | Route — Lazy-load detail | `ApplicantApplicationDetailComponent` is eager in `ApplicantPanelModule`. As the detail page grows (CVCOACH/MATCH integration), lazy-loading is a candidate. | Bundle size |
| O6 | Badge — Dead `compact` input | `@Input() compact: boolean = true` is never read in the badge template or SCSS. All consumers pass `[compact]="true"`. Wire up size variants or remove the dead input. | Code cleanliness |
| O7 | Card — Hardcoded `routerLink` in CTA | `routerLink="/user/profile/edit"` is hardcoded in card template. A route change silently breaks all instances. Consider an `@Output() ctaClicked` emitter. | Maintainability |
| O8 | Detail — Document title | Use Angular `Title` service to set `<title>{jobTitle} Application | GetHired</title>` in `ngOnInit`. | A11y, SEO |

---

## Top 5 Concerns

1. **R2 — Error/no-data conflation (detail page):** User sees "Try again" when the server returned no snapshot for a pre-deployment application. Retrying will never help. Fix: separate `catchError` (set `error = true, snapshot = null`) from `data === null` (set `error = false, snapshot = null`). Card state 3 (unavailable) is already implemented and waiting to be used.

2. **R1 — Dead primary state path:** `getCurrentNavigation()` returns null in `ngOnInit`, so `nav?.extras?.state` never executes. `window.history.state` is doing all the work silently. Not a runtime bug, but a maintenance trap.

3. **R3 — Silent analytics gap:** If `jobApplicationId` is missing from a backend response, CTA clicks are silently not tracked. Add a dev-mode warning to make this visible before it becomes a real data gap.

4. **R7 — No document title update:** The detail page does not update `<title>`. Screen reader users navigating by browser tab or history hear the app default title instead of the application name.

5. **R8 — Back button skips history:** Direct-linked users sent to `applications/:id` who click "My Applications" go to the list rather than their actual previous page. Minor but worth noting for UX iteration.

---

## Top 5 Strengths

1. **Shared module architecture is correct:** Both components declared and exported in `SharedModule`, consumed cleanly by both the list and detail views without re-declaration. `RouterModule` exported from `SharedModule` means `routerLink` just works in card templates with no extra wiring.

2. **All 7 card states are handled and guarded:** loading skeleton, error+retry, null snapshot (unavailable), pre-deployment note, positive state, required tips, recommended tips. No uncovered branch, no missing `*ngIf` guard.

3. **Analytics privacy guardrails hold:** `trackApplicationCompletenessCtaClicked(applicationId, label)` payload is limited to `applicationId` and `ctaLabel`. No score values, profile content, or employer identifiers are tracked — consistent with `PublicPortalAnalyticsService` standing privacy rule.

4. **Accessibility is comprehensive:** `aria-expanded` + `aria-controls` on toggle button, `role="status"` + `aria-live` on skeletons, `role="progressbar"` + `aria-valuenow/min/max` on progress bar, `role="alert"` on error state, `role="region"` + `aria-label` on card and section. `prefers-reduced-motion` handled via `@include ambient-motion-safe` (shimmer) and `@include motion-safe` (reveals/transitions) in both badge and card SCSS.

5. **Route ordering is safe and self-documenting:** `applications` (static) precedes `applications/:id` (param) in the child route array. Angular prefix matching correctly separates them without any `pathMatch: 'full'` workaround.
