# GETHIRED PROFILE DATA FOUNDATION AUDIT V6
**Date:** 2026-07-01 | **Status:** CONFIRMED (same as V5; LinkedIn adds auth_identities)

---

## Core Tables (confirmed from V5, unchanged)

| Table | Purpose | LinkedIn writes? |
|---|---|---|
| `gethired.users` | Display name, email, photo_url | YES — firstname, lastname, email, photo_url |
| `gethired.user_credentials` | Auth (uid, email, password hash, role) | YES — uid, email, dummy hash, role |
| `gethired.auth_identities` | OAuth provider links | YES — provider='linkedin', provider_subject, provider_email, provider_name, provider_picture |
| `gethired.applicants_profile` | Job seeker's profile (title, bio, salary, etc.) | NO — not created on signup (P1 gap) |
| `gethired.work_experience` | Work history entries | NO |
| `gethired.educational_background` | Education entries | NO |
| `gethired.applicant_skills` | Skills array | NO |
| `gethired.documents` | Uploaded files (CV, etc.) | NO |
| `gethired.oauth_tickets` | One-time auth tickets | YES — during LinkedIn flow (temporary, consumed) |

---

## LinkedIn UID Scheme

LinkedIn users get a deterministic UID: `li_` + SHA-256(`linkedin:` + liSub).substr(0, 28)

This is NOT a real Firebase UID (no Firebase `createUser` call). Firebase custom tokens are issued using this derived UID as the `uid` parameter to `firebaseAdmin.auth().createCustomToken()`. Firebase accepts any string as a custom token UID.

**Risk:** If Firebase Admin SDK is used elsewhere to look up users by UID (e.g., `auth().getUser(uid)`), it may fail for LinkedIn UIDs since they were never created via Firebase's user management APIs. Scope: low-risk as long as GetHired only uses Firebase for JWT issuance/verification, not user management.

---

## New Table: `gethired.oauth_tickets`

Added for LinkedIn OIDC. Schema inferred from queries:
```sql
oauth_tickets (
  jti        TEXT PRIMARY KEY,
  uid        TEXT,
  data       JSONB,
  expires_at TIMESTAMPTZ,
  used_at    TIMESTAMPTZ
)
```

Short-lived (5 min TTL), single-use. Consumed during `linkedinComplete`. Not a profile data concern — operational auth plumbing only.

---

## Profile Data Coverage by Auth Provider

| Provider | users | user_credentials | auth_identities | applicants_profile stub |
|---|---|---|---|---|
| Email+password | Partial (no photo) | Full | No | No |
| Google OAuth | Full (name+photo) | Full | No | No |
| LinkedIn OIDC | Full (name+photo) | Full | Yes | No |

All three providers share the same P1 gap: no `applicants_profile` stub created on signup.

---

## Data Integrity Checks

- `user_credentials.uid` = `users.uid` = `auth_identities.user_uid` → consistent for LinkedIn users ✅
- `applicants_profile.user_id` would reference `user_credentials.uid` (if it existed) ✅
- `ON CONFLICT DO NOTHING` guards on all LinkedIn INSERTs prevent duplicates on retry ✅
- Dummy password for LinkedIn users is hashed (not plaintext) ✅ — `hashPassword(uid + '_linkedin_provider')`

---

## Conclusion

Data foundation for LinkedIn auth is sound. The missing `applicants_profile` stub is a product gap (no profile data, not a schema error). The `oauth_tickets` table is correctly implemented as operational auth state.
