# GETHIRED ABUSE & RATE LIMITING AUDIT — V6
**Date:** 2026-07-01 | **Focus:** LinkedIn OIDC endpoints

---

## LinkedIn OIDC Rate Limiting

| Endpoint | Specific Rate Limit | Global Rate Limit | Assessment |
|---|---|---|---|
| GET /auth/linkedin/start | None specific | YES (globalLimiter) | LOW RISK — only generates state, no heavy computation |
| GET /auth/linkedin/callback | None specific | YES (globalLimiter) | MEDIUM — LinkedIn code exchange + DB writes |
| POST /auth/linkedin/complete | None specific | YES (globalLimiter) | MEDIUM — Firebase token creation on every call |
| POST /auth/linkedin/choose-role | None specific | YES (globalLimiter) | MEDIUM — Firebase token + DB user creation |
| DELETE /auth/linkedin/unlink | None specific | YES (globalLimiter) | LOW — auth-gated, low frequency |
| GET /auth/linkedin/link-status | None specific | YES (globalLimiter) | LOW — read-only, auth-gated |

---

## Abuse Vectors

### ABUSE-001 (P1) — /complete + /choose-role Flooding
An attacker with a `linkedinPendingToken` (from intercepted URL or other means) can replay `/choose-role` repeatedly during the 5-minute window due to LI-SEC-001. Each call hits Firebase + DB. The global limiter provides coarse protection but a dedicated `authLimiter` (10 req/15min) should be applied to these endpoints.

### ABUSE-002 (P1 — carried from V5) — Easy Job Post AI Extraction Rate Limit
Still open — not related to LinkedIn OIDC.

### ABUSE-003 (P2) — LinkedIn /start Spam
A bot can call `/start` repeatedly to generate signed state JWTs and initiate LinkedIn OAuth flows (spam to LinkedIn). Each call is cheap (JWT sign only). Mitigated by global rate limiter. Consider adding `authLimiter` as well.

---

## Rate Limiter Configuration (from V5)

The existing `server.js` rate limiters:
- `globalLimiter`: applies to all routes
- `authLimiter`: applies to auth-specific routes (email/password)
- `writeLimiter`: applies to write operations
- `sensitiveLimiter`: applies to sensitive endpoints

**LinkedIn OIDC routes should use `authLimiter` in addition to `globalLimiter`.**

Recommended addition to `linkedinAuthRoutes.js`:
```
import authLimiter from '../middleware/rateLimiter'; // (verify exact import path)
router.post('/auth/linkedin/complete', authLimiter, linkedinComplete);
router.post('/auth/linkedin/choose-role', authLimiter, linkedinChooseRole);
router.get('/auth/linkedin/start', authLimiter, linkedinStart);
```

This is a low-risk, high-value change — `express-rate-limit` is already installed.
