# GETHIRED_GOOGLE_AUTH_ACCOUNT_LINKING_DUPLICATE_PREVENTION_V1

## Scenario: Existing email+password user signs in with Google

**Flow:**
1. User has an account created via email/password (`user@example.com`)
2. They click "Continue with Google" using the same email
3. BE: Firebase REST `signInWithIdp` succeeds (Firebase links the Google provider to the existing Firebase account, or creates a new Firebase account with this email if not previously linked)
4. BE: `verifyIdToken()` → email = `user@example.com`
5. BE: `getUserCredentialsByEmail('user@example.com')` → FOUND (their existing DB record)
6. BE: `buildSessionResponse()` → returns their existing session with their existing role
7. Response: `{ status: 'authenticated', data: { role: existingRole, ... } }`
8. FE: `storeSession()` → logs them in as their existing account

**Result:** Seamless sign-in. The Google provider links to their existing GetHired account. Their role, company, subscription are all preserved.

---

## Scenario: Firebase EMAIL_EXISTS error

This occurs when Firebase finds a conflicting account that was created with a different provider that prevents automatic linking (rare edge case with Firebase's account linking settings).

**Flow:**
1. Firebase REST `signInWithIdp` returns `EMAIL_EXISTS` error
2. BE: detects `errorCode === 'EMAIL_EXISTS'` in response
3. BE: returns 409 `{ errorCode: 'account_exists_different_provider', message: 'An account with this email already exists...' }`
4. FE: shows `googleError` in UI with message

---

## Scenario: Race condition (two tabs, same new user)

1. Tab A and Tab B both get `role_required` response (same Firebase token)
2. Tab A submits `chooseRole` first → INSERT succeeds
3. Tab B submits `chooseRole` → race guard fires: `getUserCredentialsByEmail` now finds the user
4. Tab B receives 409 with message "Account already exists. Please sign in."
5. Tab B user should sign in normally (same Google → auto-login on next attempt)

---

## Duplicate Prevention Technical Implementation

```
chooseRole handler:
  1. verifyIdToken → email, uid
  2. getUserCredentialsByEmail(email) → if found: return 409
  3. try INSERT user_credentials
  4. catch { code: '23505' } → return 409 (unique constraint)
  5. INSERT users
  6. buildSessionResponse()
```

The double-check (step 2 + catch step 4) covers:
- Application-level race (step 2)
- Database-level race (step 4)

---

## Admin Account Prevention

- `selectedRole` can only be `'job_seeker'` or `'employer'`
- Backend validates and maps: 'job_seeker'→3, 'employer'→2, anything else→400
- Admin (role=1) is structurally impossible via this path
- Existing admin accounts can sign in with Google if their email matches (they get role=1 from `buildSessionResponse`)

---

## Google Account → Multiple GetHired Roles

Not supported. One Google email = one GetHired account = one role. If a user needs both job seeker and employer access, they must create separate accounts with different emails. This matches the existing email/password behavior.
