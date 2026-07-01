# GETHIRED CONTRACT TEST MATRIX V6
**Date:** 2026-07-01 | LinkedIn OIDC Endpoints + FE Service Counterparts

---

## Contract Testing Approach

No automated contract tests exist. This matrix documents the expected request/response contracts for all 6 LinkedIn endpoints and their FE counterparts, ready for implementation with any HTTP mock library.

---

## Endpoint 1: GET /api/auth/linkedin/start

### Contract
| Field | Value |
|---|---|
| Method | GET |
| Auth Required | No |
| Query Params | intent (auto/jobseeker/employer), source, returnTo |
| Success | 302 redirect to LinkedIn OAuth URL |
| Error — disabled | 503 { message: 'LinkedIn sign-in is not enabled.' } |
| Error — not configured | 503 { message: 'LinkedIn is not configured on this server.' } |

### Success Response Contract
```
Location: https://www.linkedin.com/oauth/v2/authorization
  ?response_type=code
  &client_id=<LINKEDIN_CLIENT_ID>
  &redirect_uri=<LINKEDIN_REDIRECT_URI>
  &scope=openid+profile+email
  &state=<HS256_JWT>
```
State JWT payload: `{ cv, nc, it, sc, rt, iat, exp }`

### FE Counterpart
- `LinkedInAuthService.startLinkedInFlow(intent, returnTo)`
- Sets `window.location.href` — does NOT use HttpClient
- Contract: URL must match `${environment.api_url}/auth/linkedin/start?intent=<intent>[&returnTo=<encoded>]`

### Contract Tests
| ID | Scenario | Expected |
|---|---|---|
| CT-START-01 | enabled=true, valid config | 302 + Location contains response_type=code |
| CT-START-02 | enabled=false | 503 not_enabled |
| CT-START-03 | clientId missing | 503 not_configured |
| CT-START-04 | intent=employer&returnTo=/recruiter/company | state JWT: it=employer, rt=/recruiter/company |
| CT-START-05 | returnTo=https://evil.com | state JWT: rt='' (sanitized) |

---

## Endpoint 2: GET /api/auth/linkedin/callback

### Contract
| Field | Value |
|---|---|
| Method | GET |
| Auth Required | No (LinkedIn OAuth callback) |
| Query Params | code, state, error (from LinkedIn) |
| Success | 302 redirect to /linkedin/complete?ticket=<JWT> |
| All errors | 302 redirect to /linkedin/complete?error=<code> |

### Error Codes
| Code | Cause |
|---|---|
| not_enabled | LINKEDIN_AUTH_ENABLED != 'true' |
| linkedin_denied | LinkedIn returned ?error=... |
| missing_params | No code or state |
| invalid_state | State JWT invalid/expired/tampered |
| no_access_token | LinkedIn token exchange returned no access_token |
| invalid_issuer | id_token iss != 'https://www.linkedin.com' |
| invalid_audience | id_token aud != LINKEDIN_CLIENT_ID |
| token_expired | id_token exp < now |
| invalid_nonce | id_token nonce mismatch |
| missing_sub | userinfo.sub empty |
| missing_email | userinfo.email empty |
| email_not_verified | userinfo.email_verified = false |
| server_error | Any unhandled exception |

### Success Response Contract (tickets)
```
Location: <APP_URL>/linkedin/complete?ticket=<JWT>[&returnTo=<encoded>]

Ticket JWT payload:
{
  jti: string (48-char hex),
  uid: string (GetHired UID or 'pending:linkedin:<liSub>'),
  status: 'authenticated' | 'role_required',
  intent: string,
  rt: string,
  rr: boolean,
  iat: number,
  exp: number (iat + 300)
}
```

### DB Contract
- oauth_tickets row inserted: `(jti, uid, data, expires_at)`
- `data` JSONB: `{ status, intent, returnTo, roleRequired, liSub, email, emailVer, firstName, lastName, photoUrl, name, role }`

### Contract Tests
| ID | Scenario | Expected |
|---|---|---|
| CT-CB-01 | Valid code + state, existing user | 302 → /linkedin/complete?ticket=<JWT>, status=authenticated |
| CT-CB-02 | Valid code + state, new user, intent=jobseeker | 302 → ticket, status=authenticated, user created role=3 |
| CT-CB-03 | Valid code + state, new user, intent=auto | 302 → ticket, status=role_required |
| CT-CB-04 | ?error=access_denied from LinkedIn | 302 → ?error=linkedin_denied |
| CT-CB-05 | Invalid state JWT | 302 → ?error=invalid_state |
| CT-CB-06 | email_verified=false in userinfo | 302 → ?error=email_not_verified |
| CT-CB-07 | Missing sub in userinfo | 302 → ?error=missing_sub |
| CT-CB-08 | Duplicate submit (same jti) | oauth_tickets ON CONFLICT DO NOTHING — second row not inserted |

