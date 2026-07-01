# GETHIRED TEST PLAN V6 — LinkedIn OIDC + Company Setup Modal + Sign-out Fix
**Date:** 2026-07-01

---

## Scope

V6 test plan covers 4 new feature areas:
1. LinkedIn OIDC auth flow (BE + FE)
2. EmployerCompanySetupSuccessModal (FE)
3. Employer panel sign-out fix (FE)
4. Cert API DTO fix regression (BE)

Plus regression for: Google auth, email+password auth, company settings flow.

---

## 1. LinkedIn OIDC BE — Unit Test Specs

### 1A. linkedinSession.js

**TC-LS-01: createLinkedinState returns signed JWT with correct payload**
- Call `createLinkedinState('jobseeker', 'test', '/recruiter/dashboard')`
- Verify returned `state` is a JWT that jwt.verify() accepts with env.secret, algorithm HS256
- Verify decoded payload has: cv (codeVerifier), nc (nonce), it='jobseeker', sc='test', rt='/recruiter/dashboard'
- Verify codeVerifier is base64url, 32+ bytes
- Verify nonce is hex, 32 chars

**TC-LS-02: createLinkedinState with no args defaults correctly**
- Call `createLinkedinState()`
- Decoded payload: it='auto', sc='unknown', rt=''

**TC-LS-03: verifyLinkedinState returns null for tampered JWT**
- Sign a JWT with a different secret → verifyLinkedinState returns null

**TC-LS-04: verifyLinkedinState returns null for expired JWT**
- Sign a JWT with exp in the past → returns null

**TC-LS-05: makeTicketJwt produces a JWT with jti + all required fields**
- Call `makeTicketJwt('uid123', 'authenticated', 'employer', '/recruiter/dashboard', false)`
- Decoded: jti (24-byte hex), uid='uid123', status='authenticated', intent='employer', rt='/recruiter/dashboard', rr=false

**TC-LS-06: decodeTicketJwt returns null for expired ticket**
- Sign ticket with past exp → decodeTicketJwt returns null

**TC-LS-07: decodeTicketJwt returns null for wrong secret**
- Sign with different secret → returns null

---

### 1B. linkedinAuthController.js — /start

**TC-START-01: Returns 503 when LINKEDIN_AUTH_ENABLED != 'true'**
- Mock env → response 503 { message: 'LinkedIn sign-in is not enabled.' }

**TC-START-02: Returns 503 when clientId or redirectUri missing**
- LINKEDIN_AUTH_ENABLED=true, LINKEDIN_CLIENT_ID='' → 503

**TC-START-03: Redirects 302 to LinkedIn with correct query params**
- Valid config → Location header contains response_type=code, client_id, redirect_uri, scope=openid+profile+email, state (valid JWT)

**TC-START-04: intent and returnTo propagated into state JWT**
- GET /start?intent=employer&returnTo=%2Frecruiter%2Fdashboard
- Decode state → it='employer', rt='/recruiter/dashboard'

**TC-START-05: sanitizeReturn blocks external returnTo**
- GET /start?returnTo=https://evil.com → state JWT rt=''
- GET /start?returnTo=//evil.com → state JWT rt=''
- GET /start?returnTo=%3Cscript%3E → state JWT rt=''

---

### 1C. linkedinAuthController.js — /callback

**TC-CB-01: Redirects to error=not_enabled if disabled**
- isEnabled()=false → redirectError('not_enabled')

**TC-CB-02: Redirects to error=linkedin_denied on LinkedIn error param**
- ?error=access_denied&state=... → redirectError('linkedin_denied')

**TC-CB-03: Redirects to error=missing_params if code or state absent**

**TC-CB-04: Redirects to error=invalid_state if state JWT invalid**
- Tampered state → redirectError('invalid_state')

**TC-CB-05: Redirects to error=missing_sub if userinfo has no sub**

**TC-CB-06: Redirects to error=missing_email if userinfo has no email**

**TC-CB-07: Redirects to error=email_not_verified if email_verified=false**

**TC-CB-08: Existing LinkedIn identity → updates last_login_at, issues ticket with status=authenticated**

**TC-CB-09: Existing email user (no LinkedIn identity) → links identity, issues ticket with status=authenticated**

**TC-CB-10: New user with intent=jobseeker → creates user with roleId=3, issues authenticated ticket**

**TC-CB-11: New user with intent=employer → creates user with roleId=2, issues authenticated ticket**

**TC-CB-12: New user with intent=auto → issues role_required ticket, uid is 'pending:linkedin:<liSub>'**

