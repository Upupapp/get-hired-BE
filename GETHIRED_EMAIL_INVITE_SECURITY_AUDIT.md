# GETHIRED EMAIL & INVITE SECURITY AUDIT — QA Cycle 11
Generated: 2026-06-25

---

## Email Flows Identified

1. **Email verification on signup** — Firebase-managed
2. **Password reset link** — Firebase-managed via `getForgetPwLinkInFirebase()`
3. **Resend verification link** — Firebase via `sendEmailVerificationFirebase()`
4. **Manual Excel verification** — `verifyEmailFileManually()` in userController
5. **Company invite / add user** — `addCompanyUser()` in companiesController (sends email via `send()` mailer)
6. **Job application notifications** — `insertLogs()` + SendGrid in jobsController

---

## Security Checks Per Flow

### 1 & 2: Firebase-Managed Auth Emails
Firebase handles email verification and password reset links internally.
- Links are time-limited and single-use (Firebase enforces this)
- No direct control in app code — delegated entirely to Firebase
- **Risk:** LOW

### 3: Resend Verification Link
`POST /api/auth/resendverificationlink` — public endpoint, no auth required.
- Rate limited by Tier 2 authLimiter (20 req/15min)
- Could be used to spam a target email with verification emails (20 per 15 minutes)
- **Risk:** LOW — Firebase may additionally throttle resend on its side
- **Recommendation:** Consider adding per-email rate limiting (not just per-IP) for resend flows

### 4: Manual Excel Verification
`POST /api/auth/manualexcelverification` — public endpoint, no auth.
- Reads an Excel file and verifies emails in bulk
- No rate limiting specific to this endpoint (only Tier 1 global 500/15min + Tier 3 write 100/15min since it's a POST)
- No authentication — anyone could call this endpoint
- **Risk:** LOW (admin-specific flow, but not secured as such)
- **Recommendation:** Gate behind an admin API key or verifyAuth + role check

### 5: Company User Invite (addCompanyUser)
`POST /api/company/addcompanyuser` — verifyAuth required.
- Derives `companyId` from JWT (getUserCompany) — cannot invite to another company
- Sends invite email via SendGrid through `send()` helper
- **Email injection risk:** If `email` from request body is passed directly to SendGrid without validation, an attacker with employer access could supply a malformed email to influence the SendGrid call
- **Check needed:** Verify `isValidEmail()` is called on the email parameter before passing to SendGrid

**Finding INVITE-QA11-01:** `addCompanyUser` should validate the email format before sending. If `isValidEmail()` is called, this is SAFE. If not, there's a risk of header injection via SendGrid's API.

### 6: Job Application / Notification Emails
`insertLogs()` is called in some job-related flows. SendGrid is used for notifications.
- No email injection vectors found in reviewed code
- **Risk:** LOW

---

## Email Enumeration

As noted in the risk register (P3-01), `loginUser()` returns "User does not exist. Please Register." for missing accounts — allows enumeration of registered email addresses. This also affects forgot-password flows if the response differs between existing and non-existing accounts.

**Impact:** An attacker can confirm which emails are registered by observing response messages.
**Recommendation:** Return "If an account exists, you will receive an email" for all auth-related confirmations.

---

## Summary

| Finding | Severity | Status |
|---------|---------|--------|
| Email enumeration on login | P3 | OPEN |
| Manual Excel verification not authenticated | P3 | OPEN |
| addCompanyUser email validation before SendGrid | P3 | Needs verification (INVITE-QA11-01) |
| Firebase-managed email flows | PASS | — |
| Resend verification rate-limited | PASS | — |
| Company invite requires auth + company ownership | PASS | — |
