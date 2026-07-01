# GETHIRED SECURE TEST PLAN — V6
**Date:** 2026-07-01 | **Focus:** LinkedIn OIDC security test cases

---

## Test Suite: LinkedIn OIDC Security

### TC-LI-001: State JWT Forgery (should fail)
**Steps:**
1. Call GET /api/auth/linkedin/start — capture redirect URL
2. Modify the `state` parameter (flip one character)
3. Submit to /api/auth/linkedin/callback with modified state
**Expected:** 302 redirect to /linkedin/complete?error=invalid_state

### TC-LI-002: Replay Authorization Code (should fail)
**Steps:**
1. Complete a full LinkedIn flow, capturing the authorization code from the callback
2. Submit the same code to /callback again (simulate replay)
**Expected:** LinkedIn token endpoint returns error; callback redirects to error page

### TC-LI-003: Ticket Single-Use (should fail on second use)
**Steps:**
1. Complete a LinkedIn callback, capture the ticket from the redirect URL
2. POST /auth/linkedin/complete { ticket } — should succeed
3. POST /auth/linkedin/complete { ticket } again — same ticket
**Expected:** Second call returns 400 "Ticket already used or expired"

### TC-LI-004: Ticket Expiry (should fail)
**Steps:**
1. Get a ticket JWT
2. Wait 5 minutes + 1 second (or modify expires_at in DB)
3. POST /auth/linkedin/complete { ticket }
**Expected:** 400 "Invalid or expired ticket"

### TC-LI-005: Admin Role Cannot Be Created via LinkedIn
**Steps:**
1. Attempt LinkedIn flow with intent=admin (or other non-jobseeker/employer value)
**Expected:** status=role_required (auto intent), or 400 error on choose-role with unsupported role name

### TC-LI-006: Unlink Own Identity (should succeed)
**Steps:**
1. Sign in with LinkedIn (obtain Firebase ID token)
2. DELETE /api/auth/linkedin/unlink with Authorization: Bearer <token>
**Expected:** 200 success, auth_identities row deleted for this user

### TC-LI-007: Unlink Other User's Identity (should fail)
**Steps:**
1. Have User A sign in (Firebase token A)
2. POST /api/auth/linkedin/complete as User B to get uid_B
3. Attempt DELETE /auth/linkedin/unlink with User A's token but targeting User B
**Expected:** 404 "No LinkedIn account is linked to your profile" (scoped to User A's uid, which has no LinkedIn identity)

### TC-LI-008: Missing State (should fail)
**Steps:** GET /api/auth/linkedin/callback?code=abc (no state)
**Expected:** 302 redirect to /linkedin/complete?error=missing_params

### TC-LI-009: Invalid Ticket JWT (tampered signature)
**Steps:** POST /auth/linkedin/complete { ticket: "<valid-base64>.tamperedsig" }
**Expected:** 400 "Invalid or expired ticket"

### TC-LI-010: Pending Token Replay (LI-SEC-001 — should fail after fix)
**Steps:**
1. Trigger role_required flow, capture linkedinPendingToken
2. POST /auth/linkedin/choose-role { linkedinPendingToken, selectedRole: 'job_seeker' } — should succeed
3. POST again with same token
**Expected:** After LI-SEC-001 fix: 400 on second call

### TC-LI-011: returnTo Open Redirect (should sanitize)
**Steps:** GET /api/auth/linkedin/start?returnTo=//evil.com/phish
**Expected:** returnTo is sanitized to '' (empty) — sanitizeReturn blocks leading //

### TC-LI-012: Email Not Verified (should fail)
**Steps:** Mock LinkedIn userinfo response with `email_verified: false`
**Expected:** 302 redirect to /linkedin/complete?error=email_not_verified

---

## Test Suite: PayMongo Webhook

### TC-PM-001: Valid Signature (should pass)
- Compute HMAC-SHA256 of `timestamp.rawBody` with the webhook secret
- POST to /webhook with paymongo-signature header
- Expected: 200, event processed

### TC-PM-002: Invalid Signature (should fail)
- POST to /webhook with wrong signature
- Expected: 400/403, event not processed

### TC-PM-003: Replayed Event (>5 min old timestamp)
- POST with timestamp older than 300 seconds
- Expected: 400, rejected as replay

### TC-PM-004: Missing Secret (should fail-closed)
- Temporarily unset PAYMONGO_WEBHOOK_SECRET
- POST to /webhook
- Expected: verifyPaymongoSignature returns false, event not processed

---

## Test Suite: Company Setup Success Modal

### TC-MODAL-001: window.open noopener
- Trigger viewPublicProfile() with a companySlug
- Expected: window.open called with 'noopener' in features string

### TC-MODAL-002: sessionStorage write
- Open modal
- Expected: sessionStorage has 'gh_company_setup_success_seen' = '1'

### TC-MODAL-003: No backend calls
- Mock HTTP — confirm no HTTP requests are made from the modal
- Expected: zero HTTP calls
