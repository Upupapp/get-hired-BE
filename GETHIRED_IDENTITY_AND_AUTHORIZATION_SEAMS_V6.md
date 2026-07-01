# GETHIRED IDENTITY AND AUTHORIZATION SEAMS V6
**Date:** 2026-07-01 | Extends V5 with LinkedIn OIDC identity seams

---

## Provider Overview

| Provider | Auth Method | UID Format | DB Tables Written |
|---|---|---|---|
| Email+Password | Custom Firebase token | Firebase UID | user_credentials, users |
| Google OIDC | GIS → Firebase ID token | Firebase UID | user_credentials, users |
| LinkedIn OIDC | Custom Firebase token | `li_<sha256>` | user_credentials, users, auth_identities, oauth_tickets |

---

## Identity Seams — LinkedIn OIDC (NEW V6)

### IS-LI-1: State Parameter Integrity
| Property | Detail |
|---|---|
| Seam | Browser → BE state JWT round-trip |
| Threat | CSRF, state tampering |
| Defense | HS256 JWT signed with `env.secret`, 10-min expiry, verified via `jwt.verify()` before use |
| Gap | None |

### IS-LI-2: PKCE Omission (by Design)
| Property | Detail |
|---|---|
| Seam | Authorization code exchange |
| Threat | Authorization code interception |
| Defense | LinkedIn confidential client uses `client_secret` at token endpoint. PKCE `code_verifier` causes `invalid_client` with LinkedIn's OAuth server. Client secret never leaves BE. |
| Gap | None — acceptable for confidential clients per RFC 6749 |

### IS-LI-3: ID Token Soft-Decode
| Property | Detail |
|---|---|
| Seam | LinkedIn `id_token` claim validation |
| Threat | Forged or replayed ID token |
| Defense | issuer, audience, expiry, nonce all validated from decoded payload. Full sig check omitted because LinkedIn doesn't publish JWKS for confidential client flows at this endpoint. Authoritative identity comes from userinfo endpoint (separate OAuth call with access_token). |
| Gap | None — defense-in-depth justified |

### IS-LI-4: Userinfo as Authoritative Identity
| Property | Detail |
|---|---|
| Seam | LinkedIn userinfo endpoint → GetHired identity |
| Threat | Identity confusion if ID token claims differ from userinfo |
| Defense | BE always fetches userinfo via `GET https://api.linkedin.com/v2/userinfo` using access_token. Userinfo `sub` is the canonical identifier, not the JWT sub. |
| Gap | None |

### IS-LI-5: Email Verification Gate
| Property | Detail |
|---|---|
| Seam | New user account creation |
| Threat | Account takeover via unverified email |
| Defense | `email_verified=false` in userinfo → `redirectError('email_not_verified')` — no account created |
| Gap | None |

### IS-LI-6: One-Time Ticket JTI
| Property | Detail |
|---|---|
| Seam | callback → complete hand-off |
| Threat | Ticket replay (especially across PM2 cluster workers where in-memory state is not shared) |
| Defense | JTI stored in `oauth_tickets` DB table. `consumeTicketDb()` uses atomic UPDATE WHERE used_at IS NULL — first request wins, subsequent requests get null result and 400 |
| Gap | DB table requires periodic cleanup of expired rows (no cron currently) |

### IS-LI-7: Pending Token as Identity Proof
| Property | Detail |
|---|---|
| Seam | complete (role_required) → choose-role |
| Threat | Attacker forging pendingToken to create account with arbitrary liSub |
| Defense | `pendingToken` is HS256 JWT signed with `env.secret`. `linkedinChooseRole` calls `decodeTicketJwt()` which calls `jwt.verify()`. UID field must start with `pending:linkedin:` — validated before extracting liSub. |
| Gap | pendingToken does not embed profile data fields — see gap ACL-G1 |

### IS-LI-8: Firebase Custom Token → Firebase ID Token Chain
| Property | Detail |
|---|---|
| Seam | BE custom token → FE Firebase ID token |
| Threat | Token leakage, replay |
| Defense | Custom token is never returned to FE. BE exchanges it for Firebase ID token via `identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken`. Only the short-lived Firebase ID token is returned to FE. |
| Gap | None |

### IS-LI-9: LinkedIn Identity Lookup Order
| Property | Detail |
|---|---|
| Seam | Linking existing accounts |
| Threat | Account takeover via email matching |
| Defense | 1) Look up by `provider_subject` (liSub) — strongest match. 2) If not found, look up by email — links LinkedIn identity to existing account. Email is verified by LinkedIn before step 2. 3) Only if no match → new user. |
| Security note | Email-based linking is acceptable because email_verified is gated in IS-LI-5. |
| Gap | None |

