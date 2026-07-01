# GETHIRED STITCH RELEASE GATE V6
**Date:** 2026-07-01 | LinkedIn OIDC + Company Setup Modal

---

## RESULT: GO WITH CAUTION

All V6 new integrations verified. One medium data-quality gap (pending token profile fields) documented but not a crash. No critical blockers.

---

## Gate A: Contract Compatibility

**Status: PASS**

| Contract | FE Sends | BE Expects | Match |
|---|---|---|---|
| `/auth/linkedin/start` | Query params `intent`, `returnTo` | Query params, optional | YES |
| `/auth/linkedin/complete` | `{ ticket: string }` | `body.ticket` string | YES |
| `/auth/linkedin/choose-role` | `{ linkedinPendingToken, selectedRole }` | `body.linkedinPendingToken`, `body.selectedRole` | YES |
| `/auth/linkedin/unlink` | `Authorization: Bearer <token>` header | `verifyFirebaseIdToken` middleware | YES |
| `/auth/linkedin/link-status` | `Authorization: Bearer <token>` header | `verifyFirebaseIdToken` middleware | YES |
| `SetupSuccessModalData` | `{ companyName, companySlug, profileCompleteness }` | `@Inject(MAT_DIALOG_DATA)` | YES |

All 6 LinkedIn endpoints and modal data contract verified.

---

## Gate B: Auth/Authorization Safety

**Status: PASS**

| Check | Status |
|---|---|
| State JWT HS256 signed, 10-min TTL | PASS |
| No PKCE (confidential client — by design) | PASS |
| Email verification gated before account creation | PASS |
| Ticket JTI single-use (DB atomic update) | PASS |
| Pending token HS256 signed, uid must start with `pending:linkedin:` | PASS |
| Firebase custom token never returned to FE | PASS |
| LinkedIn client secret never returned to FE | PASS |
| linkedinAuthRoutes mounted before billingRoutes catch-all | PASS |
| `verifyFirebaseIdToken` on unlink and link-status | PASS |

---

## Gate C: LinkedIn Feature Gate Behavior

**Status: PASS**

| Check | Status |
|---|---|
| `LINKEDIN_AUTH_ENABLED=false` → all 6 endpoints return 503 | PASS (code verified) |
| Missing `LINKEDIN_CLIENT_ID` or `LINKEDIN_REDIRECT_URI` → `/start` returns 503 | PASS (code verified) |
| `LINKEDIN_AUTH_ENABLED` env var not set → `isEnabled()` returns false (default disabled) | PASS |

---

## Gate D: Modal Contract

**Status: PASS**

| Check | Status |
|---|---|
| `SetupSuccessModalData` interface matches data passed by `dialogSuccess()` | PASS |
| Modal reads data with safe fallbacks (`|| 'Your company'`, `|| ''`, `|| 0`) | PASS |
| Navigation is internal to modal (not via afterClosed subscription) | PASS — intentional design |
| `viewPublicProfile()` guards on `companySlug` truthy before opening tab | PASS |

---

## Gate E: Must-Not-Break Flows

**Status: PASS**

| Flow | Status |
|---|---|
| Email+password signin (`/api/auth/signin`) — unmodified | PASS |
| Google auth (`/api/auth/google/firebase-session`) — unmodified | PASS |
| Google choose-role (`/api/auth/choose-role`) — unmodified | PASS |
| Session localStorage keys — identical across all 3 providers | PASS |
| Angular guards (`localStorage.getItem('role')`) — all 3 providers write same key | PASS |

---

## Gate F: Rate Limiter Coverage

**Status: PASS**

| Check | Status |
|---|---|
| LinkedIn endpoints under `authLimiter` (20 req/15min) | PASS — all under `/api/auth` |
| LinkedIn endpoints under `writeLimiter` (POST/DELETE) | PASS — mounted under `/api` |
| Protected endpoints (unlink, link-status) bypass global limiter via Authorization header | PASS — existing behavior |

---

## Open Items (Non-Blocking)

| Item | Severity | Blocker? |
|---|---|---|
| Pending token missing profile data fields (empty name on role_required new users) | Medium | No — graceful fallback, user can update profile |
| `oauth_tickets` no expiry cleanup (PII accumulation) | Low | No — operational concern, not launch blocker |
| `link-status` flat response shape (no `success` wrapper) | Low | No — FE uses `Observable<any>` |

---

## Deployment Checklist

- [ ] `LINKEDIN_AUTH_ENABLED=true` in production env
- [ ] `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` set
- [ ] LinkedIn OAuth app has correct redirect URI registered
- [ ] `gethired.auth_identities` and `gethired.oauth_tickets` tables exist in production DB
- [ ] PM2 restart after env var changes
- [ ] End-to-end LinkedIn test with a real LinkedIn account

---

## Previous Gate Status (V5, Carried Forward)

| Gate | V5 Status |
|---|---|
| Google Auth requestUri fix | DEPLOYED (V5) |
| Google OAuth client (deleted_client) | OPEN — user must create new Cloud Console web client |

---

## Final Verdict

**GO WITH CAUTION** — LinkedIn OIDC is contract-correct and safe to deploy once LinkedIn Developer App is configured and env vars are set. The pending token profile data gap is medium severity but not a crash or security issue. Ship and monitor.
