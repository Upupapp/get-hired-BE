# GETHIRED SECURE — Fix Log (Recent Deployment)
**Scope:** FE HEAD 5ab9a05 — ApplicantApplicationDetailComponent + ApplicationCompletenessCardComponent
**Date:** 2026-06-24
**Total fixes applied:** 1

---

## Fix F-01 — Add canActivate: [ApplicantGuard] to applicant panel parent route

**Finding ID:** F-01
**Severity:** P1
**Type:** Access control — missing route guard

### Problem

`applicant-panel.module.ts` defines a `path: ''` parent route with five child
routes (`dashboard`, `profile`, `applications`, `applications/:id`, `settings`).
`ApplicantGuard` was imported in the module but never placed on any route,
leaving all five child routes guarded only by `AuthGuard` (applied at the
`path: 'user'` level in `app.routing.module.ts`).

`AuthGuard` checks that the user is authenticated and checks the role, but
returns `true` for wrong-role authenticated users (it redirects but does not
block). This means a logged-in recruiter (role=2) or admin (role=1) who directly
navigates to `/user/applications/123` can mount the component and fire the API
call before the redirect completes. The BE IDOR guard (403 on `candidate_id`
mismatch) prevents data leakage, but the FE guard layer is porous.

### Fix applied

**File:** `src/app/applicant-panel/applicant-panel.module.ts`

```diff
  {
    path: '',
    component: ApplicantPanelComponent,
+   canActivate: [ApplicantGuard],
    children: [
```

`ApplicantGuard.canActivate` checks:
1. `state` in localStorage equals `'true'` (authenticated)
2. `role` in localStorage equals `'3'` (applicant role)

If either check fails it resets the router config and returns `false`, which
properly blocks navigation — unlike `AuthGuard` which returns `true` after
redirecting. Placing the guard on the parent `path: ''` route means it fires
for all five child routes simultaneously.

### Coverage after fix

| Route | Guard chain |
|-------|-------------|
| `/user/dashboard` | AuthGuard + ApplicantGuard |
| `/user/profile` | AuthGuard + ApplicantGuard |
| `/user/applications` | AuthGuard + ApplicantGuard |
| `/user/applications/:id` | AuthGuard + ApplicantGuard |
| `/user/settings` | AuthGuard + ApplicantGuard |

### Risk of change

Low. `ApplicantGuard` enforces the same intent already declared in
`app.routing.module.ts` (`data: { role: '3' }`). Applicant users (role=3) see
no change in behaviour. Wrong-role users are now properly blocked at the FE
guard layer (in addition to being redirected by `AuthGuard` and blocked by the
BE 403 guard).

### Verification

Confirm in the browser:
1. Log in as recruiter (role=2) → direct navigate to `/user/applications` → should
   redirect to recruiter dashboard, not show the applicant panel.
2. Log in as applicant (role=3) → navigate to `/user/applications` → should load
   normally.
3. Log out → direct navigate to `/user/applications/123` → should redirect to /signin.