### IS-LI-10: LinkedIn UID Namespace Isolation
| Property | Detail |
|---|---|
| Seam | User UID generation for LinkedIn users |
| Threat | UID collision between LinkedIn and Firebase UIDs |
| Defense | LinkedIn UIDs are prefixed `li_` — they can never match Firebase UIDs (which are random alphanumeric strings without `li_` prefix). The SHA-256 hash of `'linkedin:' + liSub` provides deterministic but non-reversible UID. |
| Gap | None |

---

## Identity Seams — Google OIDC (Carried Forward from V5)

| Seam | Risk | Status |
|---|---|---|
| `googleIdToken` from FE → Firebase REST API exchange | Low | BE never trusts raw token; exchanges immediately |
| `selectedRole` from FE → server-side mapped to roleId | Low | String enum, numeric never trusted |
| `firebaseIdToken` in choose-role body → re-verified | Low | `verifyIdToken()` called before any DB write |
| `returnUrl` in firebase-session body → sanitized | Low | `sanitizeReturnUrl()` blocks external/dangerous URLs |
| `source` field → cosmetic, 64-char truncated | None | No security impact |

---

## Authorization Middleware

### verifyFirebaseIdToken (BE middleware)
- Used by: `DELETE /auth/linkedin/unlink`, `GET /auth/linkedin/link-status`, all billing routes, and other protected endpoints
- Reads `Authorization: Bearer <token>` header
- Calls Firebase Admin SDK `verifyIdToken()`
- Sets `req.user = { uid, email, ... }` on success
- Returns 401 on any failure

### Route Mounting Order (CRITICAL)
LinkedIn and Google auth routes are mounted BEFORE `billingRoutes` in `server.js`. This is intentional: `billingRoutes` has a catch-all `validateFirebaseIdToken` middleware. Routes mounted after it without their own auth gate would be blocked. LinkedIn/Google public endpoints (`/start`, `/callback`, `/complete`, `/choose-role`) must remain BEFORE billing routes.

---

## New DB Tables — Identity Seam Impact

### gethired.auth_identities
```sql
user_uid          VARCHAR  FK → user_credentials.uid
provider          VARCHAR  (e.g. 'linkedin')
provider_subject  VARCHAR  (LinkedIn sub — unique per provider)
provider_email    VARCHAR
provider_email_verified BOOLEAN
provider_name     VARCHAR  (display name)
provider_picture  VARCHAR
linked_at         TIMESTAMP
last_login_at     TIMESTAMP
updated_at        TIMESTAMP
UNIQUE (provider, provider_subject)
```
**Seam notes:**
- FK to `user_credentials.uid` ensures orphan identities cannot exist (for linked users)
- For `role_required` path: identity is NOT pre-inserted (uid is null/pending)
- Identity is only inserted after user creation in `createLinkedinUser()`

### gethired.oauth_tickets
```sql
jti         UUID/VARCHAR  PK
uid         VARCHAR       (ticketUid — may be 'pending:linkedin:<liSub>')
data        JSON          (full ticketData including LinkedIn profile fields)
used_at     TIMESTAMP     (NULL = unused)
expires_at  TIMESTAMP
created_at  TIMESTAMP (default NOW())
```
**Seam notes:**
- `data` column stores sensitive LinkedIn profile fields (email, name, photo) as JSON
- Should be treated as PII — add a scheduled cleanup of rows WHERE expires_at < NOW()
- The `payload` column referenced in the STITCH command spec corresponds to `data` in actual implementation
- `used` BOOLEAN in spec corresponds to `used_at IS NOT NULL` in actual implementation (timestamp-based, not boolean)

---

## Summary Risk Table

| ID | Seam | Risk | Status |
|---|---|---|---|
| IS-LI-1 | State JWT integrity | Low | PASS — HS256 signed |
| IS-LI-2 | PKCE omission | Low | PASS — confidential client |
| IS-LI-3 | ID token soft decode | Low | PASS — userinfo is authoritative |
| IS-LI-4 | Userinfo authority | Low | PASS |
| IS-LI-5 | Email verification gate | None | PASS |
| IS-LI-6 | JTI single-use | Low | PASS — DB atomic |
| IS-LI-7 | Pending token integrity | Low | PASS — JWT signed; profile data gap is quality not security |
| IS-LI-8 | Custom token chain | Low | PASS |
| IS-LI-9 | Identity lookup order | Low | PASS |
| IS-LI-10 | UID namespace | Low | PASS |
| oauth_tickets cleanup | PII exposure | Low | OPEN — no cron purge |
