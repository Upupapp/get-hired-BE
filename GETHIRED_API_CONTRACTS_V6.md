# GETHIRED API CONTRACTS V6
**Date:** 2026-07-01 | Extends V5 with LinkedIn OIDC (6 endpoints)

---

## Auth Endpoints — Email + Password (Carried Forward)

### POST /api/auth/signin
```
Request:  { email: string, password: string }
Response: { success: true, data: SessionShape, message: string }
Errors:   400 { message }, 401 { message }, 429 { message }
```

### POST /api/auth/signup
```
Request:  { email, password, firstname, lastname, role: 2|3 }
Response: { message: string }
Errors:   400, 409 { message }
```

---

## Auth Endpoints — Google OIDC (Carried Forward from V5)

### POST /api/auth/google/firebase-session
```
Request:  { googleIdToken: string, returnUrl?: string, source?: string }
Response (authenticated):
  { success: true, status: 'authenticated', data: SessionShape }
Response (role_required):
  { success: true, status: 'role_required',
    googleDisplayName, googleEmail, googlePhotoUrl,
    inferredFirstName, inferredLastName,
    firebaseIdToken, refreshToken, expiresInMinutes: 55 }
Response (409): { message: string, errorCode: 'account_exists_different_provider' }
Errors: 400, 401, 429, 500 { message }
```

### POST /api/auth/choose-role  (Google path)
```
Request:  { firebaseIdToken: string, selectedRole: 'job_seeker' | 'employer' }
Response: { success: true, status: 'authenticated', roleId: 2|3, data: SessionShape }
Errors:   400, 401, 500 { message }
```

---

## Auth Endpoints — LinkedIn OIDC (NEW V6)

### GET /api/auth/linkedin/start
```
Purpose:  Initiate LinkedIn OIDC flow
Auth:     None
Query:    intent?: 'auto'|'jobseeker'|'employer', returnTo?: string, source?: string
Response: HTTP 302 redirect to LinkedIn authorization endpoint
          OR HTTP 503 { message } if LinkedIn not enabled or not configured
Notes:
  - Generates HS256 state JWT containing nonce, intent, source, returnTo
  - State is stateless (no DB write) — works across PM2 cluster workers
  - No PKCE — LinkedIn confidential client authenticates via client_secret
```

### GET /api/auth/linkedin/callback
```
Purpose:  LinkedIn auth code exchange + user resolution + ticket issuance
Auth:     None (browser redirect from LinkedIn)
Query:    code: string, state: string [OR error: string]
Response: HTTP 302 redirect to ${APP_URL}/linkedin/complete?ticket=JWT[&returnTo=...]
          OR HTTP 302 to ${APP_URL}/linkedin/complete?error=<code>
Error codes:
  not_enabled | linkedin_denied | missing_params | invalid_state |
  no_access_token | invalid_issuer | invalid_audience | token_expired |
  invalid_nonce | missing_sub | missing_email | email_not_verified | server_error
Notes:
  - Client secret never returned to FE
  - Ticket is one-time-use JWT (5 min TTL), stored in oauth_tickets DB
  - ticketUid for new-user/role_required = 'pending:linkedin:<liSub>'
```

### POST /api/auth/linkedin/complete
```
Purpose:  Exchange one-time ticket for Firebase session
Auth:     None
Body:     { ticket: string }   — JWT from ?ticket= query param
Response (authenticated):
  HTTP 200 { success: true, status: 'authenticated', data: SessionShape }
Response (role_required):
  HTTP 200 {
    success: true,
    status: 'role_required',
    provider: 'linkedin',
    googleEmail: string,          -- LinkedIn email (named for API shape consistency with Google path)
    googleDisplayName: string,    -- LinkedIn display name
    googlePhotoUrl: string,       -- LinkedIn picture URL
    inferredFirstName: string,
    inferredLastName: string,
    linkedinPendingToken: string, -- new one-time JWT for /choose-role (5 min TTL)
    returnTo: string,
    expiresInMinutes: 55
  }
Errors:
  HTTP 400 { message }  — missing/invalid/expired/already-used ticket
  HTTP 503 { message }  — LinkedIn not enabled
  HTTP 500 { message }  — server error
Notes:
  - Consumes ticket in DB via atomic UPDATE WHERE used_at IS NULL
  - For authenticated: creates Firebase custom token → exchanges for Firebase ID token
  - linkedinPendingToken payload: { jti, uid: 'pending:linkedin:<liSub>', status: 'pending',
      intent, rt, rr: true }
  - DOES NOT embed email/firstName/lastName in pendingToken payload
    (known gap — profile data recovery in choose-role is best-effort)
```

