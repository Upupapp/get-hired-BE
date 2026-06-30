# GETHIRED_GOOGLE_AUTH_SECURITY_PRIVACY_QA_V1

## Security Audit Results

### PASS — Token Handling
- [ x ] Google ID token never stored in localStorage, sessionStorage, URL, or server logs
- [ x ] Firebase ID token sent over HTTPS only (POST body)
- [ x ] Pending Firebase token in role_required response is short-lived (55min)
- [ x ] Pending Firebase token stored in-memory on FE only (cleared on refresh)
- [ x ] `returnUrl` sanitized server-side: only allows paths starting with `/`, blocks `//evil.com`

### PASS — Role Security
- [ x ] `selectedRole` validated on BE: only `'job_seeker'` or `'employer'` accepted
- [ x ] Admin role (roleId=1) is impossible via Google auth path
- [ x ] Client-supplied `role`, `email`, `email_verified`, `provider` are all ignored
- [ x ] Firebase token re-verified in `chooseRole` — cannot bypass with stale/forged token

### PASS — Rate Limiting
- [ x ] `/api/auth/google/firebase-session` rate-limited: 10 req/IP/15min
- [ x ] `/api/auth/choose-role` no separate rate limit (Firebase token already consumed once)

### PASS — Duplicate / Race Conditions
- [ x ] EMAIL_EXISTS from Firebase → 409 with clear error message (no account merge silently)
- [ x ] Race guard in `chooseRole`: checks user existence before insert
- [ x ] PostgreSQL unique constraint error (23505) caught and returned as 409

### PASS — Data Minimization
- [ x ] Only `profile` scope requested (implicit via GIS) — no Gmail/Drive/Calendar/Contacts
- [ x ] Google photo URL stored (user-visible UI only, not used for identity)
- [ x ] No PII logged in server output

### PASS — Existing Auth Not Broken
- [ x ] `verifyAuth.js` middleware unchanged
- [ x ] `loginUser` / `signUp` flows unchanged
- [ x ] `user_credentials` table schema unchanged
- [ x ] Firebase Admin SDK usage unchanged

---

## Privacy Compliance

| Item | Status |
|---|---|
| Google scopes limited to email + profile | PASS |
| No Google token persisted past session | PASS |
| User photo URL from Google (user can see it) | PASS — user's own data |
| Email stored in existing DB (same as email/password) | PASS |
| No analytics tracking of Google auth events | In backlog |

---

## Threat Model

| Threat | Mitigation |
|---|---|
| Attacker supplies forged googleIdToken | Firebase REST + verifyIdToken rejects it |
| Attacker replays old googleIdToken | Firebase token TTL + verifyIdToken |
| Attacker supplies own firebaseIdToken to choose-role | Re-verified; only their own account affected |
| Attacker probes /firebase-session to enumerate emails | 10 req/IP/15min rate limit |
| Open redirect via returnUrl | sanitizeReturnUrl() blocks `//` and external URLs |
| Admin account creation via Google | selectedRole only allows 2 or 3; BE rejects anything else |
| Race condition creates duplicate user | Race guard + 23505 handler |
