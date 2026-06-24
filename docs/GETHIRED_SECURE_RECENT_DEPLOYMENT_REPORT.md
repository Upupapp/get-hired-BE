# GETHIRED SECURE — Recent Deployment Security Report
**Scope:** FE HEAD 5ab9a05 — ApplicantApplicationDetailComponent + ApplicationCompletenessCardComponent
**Date:** 2026-06-24
**Auditor:** SECURE command (automated)

---

## Executive Summary

The recent deployment introduced two new FE surfaces:
- `ApplicantApplicationDetailComponent` at `/user/applications/:id`
- `ApplicationCompletenessCardComponent` (child completeness card)

**Overall verdict: GO WITH CAUTION**

The backend IDOR guard is solid and no XSS vectors exist. The one notable gap is
that `ApplicantGuard` is imported in `applicant-panel.module.ts` but never placed
on any route — so the intended role enforcement for the new detail route relies
entirely on `AuthGuard`, which returns `true` for wrong-role authenticated users
(redirect-only). The BE 403 backstop prevents data leakage; a one-line fix closes
the FE gap.

---

## Gate Results

| Gate | Description | Result |
|------|-------------|--------|
| A | `/user/applications/:id` protected by ApplicantGuard | PARTIAL PASS |
| B | BE IDOR check exists; FE shows error on 403 | PASS |
| C | Router state values are display-only, never sent to BE | PASS |
| D | Analytics data contains no PII beyond applicationId | PASS |
| E | No `[innerHTML]` on snapshot text fields | PASS |

---

## Gate A — Route Guard Analysis (PARTIAL PASS)

### App-level routing (`app.routing.module.ts` lines 46-53)

```
{
  path: 'user',
  loadChildren: () => import('./applicant-panel/applicant-panel.module')...,
  canActivate: [AuthGuard],
  data: { role: '3', isMobileViewAllowed: false }
}
```

`AuthGuard` is the only guard that fires for the entire `user/` subtree.

### Panel-level routing (`applicant-panel.module.ts` lines 25-66)

```
const routes: Routes = [
  {
    path: '',
    component: ApplicantPanelComponent,
    // NO canActivate here
    children: [
      { path: 'applications', component: ApplicantApplicationsComponent },
      { path: 'applications/:id', component: ApplicantApplicationDetailComponent },
      // NO canActivate on any child
    ],
  },
];
```

`ApplicantGuard` is imported in the module (`line 6`) but never placed on any route.

### AuthGuard behaviour for wrong-role users

```typescript
// auth.guard.ts lines 54-68
async checkUserLogin(route, url): Promise<boolean> {
  const logged = await this.asyncLocalStorage.getItem('state');
  if (logged == 'true') {
    const userRole = await this.coreService.getRole();
    if (route.data.role && route.data.role.indexOf(userRole) === -1) {
      this.navigateToUserRole(userRole);  // redirects but...
    }
    return true;  // ...still returns true — wrong-role user is not blocked
  }
  ...
}
```

A logged-in recruiter (role=2) who navigates to `/user/applications/123` will:
1. Pass `AuthGuard` (returns `true` after firing redirect)
2. The FE component mounts briefly and calls `getApplicationSnapshot(123)`
3. The BE returns 403 (IDOR guard fires)
4. The error state is shown
5. The redirect to `/recruiter/dashboard` arrives

The component lifecycle and API call fire for one tick before the redirect arrives.
No data is returned or shown due to the BE backstop.

**Risk level: P1** (not P0) — BE backstop prevents data leakage; unauthenticated
users are fully blocked by `AuthGuard`'s `logged != 'true'` check.

**Recommended fix:** Add `canActivate: [ApplicantGuard]` to the `path: ''` parent
route in `applicant-panel.module.ts`. This covers all 5 child routes at once.
See FIX_LOG for the exact one-line patch.

---

## Gate B — IDOR on Detail Route (PASS)

**BE enforcement:** `getApplicantApplicationSnapshot` checks `candidate_id !== uid`
before returning any data, returning 403 on mismatch.

**FE error handling (`applicant-application-detail.component.ts` lines 52-60):**

```typescript
this.sub = this.applicationService.getApplicationSnapshot(this.applicationId).pipe(
  map((res: any) => res?.data ?? null),
  catchError(() => of(null)),   // any error (including 403) -> null
).subscribe(data => {
  this.snapshot = data;
  this.loading = false;
  this.error = data === null;   // null -> error card shown
});
```

A 403 response is caught by `catchError`, produces `null`, sets `error = true`,
and shows the error card. No snapshot data is ever rendered.