**TC-CB-13: Ticket stored in oauth_tickets with correct jti, uid, data, expires_at**

**TC-CB-14: Redirects to /linkedin/complete?ticket=<jwt> on success**

**TC-CB-15: ID token iss check — invalid issuer → redirectError('invalid_issuer')**
- idTokenRaw with iss != 'https://www.linkedin.com'

**TC-CB-16: ID token aud check — invalid audience → redirectError('invalid_audience')**

---

### 1D. linkedinAuthController.js — /complete

**TC-COMP-01: Returns 503 if disabled**

**TC-COMP-02: Returns 400 if ticket missing**

**TC-COMP-03: Returns 400 if ticket JWT invalid/expired**

**TC-COMP-04: Returns 400 if ticket already used (consumeTicketDb returns null)**
- Simulate DB returning no row on UPDATE

**TC-COMP-05: status=role_required → returns 200 with linkedinPendingToken and googleEmail fields**

**TC-COMP-06: status=authenticated → calls firebaseAdmin.auth().createCustomToken(uid)**

**TC-COMP-07: status=authenticated → returns 200 { success:true, status:'authenticated', data: { token, role, ... } }**

**TC-COMP-08: Ticket replay blocked — second /complete call with same ticket returns 400**
- Must test against a real (test) DB or mock consumeTicketDb

---

### 1E. linkedinAuthController.js — /choose-role

**TC-CR-01: Returns 400 for selectedRole not in [job_seeker, employer]**
- selectedRole='admin' → 400
- selectedRole='' → 400

**TC-CR-02: Returns 400 for invalid/expired pendingToken**

**TC-CR-03: Returns 400 if pendingToken uid doesn't start with 'pending:linkedin:'**

**TC-CR-04: Existing identity row (race/retry) → returns authenticated session without creating duplicate user**

**TC-CR-05: New user with selectedRole=job_seeker → creates user with roleId=3**

**TC-CR-06: New user with selectedRole=employer → creates user with roleId=2**

