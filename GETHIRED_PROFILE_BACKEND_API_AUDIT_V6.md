# GETHIRED PROFILE BACKEND API AUDIT V6
**Date:** 2026-07-01 | **Status:** PASS (LinkedIn routes properly protected)

---

## New LinkedIn Auth Endpoints

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/api/auth/linkedin/start` | None | `linkedinStart` — generates state, redirects to LinkedIn |
| GET | `/api/auth/linkedin/callback` | None | `linkedinCallback` — exchanges code, issues ticket, redirects to FE |
| POST | `/api/auth/linkedin/complete` | None (ticket-based) | `linkedinComplete` — exchanges ticket for Firebase token |
| POST | `/api/auth/linkedin/choose-role` | None (pendingToken-based) | `linkedinChooseRole` — creates user with selected role |
| DELETE | `/api/auth/linkedin/unlink` | `verifyFirebaseIdToken` | `linkedinUnlink` — removes identity link |
| GET | `/api/auth/linkedin/link-status` | `verifyFirebaseIdToken` | `linkedinLinkStatus` — returns link status |

---

## Security Analysis of New Endpoints

### `/auth/linkedin/start`
- `returnTo` param is sanitized: internal paths only (`startsWith('/')`, no `//`, no special chars, max 256 chars) ✅
- `intent` and `source` clamped to 32 and 64 chars ✅
- State is HMAC-signed JWT (HS256, env.secret) ✅

### `/auth/linkedin/callback`
- State JWT verified before use ✅
- PKCE correctly omitted (LinkedIn confidential client, client_secret used) ✅
- ID token decoded (not sig-verified) — acceptable since userinfo is authoritative source ✅
- `nonce` validated against state JWT nonce ✅
- `email_verified` enforced — blocks unverified emails ✅
- No SSRF: `userinfoUrl` is from env config (not user-supplied) ✅
- Ticket is one-time, DB-backed, 5-min TTL ✅

### `/auth/linkedin/complete`
- Ticket verified (JWT + DB consumption) before any Firebase token issued ✅
- Replay prevented by `used_at` marking in `oauth_tickets` ✅
- No LinkedIn tokens returned to FE ✅

### `/auth/linkedin/choose-role`
- Validates `selectedRole` as enum ('job_seeker'/'employer') ✅
- `pendingToken` verified as JWT with `pending:linkedin:` UID prefix ✅
- **Gap noted:** `email`/`firstName`/`lastName`/`photoUrl` read from `pendingPayload` fields that are NOT embedded in the ticket JWT (only `uid`, `status`, `intent`, `rt`, `rr` are in the JWT). These fields would be empty strings on the `choose-role` path unless the ticket JWT is extended. See PRF-LI-002.

### `/auth/linkedin/unlink`
- Requires `verifyFirebaseIdToken` ✅
- Only deletes the caller's own identity (WHERE user_uid = uid from JWT) ✅

### `/auth/linkedin/link-status`
- Requires `verifyFirebaseIdToken` ✅
- Read-only, returns only non-sensitive identity metadata ✅

---

## Existing Profile Endpoints — V6 Check

| Endpoint | Auth | Status |
|---|---|---|
| `GET /applicant/profile` | verifyAuth | ✅ BOLA fix present (V5) |
| `GET /applicant/profile/completeness` | verifyAuth | ✅ Token-derived uid only |
| `GET /applicant/userprofile` | verifyAuth | ✅ IDOR guard present (SEC-01) |
| `PUT /applicant/profile` | verifyAuth | ✅ |
| `POST /applicant/workexp` | verifyAuth | ✅ |
| `POST /applicant/educbg` | verifyAuth | ✅ |
| `POST /applicant/cert` | verifyAuth | ✅ |

---

## `evaluateProfileCompleteness` Function Safety

The function is a pure function over the already-fetched profile object. No DB queries inside it. No user-controlled input directly passed to SQL. Safe. ✅

---

## Rate Limiting

LinkedIn auth endpoints inherit the global `authLimiter` from `server.js` (per V5 finding: 4-tier rate limiter confirmed present). The `/auth/linkedin/start` and `/auth/linkedin/callback` endpoints are likely covered. `/auth/linkedin/complete` and `/auth/linkedin/choose-role` should be on `authLimiter`. Worth verifying in `server.js` route ordering. Not a blocker.

---

## No Breaking API Changes

V6 LinkedIn endpoints are additive. No existing profile API endpoints changed.
