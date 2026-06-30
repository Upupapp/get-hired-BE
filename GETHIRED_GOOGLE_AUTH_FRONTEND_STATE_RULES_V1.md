# GETHIRED_GOOGLE_AUTH_FRONTEND_STATE_RULES_V1

## Module: GoogleAuthService (src/app/auth/services/google-auth.service.ts)

### In-Memory State (never persisted)
| Property | Type | Purpose |
|---|---|---|
| `_pendingFirebaseToken` | string | Firebase ID token from role_required response |
| `_pendingDisplayName` | string | Full name from Google profile |
| `_pendingEmail` | string | Google email |
| `_pendingPhotoUrl` | string | Google profile photo URL |
| `_pendingFirstName` | string | Inferred first name |
| `_pendingLastName` | string | Inferred last name |
| `_pendingRefreshToken` | string | Firebase refresh token |

All cleared by `clearPendingRoleState()` after successful role selection.

### Getters (read-only, used by RoleClassificationComponent)
- `hasPendingRoleClassification` → boolean
- `pendingDisplayName`, `pendingEmail`, `pendingPhotoUrl`
- `pendingFirstName`, `pendingLastName`

### Key Methods
- `exchangeGoogleToken(googleIdToken)` → `Observable<GoogleSessionResponse>`
  - POST /api/auth/google/firebase-session
  - Never caches or retries automatically
- `submitRoleSelection(selectedRole)` → `Observable<any>`
  - POST /api/auth/choose-role { firebaseIdToken, selectedRole }
  - Uses `_pendingFirebaseToken` from in-memory state
- `handleGoogleSessionResponse(response, returnUrl?)` → `'authenticated' | 'role_required' | 'error'`
  - If `role_required`: stores pending state, returns `'role_required'`
  - If `authenticated`: calls `storeSession()`, returns `'authenticated'`
- `storeSession(data, returnUrl?)` → void
  - Mirrors `SigninComponent.loggedIn()` exactly
  - Sets: `state`, `role`, `token`, `token_authorization`, `refreshToken`, `user` (JSON), `loginMessage`
  - Navigates by role (1→/admin, 2→/recruiter/*, 3→/user/dashboard or returnURL)

---

## Component: GoogleSigninButtonComponent

### Inputs
| Input | Type | Default | Values |
|---|---|---|---|
| `label` | string | `'continue_with'` | `'continue_with'` \| `'signup_with'` \| `'signin_with'` |
| `fullWidth` | boolean | `true` | — |

### Outputs
| Output | Payload | When |
|---|---|---|
| `credential` | `string` (Google ID token) | User successfully authenticates with Google |
| `errorEvent` | `string` (error code) | GIS error, popup closed, prompt dismissed |

### Error codes emitted
- `'google_popup_closed'` — user dismissed the popup
- `'google_prompt_dismissed'` — One Tap dismissed
- `'gis_not_loaded'` — GIS script not ready after 40 retries (4 seconds)
- `'gis_render_error'` — `window.__GH_GOOGLE_CLIENT_ID__` not set

### Initialization
- Polls `window.google` every 100ms, max 40 attempts (4s)
- Reads `window.__GH_GOOGLE_CLIENT_ID__` set by `APP_INITIALIZER` in AuthModule
- GIS `initialize()` + `renderButton()` called when both GIS and client ID are ready

---

## Component: RoleClassificationComponent

### Guard
- `ngOnInit`: if `!googleAuthService.hasPendingRoleClassification` → redirect to `/signin`
- Clears pending state on `submit()` success or 401 error

### Pending intent detection
- `hasEmployerDraft`: `jobPreviewService.hasPendingToken()`
- `hasJobApplyIntent`: `localStorage.getItem('gh_pending_apply_job_id')`
- `recommendedRole`: `'employer'` if `hasEmployerDraft`, `'job_seeker'` if `hasJobApplyIntent`

### Conflict warning
- If user picks a role different from recommended → `window.confirm()` warning before submit

### Route
- `path: 'choose-role'` in AuthModule routes
- NO UnauthGuard (user has no GetHired session yet during role classification)

---

## State Flow Rules

1. Google token is NEVER stored — only used transiently in `exchangeGoogleToken()` call
2. Pending Firebase token is in-memory only — clears on page refresh (user must restart auth)
3. After `storeSession()` — state is identical to email/password login; no difference downstream
4. `withActiveSubscription` localStorage key set for employer with active subscription (same as signin)
5. `returnURL` localStorage key consumed by role=3 navigation (same as signin)
