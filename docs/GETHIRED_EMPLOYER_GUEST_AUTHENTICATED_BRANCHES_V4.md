# GetHired Employer Guest and Authenticated Branch States V4

**Document:** GETHIRED_EMPLOYER_GUEST_AUTHENTICATED_BRANCHES_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** All routing branch decisions for guest (unauthenticated) and authenticated employer users, including guard behavior, role mismatches, session expiry, and edge cases.

---

## Table of Contents

1. [Route Access Matrix](#1-route-access-matrix)
2. [Guest State: Unauthenticated User](#2-guest-state-unauthenticated-user)
3. [Post-Signup Pending-Verify State](#3-post-signup-pending-verify-state)
4. [Authenticated Employer: Normal Access](#4-authenticated-employer-normal-access)
5. [Authenticated Employer: Blocked Paths](#5-authenticated-employer-blocked-paths)
6. [Wrong-Role Routing](#6-wrong-role-routing)
7. [Expired Session](#7-expired-session)
8. [Edge Cases](#8-edge-cases)
9. [Branch Decision Tree](#9-branch-decision-tree)

---

## 1. Route Access Matrix

| Route | Guard | Unauthenticated | Auth role=2 | Auth role!=2 | Notes |
|-------|-------|-----------------|-------------|--------------|-------|
| `/` | None | Accessible | Accessible | Accessible | Public home |
| `/home` | None | Accessible | Accessible | Accessible | Public |
| `/employers` | None | Accessible | Accessible | Accessible | Public employer marketing page (`EmployerPortalComponent`) |
| `/jobs` | None | Accessible | Accessible | Accessible | Public job listings |
| `/jobs/details/:id` | None | Accessible | Accessible | Accessible | Public job detail (`PublicDetailsComponent`) |
| `/public-apply` | None | Accessible | Accessible | Accessible | Public application route |
| `/signup` | `UnauthGuard` | Accessible | Blocked -> `/recruiter/dashboard` | Blocked -> role panel | Pre-populate `role=2` via query param |
| `/signin` | `UnauthGuard` | Accessible | Blocked -> `/recruiter/dashboard` | Blocked -> role panel | |
| `/verify` | `UnauthGuard` | Accessible | Blocked | Blocked | Post-signup verify step |
| `/recruiter` | `AuthGuard` (role:'2') | Blocked -> `/signin` + snackbar | Accessible | Blocked -> correct panel | Top-level employer module guard |
| `/recruiter/dashboard` | Inherited from `EmployerPanelModule` | Blocked | Accessible | Blocked | |
| `/recruiter/jobs/*` | Inherited | Blocked | Accessible | Blocked | |
| `/recruiter/contacts/*` | Inherited | Blocked | Accessible | Blocked | |
| `/recruiter/company/*` | Inherited | Blocked | Accessible | Blocked | |
| `/recruiter/subscription` | Inherited | Blocked | Accessible | Blocked | |
| `/recruiter/interview` | Inherited | Blocked | Accessible (under construction) | Blocked | |

---

## 2. Guest State: Unauthenticated User

### What a guest can access

All public routes are accessible without authentication. No auth token or session state is required.

**Public routes available to guests:**

- `/` and `/home` -- platform home page
- `/employers` -- employer marketing page (`EmployerPortalComponent`): full content including pain points, benefits, USP pillars, how-it-works, FAQ, trust strip, 500k talent proof badge, and all CTAs
- `/jobs` -- public job listings (`GET /job/published`)
- `/jobs/details/:id` -- public job detail page (`PublicDetailsComponent`)
- `/public-apply` -- application form accessible without an account (platform-level feature)

**Analytics and haptics on public pages:**

`EmployerPortalComponent` fires analytics events for unauthenticated guests:
- `trackTrustStripViewed`
- `trackUspSectionViewed`
- `trackHowItWorksSectionViewed`
- `trackPortalFaqOpened`

Haptic `selection()` fires on the primary "Start hiring" CTA click.

### Guest attempting a protected route

When a guest navigates directly to any `/recruiter/*` route:

1. `AuthGuard` intercepts the navigation.
2. A snackbar is displayed: "You are not Authorized".
3. The router redirects to `/signin`.
4. After successful sign-in with `role=2`, the employer is routed to `/recruiter/dashboard`.

**No partial content is rendered.** The guard fires before the component activates.

---

## 3. Post-Signup Pending-Verify State

After completing the signup form, an employer is in a transitional state:

- Account is created but email is not yet verified.
- The user is not fully authenticated for employer panel access.
- `UnauthGuard` allows access to `/verify` in this state.
- `/recruiter/*` routes remain blocked until verification is complete.

**State summary:**

| Route | Access in Pending-Verify | Notes |
|-------|--------------------------|-------|
| `/verify` | Allowed (`UnauthGuard`) | Email verification step |
| `/signin` | Allowed | Can return to sign in after verifying |
| `/recruiter/*` | Blocked | Not yet a verified authenticated employer |
| Public routes | Allowed | No change |

After email verification, the employer signs in via `/signin` and is routed to `/recruiter/dashboard` by `AuthGuard.navigateToUserRole()`.

---

## 4. Authenticated Employer: Normal Access

An authenticated employer with `role=2` and a valid session (`state == 'true'` in localStorage) has full access to the `EmployerPanelModule`.

**Session state detection:**

`AuthGuard` reads the user record from localStorage. The key fields checked are:
- `state` -- must equal `'true'` for valid session
- `role` -- must equal `'2'` for employer panel access
- `companyId` -- read by job-create and other components (absence causes null errors; see Edge Cases section)

**Normal access flows:**

| Scenario | Guard result | Destination |
|----------|-------------|-------------|
| Valid role=2 session, accessing `/recruiter/dashboard` | Pass | `EmployerDashboardComponent` |
| Valid role=2 session, accessing `/recruiter/jobs/create` | Pass | `EmployerJobcreateComponent` |
| Valid role=2 session, accessing `/recruiter/company/details` | Pass | `EmployerCompanyComponent` |
| Valid role=2 session, accessing `/recruiter/subscription` | Pass | `EmployerSubscriptionModule` |

---

## 5. Authenticated Employer: Blocked Paths

An authenticated employer with a valid session is blocked from certain routes by `UnauthGuard`.

### Attempting /signin while authenticated

`UnauthGuard` on `/signin` detects the valid session and redirects the employer back to their panel:
- **Redirect:** `/recruiter/dashboard`
- **No snackbar** is shown (silent redirect)

### Attempting /signup while authenticated

Same behavior. `UnauthGuard` on `/signup` redirects to `/recruiter/dashboard`.

**Purpose:** Prevents double-account creation and login page confusion when employer is already signed in.

---

## 6. Wrong-Role Routing

GetHired has multiple user roles. An authenticated user attempting to access a panel for the wrong role is redirected.

**`AuthGuard.navigateToUserRole()` routing logic:**

| User role | Destination |
|-----------|-------------|
| `role=2` (employer) | `/recruiter/dashboard` |
| Other roles (applicant, admin, etc.) | Their respective panels (not employer panel) |

**Scenario: Applicant (role=1 or similar) attempts `/recruiter/dashboard`:**

1. `AuthGuard` reads `role` from localStorage.
2. Role does not match `'2'`.
3. `navigateToUserRole()` routes the user to the correct panel for their role.
4. Employer panel is not rendered.

**Scenario: Employer (role=2) attempts an applicant route:**

1. Respective guard for that module detects wrong role.
2. `navigateToUserRole()` routes employer back to `/recruiter/dashboard`.

---

## 7. Expired Session

Session expiry is detected by `AuthGuard` checking the `state` field in localStorage.

**Expiry detection:**

```
if (localStorage.state !== 'true') {
  // Session is expired or invalid
}
```

**Guard behavior on expired session:**

1. Snackbar displayed: "You are not Authorized" (or equivalent session-expired message).
2. Router redirects to `/signin`.
3. All in-flight data (unsaved job drafts, typed messages) is lost.

**After re-authentication:**

- Employer signs in again.
- `AuthGuard` re-evaluates the new session.
- Employer is routed to `/recruiter/dashboard`.
- There is no return-to-intended-URL mechanism confirmed -- the employer always lands on the dashboard after re-auth, not on the page they were trying to reach.

---

## 8. Edge Cases

### 8.1 Role=2 with no companyId in localStorage

**Scenario:** An employer completed signup but the `companyId` field was never written to their localStorage user record. This can happen if company creation failed silently or if the user object returned from the API lacks the field.

**Impact:**

- `/recruiter/jobs/create` reads `companyId` from the stored user to associate the job with the correct company. If `companyId` is null or undefined, the API call will include a null `companyId`, likely causing a backend error or creating an orphaned job record.
- The `CompanyNotSetupComponent` dialog is designed to handle this case, but its "Setup Company" button has a confirmed bug: the `navigate` call inside `redirectToSetup()` is commented out, so the employer cannot be directed to company setup. The employer is stranded.

**Current behavior:** Dialog appears, employer clicks "Setup Company", dialog closes, employer remains on dashboard with no path forward.

**Required fix:** Uncomment and implement the navigate call in `redirectToSetup()` to route the employer to `/recruiter/company/details`.

### 8.2 Guest accessing /employers then back-navigating

If a guest visits `/employers`, clicks "Start hiring", completes signup, and then uses the browser back button, they may be navigated back to the signup page. `UnauthGuard` would then detect the authenticated session and redirect forward to `/recruiter/dashboard`. This is expected behavior and does not cause a stuck state.

### 8.3 Authenticated employer with role=2 accessing /jobs/details/:id

This is allowed. The route is public and has no auth guard. An authenticated employer can view public job listings and detail pages (for competitive research, for example). This is not a role violation.

### 8.4 Guest accessing /public-apply

The `/public-apply` route exists in the public module and is accessible without authentication. The application flow from this route is separate from the authenticated applicant panel flow.

---

## 9. Branch Decision Tree

The following decision tree covers all eight guest and authenticated states for the employer journey.

```
Incoming request to any route
|
+-- Is route in public module? (/home, /employers, /jobs, /jobs/details/:id, /public-apply)
|   +-- YES -> Render component (no guard). Done.
|   +-- NO -> Continue to guard evaluation.
|
+-- Is route /signin or /signup or /verify?
|   +-- YES -> UnauthGuard evaluates.
|   |   +-- Is user authenticated (state == 'true', valid role)?
|   |   |   +-- YES -> Redirect to role panel (/recruiter/dashboard for role=2). Done.
|   |   |   +-- NO -> Render sign-in/sign-up/verify form. Done.
|   +-- NO -> Continue.
|
+-- Is route /recruiter/* ?
|   +-- YES -> AuthGuard evaluates.
|   |   +-- Is user authenticated (state == 'true')?
|   |   |   +-- NO -> Snackbar "You are not Authorized" + redirect to /signin. Done.
|   |   |   +-- YES -> Check role.
|   |   |       +-- role == '2' (employer)?
|   |   |       |   +-- YES -> Check for companyId in user record.
|   |   |       |   |   +-- companyId missing?
|   |   |       |   |   |   +-- YES -> CompanyNotSetupComponent dialog (BUG: navigation does not work).
|   |   |       |   |   |   +-- NO -> Render employer panel component. Done.
|   |   |       +-- role != '2' (wrong role)?
|   |   |           +-- YES -> navigateToUserRole() routes to correct panel. Done.
|   +-- NO -> Route not found / 404 handling (platform-level).
```

**State summary legend:**

| State ID | State Name | User Type | Session Valid | Role | Guard Result |
|----------|-----------|-----------|---------------|------|--------------|
| S1 | Guest | None | No | None | Public routes only |
| S2 | Guest blocked | None | No | None | /recruiter -> /signin + snackbar |
| S3 | Pending verify | New signup | Partial | 2 | /verify accessible, /recruiter blocked |
| S4 | Authenticated employer | Employer | Yes | 2 | Full /recruiter access |
| S5 | Authenticated, no company | Employer | Yes | 2 (no companyId) | Dashboard + broken company setup dialog |
| S6 | Authenticated, wrong role | Other user | Yes | !=2 | Redirected to own panel |
| S7 | Authenticated, accessing /signin | Employer | Yes | 2 | UnauthGuard -> /recruiter/dashboard |
| S8 | Expired session | Employer | No (state!='true') | 2 (stale) | /recruiter -> /signin + snackbar |