---

## Endpoint 3: POST /api/auth/linkedin/complete

### Contract
| Field | Value |
|---|---|
| Method | POST |
| Auth Required | No |
| Body | `{ ticket: string }` |
| Content-Type | application/json |

### Success Response — status=authenticated
```json
{
  "success": true,
  "status": "authenticated",
  "data": {
    "id": "<uid>",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": 2,
    "photoUrl": "",
    "token": "<Firebase ID token>",
    "refreshToken": "<Firebase refresh token>",
    "withCompany": false,
    "companyName": "",
    "companyId": null,
    "withActiveSubscription": false
  }
}
```

### Success Response — status=role_required
```json
{
  "success": true,
  "status": "role_required",
  "provider": "linkedin",
  "googleEmail": "user@example.com",
  "googleDisplayName": "Jane Doe",
  "googlePhotoUrl": "https://...",
  "inferredFirstName": "Jane",
  "inferredLastName": "Doe",
  "linkedinPendingToken": "<JWT>",
  "returnTo": "",
  "expiresInMinutes": 55
}
```

### Error Responses
| Status | Body |
|---|---|
| 400 | { message: 'Missing ticket.' } |
| 400 | { message: 'Invalid or expired ticket.' } |
| 400 | { message: 'Ticket already used or expired.' } |
| 503 | { message: 'LinkedIn sign-in is not enabled.' } |
| 500 | { message: 'LinkedIn sign-in could not be completed. Please try again.' } |

### FE Counterpart — LinkedInAuthService.exchangeTicket()
```typescript
exchangeTicket(ticket: string): Observable<LinkedInCompleteResponse>
// POST ${environment.api_url}/auth/linkedin/complete
// Body: { ticket }
// Response type: LinkedInCompleteResponse
```

### FE Counterpart — LinkedInCompleteComponent
- Calls `exchangeTicket(ticket)` from query param
- Passes response to `handleCompleteResponse()`
- On role_required: navigates to `/choose-role`
- On authenticated: `handleCompleteResponse()` calls `storeSession()` which navigates

### Contract Tests
| ID | Scenario | Expected |
|---|---|---|
| CT-COMP-01 | Valid authenticated ticket | 200 authenticated + Firebase token |
| CT-COMP-02 | Valid role_required ticket | 200 role_required + linkedinPendingToken |
| CT-COMP-03 | Missing ticket | 400 |
| CT-COMP-04 | Expired ticket JWT | 400 |
| CT-COMP-05 | Ticket already used | 400 |
| CT-COMP-06 | Second call same ticket | 400 (replay blocked) |

---

## Endpoint 4: POST /api/auth/linkedin/choose-role

### Contract
| Field | Value |
|---|---|
| Method | POST |
| Auth Required | No (but pendingToken required) |
| Body | `{ linkedinPendingToken: string, selectedRole: 'job_seeker' | 'employer' }` |

### Success Response
```json
{
  "success": true,
  "status": "authenticated",
  "roleId": 3,
  "data": { /* same shape as /complete authenticated */ }
}
```

### Error Responses
| Status | Body |
|---|---|
| 400 | { message: 'Please choose either Job Seeker or Employer.' } |
| 400 | { message: 'Invalid or expired session. Please sign in with LinkedIn again.' } |
| 400 | { message: 'Invalid pending token.' } |
| 400 | { message: 'LinkedIn session data is incomplete. Please sign in with LinkedIn again.' } |

### KNOWN BUG (Finding #3)
The `linkedinPendingToken` JWT does not contain email/firstName/lastName/photoUrl fields.
When `linkedinChooseRole` tries to read `pendingPayload.email`, it gets undefined → `if (!email)` → 400 error.
This means the role_required → choose-role flow is broken for new LinkedIn users.

### FE Counterpart — LinkedInAuthService.submitRoleSelection()
```typescript
submitRoleSelection(selectedRole: 'job_seeker' | 'employer'): Observable<any>
// Throws if _pendingToken is null
// POST ${environment.api_url}/auth/linkedin/choose-role
// Body: { linkedinPendingToken: this._pendingToken, selectedRole }
```

