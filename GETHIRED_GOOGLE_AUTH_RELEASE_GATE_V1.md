# GETHIRED_GOOGLE_AUTH_RELEASE_GATE_V1

## Pre-Release Checklist

### Build
- [x] `npm run build-dev` passes (staging config) — zero errors
- [x] FE committed: beec5a3
- [x] BE committed: 7e261aa
- [x] FE pushed to GitHub (Upupapp/get-hired-FE)
- [x] BE pushed to GitHub (Upupapp/get-hired-BE)
- [x] BE deployed to Linode via `git pull` + PM2 restart — PM2 status: online
- [x] FE dist deployed to Linode via scp

### Google OAuth Configuration Required (admin action)
- [ ] Google Cloud Console: Add production domain to "Authorized JavaScript origins"
  - Required: `https://gethiredonline.com.ph` (or current prod URL)
  - Required: `http://localhost:4200` for local dev
- [ ] Google Cloud Console: Add `/auth/choose-role` to "Authorized redirect URIs" (if required by Firebase)
- [ ] Firebase Console: Verify Google sign-in provider is enabled for project `get-hired-363107`
- [ ] Firebase Console: Add production domain to authorized domains

### Functional Tests (manual)
- [ ] Click "Sign in with Google" on /signin → Google popup appears
- [ ] Existing user: Google auth → auto-login to correct role
- [ ] New user: Google auth → /auth/choose-role → select role → logged in
- [ ] New user chooses Employer → routes to /recruiter/company
- [ ] New user chooses Job Seeker → routes to /user/dashboard
- [ ] AI Job Create gate: "Continue with Google" → saves previewToken → auth → draft claimed
- [ ] Invalid/expired Google token → error shown (not crash)
- [ ] Rate limit: 11 requests from same IP in 15min → 429 returned
- [ ] Email that already exists → 409 with account_exists message

### Security Tests
- [ ] `selectedRole: 'admin'` → 400 rejected
- [ ] Missing `googleIdToken` → 400
- [ ] Tampered `firebaseIdToken` in choose-role → 401
- [ ] `returnUrl: '//evil.com'` → sanitized (null returned, default navigation used)

### Regression Tests
- [ ] Email/password signin still works normally
- [ ] Email/password signup still works normally
- [ ] Admin panel login unaffected
- [ ] Employer dashboard loads for existing employer
- [ ] Job seeker dashboard loads for existing applicant

---

## Known Limitations (Not Blockers)

1. **In-memory rate limiter**: Resets on PM2 restart, not shared across instances. Acceptable for current single-Linode deployment.
2. **One Tap on Safari iOS**: May not appear due to ITP. Standard button always works.
3. **Pending role state lost on page refresh**: If user refreshes /auth/choose-role, they're redirected to /signin. They must restart Google auth. Acceptable — Firebase token would be re-issued on next Google sign-in.
4. **No analytics on Google auth events**: Deferred to analytics backlog.
5. **No "Sign in with Google" button on Admin login page**: Admin should use email/password. By design.
