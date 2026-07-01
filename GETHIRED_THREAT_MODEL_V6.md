# GETHIRED THREAT MODEL — V6
**Date:** 2026-07-01 | **Focus:** LinkedIn OIDC attack surface

---

## STRIDE Analysis — LinkedIn OIDC

### Spoofing
| Threat | Mitigated? | Mechanism |
|---|---|---|
| Attacker forges state parameter | YES | State is HS256-signed JWT; cannot be forged without `env.secret` |
| Attacker replays authorization code | YES | Code is single-use at LinkedIn side; short TTL |
| Attacker supplies fake LinkedIn ID token | PARTIAL | ID token is decoded not verified; mitigated by authoritative `userinfo` call |
| Attacker replays main ticket | YES | DB-backed single-use via `consumeTicketDb` with row-level lock |
| Attacker replays pending token (role_required) | NO — LI-SEC-001 | Pending token not stored in DB; replayable within 5-min window |
| Attacker presents another user's LinkedIn identity | NO (BOLA) | unlink uses `req.user.uid` — correct; but `choose-role` uses only the pending token uid, not a Firebase auth check |

### Tampering
| Threat | Mitigated? | Mechanism |
|---|---|---|
| Tamper with ticket JWT claims (uid, role) | YES | JWT signed with `env.secret`; tampering invalidates signature |
| Tamper with pending token to change liSub | YES | Same JWT signing |
| Tamper with `returnTo` to open redirect | YES | `sanitizeReturn()` enforces leading `/`, no `//`, no special chars, 256-char cap |
| Tamper with `selectedRole` to assign admin (role 1) | YES | Server maps only `job_seeker`→3, `employer`→2; anything else → 400 |

### Repudiation
| Threat | Mitigated? | Mechanism |
|---|---|---|
| User denies LinkedIn account creation | PARTIAL | `console.log` of uid (truncated) — no structured audit log |
| User denies unlinking LinkedIn | PARTIAL | `console.log` only — recommend writing to audit table |

### Information Disclosure
| Threat | Mitigated? | Mechanism |
|---|---|---|
| LinkedIn access token leaked to FE | NO — by design | Access token never returned; only Firebase ID token |
| Ticket in URL captured by Referer header or logs | MITIGATED | Ticket is single-use (5 min); even if captured, becomes invalid after first use |
| Pending token in URL/memory | PARTIAL — LI-SEC-001 | Pending token is replayable; if captured could allow duplicate account creation attempts |
| Email/profile data in console.log | LOW | Only uid substring (8/12 chars) logged; no PII |

### Denial of Service
| Threat | Mitigated? | Mechanism |
|---|---|---|
| Flood `/start` to spam LinkedIn redirects | PARTIAL | Global rate limiter (express-rate-limit) in server.js; no specific limit on this route |
| Flood `/complete` with random ticket JWTs | PARTIAL | JWT decode fails fast; DB query still hits |
| Flood `/choose-role` with same pending token | PARTIAL — LI-SEC-001 | Without DB backing, each call does Firebase + DB work |
| Expired ticket accumulation in oauth_tickets | MITIGATED | createAuthIdentitiesTable.js cleans rows >1hr expired; recommend cron job |

### Elevation of Privilege
| Threat | Mitigated? | Mechanism |
|---|---|---|
| Attacker creates admin account via LinkedIn | YES | `createLinkedinUser` only accepts roleId 2 or 3; intent mapping enforced |
| Attacker links LinkedIn to another user's account | YES | `linkedinUnlink` scoped to `req.user.uid` from Firebase token |
| Attacker uses old ticket to re-authenticate | YES | `consumeTicketDb` marks used; DB single-use guarantee |

---

## Data Flow Diagram — LinkedIn OIDC

```
[User Browser]
    |
    |-- GET /api/auth/linkedin/start
    |   [BE generates state JWT (HS256, 10min), redirects to LinkedIn]
    |
    |-- [LinkedIn OAuth2 flow]
    |
    |-- GET /api/auth/linkedin/callback?code=...&state=...
    |   [BE: verifies state JWT, exchanges code for tokens (client_secret),
    |        fetches userinfo, resolves/creates GetHired user,
    |        issues one-time ticket JWT, stores in oauth_tickets,
    |        redirects to FE /linkedin/complete?ticket=...]
    |
    |-- FE /linkedin/complete?ticket=...
    |   [Angular: reads ticket from URL, calls POST /api/auth/linkedin/complete]
    |
    |-- POST /api/auth/linkedin/complete { ticket }
    |   [BE: verifies ticket JWT, consumes in DB (used_at),
    |        creates Firebase custom token, exchanges for Firebase ID token,
    |        returns session data]
    |
    |-- (if role_required) POST /api/auth/linkedin/choose-role
        [BE: verifies pending token JWT (NOT DB-backed — LI-SEC-001),
             creates user, issues Firebase ID token]
```

---

## External Trust Boundaries

| Boundary | Trust Level | Controls |
|---|---|---|
| LinkedIn OAuth2 server | Trusted IDP | State JWT prevents CSRF; client_secret on BE only |
| LinkedIn userinfo endpoint | Authoritative | Accessed with short-lived access token; result used as ground truth |
| Firebase Identity Toolkit | Trusted | Custom token → ID token; Firebase Admin SDK verifies incoming ID tokens |
| FE (Angular SPA) | Untrusted | Only receives Firebase ID token; all LinkedIn tokens stay on BE |
| PM2 worker 2 | Same trust as worker 1 | Shared DB for ticket state; prevents replay across workers |