**TC-CR-07: Returns 400 if email cannot be recovered (Finding #3 regression)**
- pendingPayload.email='' → 400 { message: 'LinkedIn session data is incomplete...' }

---

### 1F. linkedinAuthController.js — /unlink

**TC-UNLINK-01: Returns 401 if req.user absent (no middleware)**
- Test without verifyFirebaseIdToken in chain

**TC-UNLINK-02: Returns 404 if no LinkedIn identity linked for this uid**

**TC-UNLINK-03: Returns 200 + deletes row on success**

---

### 1G. linkedinAuthController.js — /link-status

**TC-LS-STATUS-01: Returns 401 without auth middleware**

**TC-LS-STATUS-02: Returns { linked: false } when no identity row**

**TC-LS-STATUS-03: Returns { linked: true, linkedEmail, linkedName, linkedAt, lastLoginAt } when linked**

---

## 2. LinkedIn OIDC FE — Unit Test Specs

### LinkedInAuthService

**TC-LI-SVC-01: startLinkedInFlow() sets window.location.href to correct URL**
- Stub window.location; verify URL contains /auth/linkedin/start?intent=jobseeker

**TC-LI-SVC-02: exchangeTicket() POSTs to /auth/linkedin/complete with {ticket}**

**TC-LI-SVC-03: handleCompleteResponse() returns 'error' for success=false**

**TC-LI-SVC-04: handleCompleteResponse() returns 'role_required' and sets _pendingToken for role_required status**

**TC-LI-SVC-05: handleCompleteResponse() calls storeSession() for authenticated status**

**TC-LI-SVC-06: submitRoleSelection() throws if _pendingToken is null**

**TC-LI-SVC-07: submitRoleSelection() POSTs { linkedinPendingToken, selectedRole } to /auth/linkedin/choose-role**

**TC-LI-SVC-08: storeSession() navigates to /recruiter/company for role=2 without company**

**TC-LI-SVC-09: storeSession() navigates to /recruiter/subscription for role=2 with company but no active sub**

**TC-LI-SVC-10: storeSession() navigates to /recruiter/dashboard for role=2 with company and active sub**

**TC-LI-SVC-11: storeSession() navigates to /user/dashboard for role=3**

**TC-LI-SVC-12: storeSession() sets localStorage keys: state, role, loginMessage, token, token_authorization**

**TC-LI-SVC-13: clearPendingRoleState() nulls all _pending fields**

**TC-LI-SVC-14: unlinkLinkedIn() sends DELETE to /auth/linkedin/unlink with Authorization header**

**TC-LI-SVC-15: getLinkStatus() sends GET to /auth/linkedin/link-status with Authorization header**

---

### LinkedInCompleteComponent

**TC-LI-COMP-01: On ?error=linkedin_denied → shows error message, loading=false, no API call**

**TC-LI-COMP-02: On ?error=missing_ticket → shows error message**

**TC-LI-COMP-03: On no ticket param → shows missing_ticket error**

**TC-LI-COMP-04: On valid ticket → calls exchangeTicket(), navigates to /choose-role on role_required**

**TC-LI-COMP-05: On valid ticket → handleCompleteResponse navigates on authenticated (no explicit nav in component)**

**TC-LI-COMP-06: retry() navigates to /signin**

---

### RoleClassificationComponent (LinkedIn branch)

**TC-RC-LI-01: ngOnInit reads displayName/email/photoUrl from LinkedInAuthService if hasPendingRoleClassification=true**

**TC-RC-LI-02: submit() routes to linkedInAuthService.submitRoleSelection() when provider=linkedin**

**TC-RC-LI-03: On success, calls linkedInAuthService.clearPendingRoleState() then storeSession()**

**TC-RC-LI-04: On 401 error, clears both Google and LinkedIn pending state, navigates to /signin**

---

## 3. Company Setup Modal — Test Specs

**TC-MODAL-01: ngOnInit reads companyName, companySlug, profileCompleteness from MAT_DIALOG_DATA**

**TC-MODAL-02: ngOnInit writes '1' to sessionStorage key 'gh_company_setup_success_seen'**

**TC-MODAL-03: postFirstJob() calls dialogRef.close('post_job') then router.navigate(['/recruiter/jobs/create'])**

**TC-MODAL-04: completeProfile() calls dialogRef.close('complete_profile') then router.navigate(['/recruiter/company/settings'])**

**TC-MODAL-05: viewPublicProfile() calls window.open('/company/<slug>', '_blank', 'noopener') when companySlug is set**

**TC-MODAL-06: viewPublicProfile() does nothing when companySlug is empty**

**TC-MODAL-07: goToDashboard() calls dialogRef.close('dashboard') then router.navigate(['/recruiter/dashboard'])**

**TC-MODAL-08: Modal is opened by EmployerSettingsComponent.dialogSuccess() with correct data object {companyName, companySlug, profileCompleteness}**

**TC-MODAL-09: dialogSuccess() reads latest companyName from localStorage before opening modal**

---

## 4. Sign-out Fix — Test Specs

**TC-SIGNOUT-01: EmployerPanelComponent.logout() calls coreService.logout()**

**TC-SIGNOUT-02: EmployerPanelComponent.logout() calls router.navigate(['/signin']) after logout**

**TC-SIGNOUT-03: signInAgain() also calls coreService.logout() then router.navigate(['/signin'])**

---

## 5. Cert API Regression Tests

**TC-CERT-01: getJobCertificationRequirements() response does NOT contain 'id' key**

**TC-CERT-02: getJobCertificationRequirements() response does NOT contain 'canonicalKey' key**

**TC-CERT-03: getJobCertificationRequirements() response contains name, type, importance, issuingAuthority, expiryRequired, verificationRequired**

**TC-CERT-04: getJobCertificationRequirements() returns [] gracefully when table does not exist**

---

## 6. Manual Regression Checklist (quick)

- [ ] Google sign-in still works (not broken by LinkedIn addition)
- [ ] Email+password sign-in still works
- [ ] Employer company settings flow still opens setup modal on first company create
- [ ] Employer logout lands on /signin (not /home or stale page)
- [ ] Public job detail API response has no id/canonicalKey in certificationRequirements

---

## Test Priority Order

1. TC-COMP-08 (ticket replay — security critical)
2. TC-CR-07 (Finding #3 regression — flow broken)
3. TC-CB-07 (email_not_verified check)
4. TC-UNLINK-01 (auth protection)
5. TC-LI-SVC-06 (submitRoleSelection no pending token)
6. TC-MODAL-01 through TC-MODAL-09 (modal navigation)
7. TC-SIGNOUT-01, TC-SIGNOUT-02
8. TC-CERT-01, TC-CERT-02

---

## Implementation Notes

- All BE tests require a mock for `dbQuery.query`, `firebaseAdmin.auth()`, and `axios.post/get`
- All FE tests require Angular TestBed with HttpClientTestingModule and RouterTestingModule
- No real DB connections, no real LinkedIn API calls, no real Firebase calls
- Use `jwt.sign()` with known test secret to produce fixture tokens
