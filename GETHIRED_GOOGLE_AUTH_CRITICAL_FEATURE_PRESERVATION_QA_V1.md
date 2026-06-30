# GETHIRED_GOOGLE_AUTH_CRITICAL_FEATURE_PRESERVATION_QA_V1

## Existing Email/Password Auth

| Feature | Status | Notes |
|---|---|---|
| Signin form (email + password) | PASS — untouched | Button added BELOW existing form |
| Signup form (all fields + role + recaptcha) | PASS — untouched | Button added BELOW existing form |
| AuthFacade / AuthEffects / AuthService | PASS — unchanged | No modifications |
| `verifyAuth.js` middleware | PASS — unchanged | Google auth produces same Firebase token |
| `loginUser` controller | PASS — unchanged | Not modified |
| `signUp` controller | PASS — unchanged | Not modified |
| `user_credentials` schema | PASS — unchanged | No columns added |
| `users` schema | PASS — unchanged | No columns added |
| Firebase Admin SDK | PASS — unchanged | Same `verifyIdToken()` |

## Role-Based Routing

| Role | Feature | Status |
|---|---|---|
| Admin (1) | Still routes to /admin | PASS |
| Employer (2) with company + active sub | Routes to /recruiter/dashboard | PASS |
| Employer (2) no company | Routes to /recruiter/company | PASS |
| Employer (2) no active sub | Routes to /recruiter/subscription | PASS |
| Job Seeker (3) | Routes to /user/dashboard or returnURL | PASS |

## AI Job Create Panel

| Feature | Status | Notes |
|---|---|---|
| Anonymous preview generation | PASS — unchanged | No modifications to preview flow |
| Gate card email signup path | PASS — button text changed to "Create account with email" |
| Gate card signin path | PASS — "Already have an account? Sign in" unchanged |
| previewToken saved to localStorage | PASS | savePendingToken() called before Google auth |
| Draft claim after signup | PASS — unchanged | previewToken in localStorage survives |

## AuthModule Routes

| Route | Status |
|---|---|
| `/signin` | PASS — unchanged |
| `/signup` | PASS — unchanged |
| `/reset-password` | PASS — unchanged |
| `/change-password` | PASS — unchanged |
| `/verify` | PASS — unchanged |
| `/auth/choose-role` | NEW — no UnauthGuard |

## SharedModule

`GoogleSigninButtonComponent` added to declarations and exports.
Pre-existing `classesToInclude` array unaffected.
SharedModule imports unchanged.

## Module Loading

| Module | Status |
|---|---|
| PublicModule | PASS — can now use `app-google-signin-button` via SharedModule |
| AuthModule | PASS — SharedModule already imported |
| EmployerPanelModule | PASS — SharedModule imported (can use button if needed) |
| Lazy modules | PASS — all import SharedModule |

## Build

Build: PASS — `npm run build-dev` clean, no errors.
Only pre-existing autoprefixer warnings (unrelated to this feature).
