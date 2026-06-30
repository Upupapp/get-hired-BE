# GETHIRED_GOOGLE_AUTH_FLOW_MAP_V1

## Overview
Complete flow map for Google/Gmail authentication in GetHired, covering sign-in, sign-up, and role classification paths.

---

## Flow 1: Existing Google User Sign-In

```
User clicks "Continue with Google"
  → GIS library calls credential callback with googleIdToken
  → FE: GoogleAuthService.exchangeGoogleToken(googleIdToken)
  → POST /api/auth/google/firebase-session { googleIdToken }
  → BE: IP rate limit check (10 req/15min)
  → BE: Firebase REST signInWithIdp → Firebase ID token
  → BE: firebaseAdmin.auth().verifyIdToken() → decoded token
  → BE: getUserCredentialsByEmail(email) → found
  → BE: buildSessionResponse() → same shape as loginUser
  → Response: { success: true, status: 'authenticated', data: { token, refreshToken, role, ... } }
  → FE: GoogleAuthService.storeSession(data) → localStorage
  → FE: navigate by role (1→/admin, 2→/recruiter/*, 3→/user/dashboard)
```

---

## Flow 2: New Google User — Role Classification

```
User clicks "Continue with Google" (first time)
  → GIS → googleIdToken
  → POST /api/auth/google/firebase-session
  → BE: Firebase REST + verifyIdToken → OK
  → BE: getUserCredentialsByEmail(email) → NOT FOUND
  → Response: { success: true, status: 'role_required',
                firebaseIdToken, googleEmail, inferredFirstName, inferredLastName, googlePhotoUrl,
                expiresInMinutes: 55 }
  → FE: GoogleAuthService stores pending state IN MEMORY (not localStorage)
  → FE: router.navigate(['/auth/choose-role'])
  → User sees RoleClassificationComponent: Job Seeker | Employer cards
  → User picks role → POST /api/auth/choose-role { firebaseIdToken, selectedRole }
  → BE: re-verifyIdToken (never trusts client role)
  → BE: race guard (check user exists first)
  → BE: INSERT user_credentials + users
  → BE: welcome email (non-fatal)
  → BE: buildSessionResponse()
  → Response: { success: true, status: 'authenticated', data: ... }
  → FE: storeSession(data) → navigate by role
```

---

## Flow 3: Account Linking (Email+Password Exists)

```
User clicks "Continue with Google"
  → BE: Firebase REST signInWithIdp → success
  → BE: verifyIdToken OK
  → BE: getUserCredentialsByEmail → FOUND (existing email+password account)
  → BE: buildSessionResponse() → same session (account merged at session level)
  → Response: { success: true, status: 'authenticated', data: ... }
  → FE: storeSession → navigate by role
```

Duplicate-provider path (EMAIL_EXISTS from Firebase):
```
  → Firebase REST returns EMAIL_EXISTS
  → BE: 409 { errorCode: 'account_exists_different_provider',
               message: 'An account with this email already exists. Sign in with your email and password.' }
  → FE: googleError shown in UI
```

---

## Flow 4: AI Job Create Panel Gate

```
User generates anonymous preview → sees gate card
  → User clicks "Continue with Google" in gate card
  → FE: previewService.savePendingToken(previewToken) — saved BEFORE auth
  → Google Auth flows (same as Flow 1 or 2 above)
  → On success (existing user): closed.emit() → employer claimed via previewToken
  → On success (new user, role_required): navigate to /auth/choose-role
    → After role selection: navigate by role with previewToken still in localStorage
    → Employer dashboard auto-claims draft via previewToken
```

---

## Flow 5: One Tap / FedCM

```
Page loads with active Google session
  → Google One Tap prompt appears (if user hasn't dismissed)
  → On credential: same as Flow 1 or 2
  → FedCM: browser-native, same credential callback
```

---

## Security Properties

- Google tokens NEVER stored in localStorage, sessionStorage, URL, or logs
- Role never trusted from client — always re-verified on BE
- Admin role (1) cannot be obtained via Google auth
- IP rate limit on /firebase-session: 10 req/IP/15min
- returnUrl server-validated: only internal paths (starts with `/`, not `//`)
- Pending Firebase token stored in-memory only (cleared on page refresh)
- email_verified enforced on BE
