# GETHIRED REGRESSION CHECKLIST V6
**Date:** 2026-07-01 | For use before any LinkedIn OIDC or company settings deployment

---

## How to Use
Run this checklist manually (or automate with Playwright/Cypress) before every deployment that touches auth, company settings, or the employer panel. Check each item and record pass/fail.

---

## SECTION A — Existing Auth Flows (Regression)

### A1. Email + Password
- [ ] A1-01: Sign in with valid email/password → navigates to correct dashboard (employer or job seeker)
- [ ] A1-02: Sign in with wrong password → shows error, no navigation
- [ ] A1-03: Sign in with unverified email → shows error (if applicable)
- [ ] A1-04: Sign up with new email → account created, redirect to role/dashboard
- [ ] A1-05: Reset password email sent from /reset-password

### A2. Google Auth
- [ ] A2-01: Google sign-in for existing GetHired user → navigates to dashboard (employer or job seeker)
- [ ] A2-02: Google sign-in for new user → reaches /choose-role
- [ ] A2-03: Google choose-role as job_seeker → account created, navigates to /user/dashboard
- [ ] A2-04: Google choose-role as employer → account created, navigates to /recruiter/company
- [ ] A2-05: Google sign-in for role=2 with company + active sub → /recruiter/dashboard
- [ ] A2-06: Google sign-in for role=2 with company, no active sub → /recruiter/subscription

---

## SECTION B — LinkedIn OIDC (New V6)

### B1. LinkedIn Sign-In Happy Path
- [ ] B1-01: Click LinkedIn sign-in button → browser redirects to LinkedIn OAuth page
- [ ] B1-02: State param in LinkedIn URL is a signed JWT (verify via browser devtools)
- [ ] B1-03: After LinkedIn consent, /callback fires → redirects to /linkedin/complete?ticket=...
- [ ] B1-04: /linkedin/complete exchanges ticket → navigates to dashboard (existing user)
- [ ] B1-05: /linkedin/complete with ?error= param → shows correct error message
- [ ] B1-06: Existing GetHired user (by email, no LinkedIn identity) → LinkedIn identity linked, then authenticated

### B2. LinkedIn Sign-Up — Intent
- [ ] B2-01: Start with intent=jobseeker → new user created with role=3, no choose-role screen
- [ ] B2-02: Start with intent=employer → new user created with role=2, navigates to /recruiter/company
- [ ] B2-03: Start with intent=auto (default) → reaches /choose-role after /linkedin/complete

### B3. LinkedIn Role Required Flow
- [ ] B3-01: After /linkedin/complete returns role_required → navigates to /choose-role
- [ ] B3-02: /choose-role shows LinkedIn user's displayName and email
- [ ] B3-03: Selecting job_seeker → account created, navigates to /user/dashboard
- [ ] B3-04: Selecting employer → account created, navigates to /recruiter/company
- [ ] B3-05: KNOWN BUG — Finding #3: Choose-role may fail with "session data incomplete" until fix is deployed; document result

### B4. LinkedIn Security
- [ ] B4-01: Ticket is single-use — refreshing /linkedin/complete with same ticket shows error, not re-authenticated
- [ ] B4-02: Expired ticket (>5 min old) shows error
- [ ] B4-03: Navigating directly to /linkedin/complete with no params shows missing_ticket error
- [ ] B4-04: returnTo=https://evil.com is blocked (verify state JWT rt field is empty in devtools)

### B5. LinkedIn Unlink + Link Status
- [ ] B5-01: GET /api/auth/linkedin/link-status with valid token → { linked: true/false }
- [ ] B5-02: DELETE /api/auth/linkedin/unlink with valid token → { success: true }
- [ ] B5-03: GET /api/auth/linkedin/link-status after unlink → { linked: false }
- [ ] B5-04: DELETE /api/auth/linkedin/unlink without token → 401

---

## SECTION C — Company Setup Modal (New V6)

- [ ] C1: First-time employer (no company) navigating to /recruiter/company/settings → CompanyBasicComponent dialog opens
- [ ] C2: After completing company setup (CompanyBasicComponent closes with result=1) → EmployerCompanySetupSuccessModalComponent opens
- [ ] C3: Modal shows correct companyName from localStorage
- [ ] C4: Modal's "Post your first job" button → navigates to /recruiter/jobs/create AND closes modal
- [ ] C5: Modal's "Complete company profile" button → navigates to /recruiter/company/settings AND closes modal
- [ ] C6: Modal's "View public profile" button (if slug present) → opens /company/<slug> in new tab AND closes modal
- [ ] C7: Modal's "View public profile" button is HIDDEN when companySlug is empty
- [ ] C8: Modal's "Go to dashboard" → navigates to /recruiter/dashboard AND closes modal
- [ ] C9: sessionStorage key 'gh_company_setup_success_seen' is set to '1' after modal opens
- [ ] C10: Modal can be closed by clicking outside (disableClose: false) — modal closes without navigation

---

## SECTION D — Employer Panel Sign-Out Fix (New V6)

- [ ] D1: Clicking "Sign out" / logout button on employer panel → navigates to /signin
- [ ] D2: After sign-out, localStorage is cleared (no 'token' key)
- [ ] D3: After sign-out, navigating directly to /recruiter/dashboard → redirected to /signin (guard active)
- [ ] D4: signInAgain() button (on profile error fallback) also navigates to /signin

---

## SECTION E — Cert API Fix Regression

- [ ] E1: GET /api/jobs/:id for a job with certification requirements → response.certificationRequirements array present
- [ ] E2: No 'id' key in any element of certificationRequirements
- [ ] E3: No 'canonicalKey' key in any element of certificationRequirements
- [ ] E4: Keys present: name, type, importance, issuingAuthority, expiryRequired, verificationRequired

---

## SECTION F — Existing Employer Flows (Regression)

- [ ] F1: /recruiter/company/settings loads correctly with 4 tabs
- [ ] F2: Company profile update saves and topbar refreshes with new companyName
- [ ] F3: Tab navigation (?tab=N) works correctly
- [ ] F4: Existing UpdatedDialogComponent still works in job create/list flows
- [ ] F5: Employer dashboard loads job stats
- [ ] F6: Job creation flow still works end-to-end

---

## SECTION G — DB Migration Verification

- [ ] G1: Run `SELECT * FROM gethired.auth_identities LIMIT 1` — table exists (no "relation does not exist" error)
- [ ] G2: Run `SELECT * FROM gethired.oauth_tickets LIMIT 1` — table exists
- [ ] G3: auth_identities has UNIQUE constraint on (provider, provider_subject)
- [ ] G4: oauth_tickets has PRIMARY KEY on jti
- [ ] G5: Stale oauth_tickets (used_at IS NOT NULL and expires_at < NOW()) can be queried

---

## Sign-Off

| Checklist Section | Run Date | Pass/Fail | Notes |
|---|---|---|---|
| A — Existing Auth | | | |
| B — LinkedIn OIDC | | | B3-05 known fail |
| C — Company Modal | | | |
| D — Sign-out Fix | | | |
| E — Cert API | | | |
| F — Employer Flows | | | |
| G — DB Migration | | | |

**Deploy gate: All sections except B3-05 must PASS before LinkedIn auth is enabled in production (LINKEDIN_AUTH_ENABLED=true).**