**Enumeration exposure:** `applicationId` is read from the URL param (attacker
supplies it). It is not logged to console or analytics before the BE confirms
ownership. `onCtaClick` analytics only fires after a valid owned snapshot is
displayed. No pre-confirmation logging of the ID exists in the codebase.

**Result: PASS**

---

## Gate C — Router State Trust (PASS)

`jobTitle`, `companyName`, `statusName` are read from `window.history.state`.

Full data-flow audit:
- Displayed only via Angular interpolation: `{{ jobTitle }}`, `{{ companyName }}`,
  `{{ statusName }}` — HTML-escaped, XSS-safe.
- Never passed to any HTTP call (only `this.applicationId` goes to the API).
- Never used in a security decision, guard check, or permission evaluation.
- Not passed to analytics (analytics receives only `applicationId` and a static
  label string).

A user who crafts `window.history.state` can only affect their own browser display.
No other user is impacted.

**Result: PASS**

---

## Gate D — Analytics PII (PASS)

`trackApplicationCompletenessCtaClicked(applicationId, ctaLabel)` sends:
- `applicationId`: internal DB ID — not name, email, or personal detail
- `ctaLabel`: one of two static strings (`'Update your profile'` / `'Add to your profile'`)

The analytics service (`public-portal-analytics.service.ts`):
- Has no real SDK wired (`console.debug` only in dev; no-op in prod per comment and prior
  repo-wide search confirming no gtag/segment/mixpanel/amplitude)
- Makes no network calls
- Payload contains no PII, no score values, no employer identifiers

**Result: PASS**

---

## Gate E — XSS via Snapshot Data (PASS)

All snapshot text bindings in `application-completeness-card.component.html`:

| Field | Binding | Safe |
|-------|---------|------|
| `snapshot.disclaimerNote` | `{{ snapshot.disclaimerNote }}` | YES |
| `snapshot.privacyNote` | `{{ snapshot.privacyNote }}` | YES |
| `tip.reason` (missingRequired) | `{{ tip.reason }}` | YES |
| `tip.reason` (missingRecommended) | `{{ tip.reason }}` | YES |
| `snapshot.completenessScore` | `{{ snapshot.completenessScore }}` | YES |
| `snapshot.snapshotCreatedAt` | `{{ snapshot.snapshotCreatedAt \| date:'mediumDate' }}` | YES |
| `snapshot.completenessLevel` | `[ngClass]="progressLevelClass"` (class string) | YES |

No `[innerHTML]` binding found anywhere in the detail component, the card component
template, or the card component TypeScript. Angular interpolation escapes all output.

**Result: PASS**

---

## All Findings

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| F-01 | P1 | `ApplicantGuard` not in route chain for any `user/` child route | Fix applied |
| F-02 | INFO | `AuthGuard.canActivate` returns `true` for wrong-role users (systemic, pre-existing) | Documented |
| F-03 | INFO | Router state spoofing — cosmetic display-only risk | Accepted |

---

## Finding Detail

### F-01 (P1) — ApplicantGuard not in route chain

**File:** `src/app/applicant-panel/applicant-panel.module.ts`

`ApplicantGuard` is imported but never placed on any route. All five child routes
(`dashboard`, `profile`, `applications`, `applications/:id`, `settings`) rely solely
on `AuthGuard` at the `user/` mount point, which returns `true` for any authenticated
user regardless of role. A recruiter or admin who directly navigates to
`/user/applications/123` will mount the component and fire the API call before the
`navigateToUserRole` redirect completes. The BE 403 backstop prevents data exposure.

**Fix:** Add `canActivate: [ApplicantGuard]` to the parent `path: ''` route — one line
that covers all child routes simultaneously. See FIX_LOG for the exact patch.

### F-02 (INFO) — AuthGuard returns true for wrong-role users (systemic)

**File:** `src/app/shared/guard/auth.guard.ts` lines 59-64

This is a pre-existing pattern in the codebase affecting all guarded routes, not
introduced by this deployment. The guard redirects the user but still returns `true`,
relying on the navigation side-effect rather than the boolean return value to enforce
role separation. This pattern means any guard that wraps `AuthGuard` semantics (without
stacking `ApplicantGuard`) is porous to wrong-role authenticated users.

**Fix:** Out of scope for this deployment fix pass — systemic refactor. Flagged for
backlog.

### F-03 (INFO) — Router state spoofing (cosmetic)

**File:** `src/app/applicant-panel/applicant-application-detail/applicant-application-detail.component.ts`
lines 38-41

A user can manipulate `window.history.state` before navigating to see arbitrary text
in the job title / company name / status header. This affects only their own view.
No backend call, security decision, or other user is affected. Accepted as-is —
this is standard Angular practice for navigation metadata (e.g., breadcrumbs).