### Contract Tests
| ID | Scenario | Expected |
|---|---|---|
| CT-CR-01 | Valid pending token + job_seeker | 200 authenticated role=3 |
| CT-CR-02 | Valid pending token + employer | 200 authenticated role=2 |
| CT-CR-03 | selectedRole=admin | 400 |
| CT-CR-04 | Invalid pending token | 400 |
| CT-CR-05 | pendingPayload.email='' (Finding #3) | 400 "session data incomplete" |
| CT-CR-06 | Race: identity already linked | 200 authenticated (existing user) |

---

## Endpoint 5: DELETE /api/auth/linkedin/unlink

### Contract
| Field | Value |
|---|---|
| Method | DELETE |
| Auth Required | YES — verifyFirebaseIdToken middleware |
| Headers | Authorization: Bearer <Firebase ID token> |

### Responses
| Status | Body |
|---|---|
| 200 | { success: true, message: 'LinkedIn account unlinked.' } |
| 401 | (from middleware if invalid token) |
| 404 | { message: 'No LinkedIn account is linked to your profile.' } |

### FE Counterpart — LinkedInAuthService.unlinkLinkedIn()
```typescript
unlinkLinkedIn(token: string): Observable<any>
// DELETE ${environment.api_url}/auth/linkedin/unlink
// Headers: { Authorization: 'Bearer ' + token }
```

### Contract Tests
| ID | Scenario | Expected |
|---|---|---|
| CT-UNLINK-01 | Valid token + linked identity | 200 + row deleted |
| CT-UNLINK-02 | Valid token + no identity | 404 |
| CT-UNLINK-03 | No/invalid token | 401 (middleware) |

---

## Endpoint 6: GET /api/auth/linkedin/link-status

### Contract
| Field | Value |
|---|---|
| Method | GET |
| Auth Required | YES — verifyFirebaseIdToken middleware |
| Headers | Authorization: Bearer <Firebase ID token> |

### Responses
```json
// Not linked:
{ "linked": false }

// Linked:
{
  "linked": true,
  "linkedEmail": "user@example.com",
  "linkedName": "Jane Doe",
  "linkedAt": "2026-07-01T00:00:00.000Z",
  "lastLoginAt": "2026-07-01T12:00:00.000Z"
}
```

### FE Counterpart — LinkedInAuthService.getLinkStatus()
```typescript
getLinkStatus(token: string): Observable<any>
// GET ${environment.api_url}/auth/linkedin/link-status
// Headers: { Authorization: 'Bearer ' + token }
```

### Contract Tests
| ID | Scenario | Expected |
|---|---|---|
| CT-LS-01 | Valid token + linked | 200 { linked: true, ... } |
| CT-LS-02 | Valid token + not linked | 200 { linked: false } |
| CT-LS-03 | No/invalid token | 401 |

---

## Company Setup Modal Contract

### EmployerSettingsComponent.dialogSuccess() → EmployerCompanySetupSuccessModalComponent
| Input | Source | Contract |
|---|---|---|
| companyName | localStorage['user'].companyName, fallback to this.companyName | Never undefined — defaults to '' |
| companySlug | this.companySlug (from companyFacade.companyDetails$.slug) | May be empty — modal hides viewPublicProfile button |
| profileCompleteness | this.profileCompleteness (0–100 computed) | Number 0–100 |

### Modal CTA Contracts
| CTA | Method | Close Value | Navigation |
|---|---|---|---|
| Post first job | postFirstJob() | 'post_job' | router.navigate(['/recruiter/jobs/create']) |
| Complete profile | completeProfile() | 'complete_profile' | router.navigate(['/recruiter/company/settings']) |
| View public profile | viewPublicProfile() | 'view_profile' | window.open('/company/<slug>', '_blank', 'noopener') |
| Go to dashboard | goToDashboard() | 'dashboard' | router.navigate(['/recruiter/dashboard']) |

### sessionStorage Contract
- On modal open (ngOnInit): `sessionStorage.setItem('gh_company_setup_success_seen', '1')`
- Wrapped in try/catch — modal does not crash if sessionStorage unavailable

---

## Summary: New V6 Contract Tests Required

| Endpoint | Tests | Priority |
|---|---|---|
| /start | 5 | High |
| /callback | 8 | Critical |
| /complete | 6 | Critical (replay) |
| /choose-role | 6 | Critical (Finding #3) |
| /unlink | 3 | High |
| /link-status | 3 | Medium |
| Modal CTAs | 9 | High |
| **Total** | **40** | |
