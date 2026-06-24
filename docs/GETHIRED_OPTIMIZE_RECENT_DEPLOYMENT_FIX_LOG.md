# GETHIRED_OPTIMIZE_RECENT_DEPLOYMENT_FIX_LOG
Scope: FE HEAD 5ab9a05 — ApplicationCompletenessBadge, ApplicationCompletenessCard,
       ApplicantApplications, ApplicantApplicationDetail, applicant-panel.module.ts
Date: 2026-06-24
Build status after all changes: PASS (Angular production build, zero errors)

---

## Session 1–3 Fixes (prior runs — see report for detail)

| Fix | File | Type |
|-----|------|------|
| S1-1 | job-applicants.component.html — aria-live on employer snapshot | a11y |
| S1-2 | job-applicants.component.html — aria-label on completeness badge | a11y |
| S1-3 | job-applicants.component.html — aria-label on match-level badge | a11y |
| S1-4 | job-applicants.component.html — region label improvement | a11y |
| S2-1 | applicant-applications.component.scss — @keyframes gh-app-shimmer rename | bug |
| S2-2 | applicant-applications.component.html — aria-live on snapshot container | a11y |
| S2-3 | applicant-applications.component.ts/html — trackBy on tip loops | perf |
| S3-1 | applicationController.js — ::text[] cast on 3 ANY($1) queries | correctness |
| S3-2 | applicant-applications.component.ts — snapshotsSub named + cleanup | lifecycle |
| S3-3 | applicant-applications.component.scss — :focus-visible on CTA link | a11y |

---

## Session 4 — Fix Applied

### Fix S4-1: Move router state reading from ngOnInit to constructor
**File:** `get-hired-FE/src/app/applicant-panel/applicant-application-detail/applicant-application-detail.component.ts`
**Type:** Bug fix — Angular router footgun
**PR scope:** Safe/reversible — constructor injection order is unchanged; no new dependencies.

**Root cause:**
`Router.getCurrentNavigation()` returns the active `NavigationExtras` object only while Angular's
router is actively executing a navigation. By the time `ngOnInit` fires the navigation has already
settled, and `getCurrentNavigation()` returns `null`. The code handled the `null` case by falling
through to `window.history.state`, but the `nav?.extras?.state` branch was permanently dead.

The practical failure mode: any user who arrives at `/user/applications/:id` by means other than
the in-app list click (typed URL, F5 reload, browser back-button after a cross-origin redirect, or
programmatic `navigateByUrl` without explicit `state:`) would see a blank detail header
(`jobTitle`, `companyName`, `statusName` all empty strings). The UI shows "Application Details"
as the fallback h1, so the page does not hard-error, but the contextual header is missing.

**Before (ngOnInit):**
```ts
ngOnInit(): void {
  this.applicationId = this.route.snapshot.paramMap.get('id') ?? '';

  // BUG: getCurrentNavigation() always returns null here
  const nav = this.router.getCurrentNavigation();
  const state = nav?.extras?.state ?? (window.history.state ?? {});
  this.jobTitle = state['jobTitle'] ?? '';
  this.companyName = state['companyName'] ?? '';
  this.statusName = state['status'] ?? '';

  if (!this.applicationId) { ... }
  this.load();
}
```

**After (constructor + ngOnInit):**
```ts
constructor(
  private route: ActivatedRoute,
  private router: Router,
  private applicationService: ApplicationService,
) {
  // router.getCurrentNavigation() is only valid synchronously during
  // construction — it returns null in ngOnInit (navigation is already
  // complete by then). Read router state here; fall back to
  // window.history.state which persists after navigation completes.
  const nav = this.router.getCurrentNavigation();
  const state = nav?.extras?.state ?? (window.history.state ?? {});
  this.jobTitle = state['jobTitle'] ?? '';
  this.companyName = state['companyName'] ?? '';
  this.statusName = state['status'] ?? '';
}

ngOnInit(): void {
  this.applicationId = this.route.snapshot.paramMap.get('id') ?? '';

  if (!this.applicationId) {
    this.error = true;
    this.loading = false;
    return;
  }

  this.load();
}
```

**Why this is safe:**
- `ActivatedRoute`, `Router`, and `ApplicationService` are all injected by the time the
  constructor runs — Angular guarantees this.
- `this.route.snapshot.paramMap` is not used in the constructor (stays in ngOnInit where it
  is always available).
- `window.history.state` is the standard fallback for Angular router state after navigation
  completes; it is not cleared by Angular between navigation and ngOnInit.
- No new dependencies; no interface changes.

---

## Session 4 — Verified Pass (No Change Applied)

| Item | File | Verdict |
|------|------|---------|
| Badge @keyframes `acb-*` prefix | application-completeness-badge.component.scss | No collision |
| Card @keyframes `acdc-*` prefix | application-completeness-card.component.scss | No collision |
| SCSS import paths in detail component | applicant-application-detail.component.scss | Consistent |
| DatePipe via CommonModule in card | application-completeness-card.component.html | Available |

---

## Deferred Items (all sessions)

| # | Item | Reason |
|---|------|--------|
| D1 | `jobDetails()` over-fetch on snapshot path (employer BE) | Requires new service method; not on user response path |
| D2 | Composite index on snapshot tables | DB migration; low risk at current volume |
| D3 | `hasAnyMatchSignal()` per CD cycle (employer) | Stream/async pipe refactor; negligible at typical list sizes |
| D4 | `ngFor, 'skill_requirements'` dead syntax | Pre-existing; cosmetic only |
| D5 | Prototype pollution via `snapshots[id]` | Zero risk — DB-returned values only |
| D6 | Comma-in-ID breaks query string parsing | Theoretical — IDs never contain commas |

---

## Build Verification (Session 4)

```
Command: npx ng build --configuration production
Working directory: get-hired-FE/
Result: PASS — zero TypeScript/template errors
Hash: 051561e197aadd79
Build time: 27029ms
Pre-existing warnings only:
  - autoprefixer CSS warning in add-contact-group component (unrelated)
  - xlsx CommonJS optimization bailout (unrelated)
```

**Files changed in Session 4:**
1. `get-hired-FE/src/app/applicant-panel/applicant-application-detail/applicant-application-detail.component.ts`
   — moved router state reading from ngOnInit to constructor