### POST /api/auth/linkedin/choose-role
```
Purpose:  Finalize new LinkedIn user account after role selection
Auth:     None (pendingToken acts as proof of LinkedIn identity)
Body:     { linkedinPendingToken: string, selectedRole: 'job_seeker' | 'employer' }
Response:
  HTTP 200 { success: true, status: 'authenticated', roleId: 2|3, data: SessionShape }
Errors:
  HTTP 400 { message }  — missing/invalid token, invalid role, incomplete session data
  HTTP 503 { message }  — LinkedIn not enabled
  HTTP 500 { message }  — server error
Notes:
  - Validates pendingToken as JWT (HS256, env.secret)
  - uid must start with 'pending:linkedin:' to be valid
  - Profile data (email, names, photo) recovered from pendingToken payload fields
    (these are undefined in current makeTicketJwt shape — fallback to empty string)
  - Creates user_credentials + users + auth_identities rows
  - Sends welcome email (non-fatal)
  - roleId map: 'job_seeker' → 3, 'employer' → 2
```

### DELETE /api/auth/linkedin/unlink
```
Purpose:  Remove LinkedIn identity from current user's account
Auth:     verifyFirebaseIdToken (Authorization: Bearer <firebaseIdToken>)
Body:     none
Response:
  HTTP 200 { success: true, message: string }
  HTTP 401 { message }  — missing/invalid token
  HTTP 404 { message }  — no LinkedIn identity linked to this account
```

### GET /api/auth/linkedin/link-status
```
Purpose:  Check if LinkedIn is linked to current user's account
Auth:     verifyFirebaseIdToken (Authorization: Bearer <firebaseIdToken>)
Response (not linked): HTTP 200 { linked: false }
Response (linked):
  HTTP 200 {
    linked: true,
    linkedEmail: string,
    linkedName: string,
    lastLoginAt: timestamp,
    linkedAt: timestamp
  }
  HTTP 401 { message }
Notes:
  - Response is FLAT (not wrapped in { success, data: {...} })
  - FE LinkedInAuthService.getLinkStatus() uses Observable<any> — no type failure
```

---

## Shared Session Shape (SessionShape)
Used by email+password, Google OIDC, and LinkedIn OIDC authenticated responses:
```typescript
{
  id: string,              // Firebase UID (or 'li_<sha256>' for LinkedIn users)
  email: string,
  firstName: string,
  lastName: string,
  role: 1|2|3,             // 1=admin, 2=employer, 3=job_seeker
  photoUrl: string,
  token: string,           // Firebase ID token
  refreshToken: string,
  withCompany: boolean,
  companyName: string,
  companyId: string | null,
  withActiveSubscription: boolean,
}
```

---

## Company Setup Success Modal Data Contract (NEW V6)

### MatDialog data-in (EmployerSettingsComponent → modal)
```typescript
interface SetupSuccessModalData {
  companyName: string;
  companySlug: string;
  profileCompleteness: number;   // 0-100
}
```

### MatDialog close values (modal → afterClosed observable)
```typescript
type SetupSuccessModalResult = 'post_job' | 'complete_profile' | 'view_profile' | 'dashboard';
```
NOTE: `EmployerSettingsComponent.dialogSuccess()` does NOT subscribe to `afterClosed()`. The modal navigates internally. The close values are emitted for completeness but are not consumed by the parent.
