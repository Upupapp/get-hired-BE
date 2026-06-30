# GETHIRED_GOOGLE_AUTH_DATA_MODEL_V1

## No Schema Changes Required

Google authentication stores users in the existing tables. No new columns or tables were added.

---

## Existing Tables Used

### user_credentials
| Column | Type | Google Auth Value |
|---|---|---|
| uid | varchar | Firebase UID (from verifyIdToken) |
| email | varchar | Verified Google email |
| password | varchar | bcrypt(`uid + '_google_provider'`) — prevents email login |
| role | integer | 2 (employer) or 3 (job seeker) — never 1 |
| created_date | timestamp | NOW() |

Password placeholder pattern: `hashPassword(uid + '_google_provider')` — functionally prevents password-based login on Google accounts without breaking the schema's NOT NULL constraint.

### users
| Column | Type | Google Auth Value |
|---|---|---|
| uid | varchar | Firebase UID (same as user_credentials.uid) |
| email | varchar | Google email |
| firstname | varchar | Inferred from displayName or email prefix |
| lastname | varchar | Inferred from displayName or '' |
| photo_url | varchar | Google profile photo URL |
| created_date | timestamp | NOW() |

---

## Session Token Storage (client-side)

Same as email/password login — no new localStorage keys:

| Key | Value |
|---|---|
| `token` | `'Bearer ' + firebaseIdToken` |
| `token_authorization` | firebaseIdToken (without Bearer prefix) |
| `refreshToken` | Firebase refresh token |
| `role` | role integer |
| `state` | `'true'` |
| `user` | JSON with `_id, email, firstName, lastName` (+ `companyId, companyName` for role=2) |

---

## In-Memory State (FE, clears on page refresh)

GoogleAuthService private fields (NOT persisted):
- `_pendingFirebaseToken` — role_required Firebase token
- `_pendingFirstName`, `_pendingLastName` — from Google profile
- `_pendingEmail`, `_pendingPhotoUrl` — for role classification display
- `_pendingDisplayName`, `_pendingRefreshToken`

These are cleared by `clearPendingRoleState()` after role selection completes.

---

## Pending Intent Storage

| Intent | Key | Source |
|---|---|---|
| AI Job Create draft | `gh_preview_token` (via PublicJobPreviewService) | localStorage |
| Job Apply | `gh_pending_apply_job_id` | localStorage |
| CV Doctor | per-service pattern | localStorage |

These keys are preserved through Google auth flow and consumed after successful sign-in.
