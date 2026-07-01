# GETHIRED STITCH QA CHECKLIST V6
**Date:** 2026-07-01 | LinkedIn OIDC + Company Setup Modal

---

## Pre-Deployment Environment Checks

- [ ] `LINKEDIN_AUTH_ENABLED=true` set in production `.env`
- [ ] `LINKEDIN_CLIENT_ID` set (LinkedIn OAuth app)
- [ ] `LINKEDIN_CLIENT_SECRET` set (never committed to git)
- [ ] `LINKEDIN_REDIRECT_URI` matches the URI registered in LinkedIn Developer Portal
  - Should be: `https://api.gethiredonline.app/api/auth/linkedin/callback`
- [ ] `LINKEDIN_AUTHORIZATION_ENDPOINT` (default: `https://www.linkedin.com/oauth/v2/authorization`)
- [ ] `LINKEDIN_TOKEN_ENDPOINT` (default: `https://www.linkedin.com/oauth/v2/accessToken`)
- [ ] `LINKEDIN_USERINFO_ENDPOINT` (default: `https://api.linkedin.com/v2/userinfo`)
- [ ] Firebase project allows custom token creation (Admin SDK enabled)
- [ ] `gethired.auth_identities` table exists in production DB
- [ ] `gethired.oauth_tickets` table exists in production DB

---

## LinkedIn Auth Flow — Happy Path (New User, No Existing Account)

- [ ] `LinkedInButtonComponent` renders on `/signin` page (FE)
- [ ] Clicking "Sign in with LinkedIn" triggers `startLinkedInFlow('auto')` → redirect to LinkedIn (no JS error)
- [ ] LinkedIn login/consent page loads
- [ ] After consent, browser redirects to `/linkedin/complete?ticket=JWT` (no error query param)
- [ ] `LinkedInCompleteComponent` loads, calls `/api/auth/linkedin/complete { ticket }`
- [ ] BE responds `{ success: true, status: 'role_required', linkedinPendingToken, googleEmail, ... }`
- [ ] FE redirects to `/choose-role`
- [ ] Role classification page shows LinkedIn user's display name and photo (from `googleDisplayName`/`googlePhotoUrl`)
- [ ] User selects "Job Seeker" → submit → POST `/api/auth/linkedin/choose-role { linkedinPendingToken, selectedRole: 'job_seeker' }`
- [ ] BE responds `{ success: true, status: 'authenticated', roleId: 3, data: SessionShape }`
- [ ] `storeSession()` writes localStorage keys: `state`, `role`, `token`, `token_authorization`, `refreshToken`, `user`
- [ ] FE navigates to `/user/dashboard`
- [ ] `auth_identities` row exists in DB for this LinkedIn user

---

## LinkedIn Auth Flow — Happy Path (Returning User)

- [ ] Returning LinkedIn user clicks LinkedIn button
- [ ] After callback, `/complete` returns `{ status: 'authenticated', data: SessionShape }` directly
- [ ] No `/choose-role` page shown
- [ ] Session stored and navigated to appropriate dashboard (role-based)
- [ ] `auth_identities.last_login_at` updated

---

## LinkedIn Auth Flow — Employer Intent

- [ ] `LinkedInButtonComponent` with `intent="employer"` on signup page
- [ ] New user with employer intent → BE creates employer account (role 2) without role picker
- [ ] FE receives `status: 'authenticated'` directly
- [ ] FE navigates to `/recruiter/company` (no company) or `/recruiter/subscription` / `/recruiter/dashboard`

---

## LinkedIn Auth Flow — Error Cases

- [ ] User denies consent on LinkedIn → `/linkedin/complete?error=linkedin_denied` → error message shown
- [ ] Expired state (stale link) → `/linkedin/complete?error=invalid_state` → error message shown
- [ ] Ticket already used (browser back button replay) → `{ message: 'Ticket already used or expired.' }` → 400 shown
- [ ] `LINKEDIN_AUTH_ENABLED=false` → all 6 endpoints return 503 with appropriate message
- [ ] Missing email in LinkedIn account → `email_not_verified` or `missing_email` error
- [ ] `retry()` button on error page → navigates to `/signin`

---

## LinkedIn Unlink / Link Status

- [ ] `DELETE /api/auth/linkedin/unlink` with valid Firebase ID token → 200 `{ success: true }`
- [ ] `DELETE /api/auth/linkedin/unlink` for account with no LinkedIn link → 404
- [ ] `GET /api/auth/linkedin/link-status` for linked account → `{ linked: true, linkedEmail, ... }`
- [ ] `GET /api/auth/linkedin/link-status` for unlinked account → `{ linked: false }`
- [ ] Both endpoints return 401 without Authorization header

---

## Company Setup Success Modal

- [ ] New employer creates company via `CompanyBasicComponent` (promptCreateCompany)
- [ ] `dialogSuccess()` is called after `afterClosed()` returns `1`
- [ ] `EmployerCompanySetupSuccessModalComponent` opens with correct data:
  - `companyName` matches just-created company name from localStorage
  - `companySlug` populated (may be empty for brand-new company before slug is assigned)
  - `profileCompleteness` reflects current completeness score
- [ ] "Post First Job" CTA → closes modal, navigates to `/recruiter/jobs/create`
- [ ] "Complete Profile" CTA → closes modal, navigates to `/recruiter/company/settings`
- [ ] "View Public Profile" CTA → closes modal, opens `/company/<slug>` in new tab (only if slug is set)
- [ ] "Go to Dashboard" CTA → closes modal, navigates to `/recruiter/dashboard`
- [ ] `sessionStorage.getItem('gh_company_setup_success_seen')` === `'1'` after modal opens
- [ ] Parent `EmployerSettingsComponent` does NOT navigate (navigation is internal to modal)

---

## Regression — Pre-existing Auth Flows

- [ ] Email+password signin still works (unmodified)
- [ ] Google auth still works (requestUri fix from V5 in place)
- [ ] Session keys in localStorage match FE guard expectations for all 3 providers
- [ ] `/api/auth/choose-role` (Google path) still accepts `{ firebaseIdToken, selectedRole }` — not affected by LinkedIn route

---

## Rate Limiter Coverage — LinkedIn Endpoints

- [ ] LinkedIn endpoints fall under `authLimiter` (`/api/auth` → 20 req/15min)
- [ ] LinkedIn endpoints also fall under `writeLimiter` (`/api` → 100 writes/15min)
- [ ] Public endpoints (`/start`, `/callback`, `/complete`, `/choose-role`) have no auth bypass — rate-limited correctly
- [ ] Protected endpoints (`/unlink`, `/link-status`) use Authorization header → skip globalLimiter but still subject to authLimiter

---

## DB Integrity

- [ ] `auth_identities` UNIQUE constraint on `(provider, provider_subject)` prevents duplicate identity rows
- [ ] `user_credentials` ON CONFLICT DO NOTHING prevents duplicate user creation on retry
- [ ] `oauth_tickets` ON CONFLICT DO NOTHING on JTI prevents duplicate ticket storage
- [ ] Expired tickets (`expires_at < NOW()`) are NOT returned by `consumeTicketDb()`

---

## Test Completion Summary

| Category | Checks | Status |
|---|---|---|
| Environment setup | 10 | Manual (env vars) |
| LinkedIn happy paths | 15 | Manual |
| LinkedIn error paths | 6 | Manual |
| Unlink / link-status | 5 | Manual |
| Company modal | 9 | Manual |
| Auth regression | 4 | Manual |
| Rate limiter | 4 | Verified by code reading |
| DB integrity | 4 | Verified by code reading |
