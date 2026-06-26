# GetHired — Abuse & Rate Limiting Audit (SECURE 3)
**Date:** 2026-06-26

---

## Rate Limiter Configuration (`server.js`)

### Tier 1 — Global (all routes)
```js
globalLimiter: 500 requests / 15 minutes / IP
```
Applied first, before route mounting.

### Tier 2 — Auth routes (`/api/auth/*`)
```js
authLimiter: 20 requests / 15 minutes / IP
```
Targets: signin, signup, email verify, resend, pw reset, logout. Defends against credential stuffing and brute force.

### Tier 3 — Write operations (`/api` all methods except GET/HEAD/OPTIONS)
```js
writeLimiter: 100 requests / 15 minutes / IP
```
Excludes `/payment/paymongowebhook` (so PayMongo deliveries aren't blocked).

### Tier 4 — Sensitive endpoints
```js
sensitiveLimiter: 10 requests / 1 hour / IP
```
Applied to: `/api/auth/changepassword`, `/api/auth/getpwresetlink`, `/api/auth/archive`

---

## Rate Limiter Analysis

### Positive properties:
- 4 tiers with appropriate escalation of tightness
- Standard headers (`RateLimit-*`) enabled; legacy headers disabled
- Meaningful error messages (not 403/generic)
- Webhook excluded from writeLimiter (correct)
- In-memory store is appropriate for single-server deployment

### Concerns:

#### Concern RL-1: IP trust via X-Forwarded-For
`app.enable('trust proxy')` trusts one proxy hop. If Express is directly internet-facing (no nginx), an attacker can set `X-Forwarded-For: 1.2.3.4` to rotate their apparent IP and bypass per-IP rate limits.

**Mitigation:** Verify nginx is in the request path and strips/rewrites the X-Forwarded-For header. If nginx is configured, the outermost `X-Forwarded-For` value is the real client IP.

#### Concern RL-2: In-memory store resets on restart
PM2 restarts (e.g., after deploy or crash) reset all rate limit counters. An attacker could time brute-force attempts around known deployment cycles.

**Mitigation:** For a single-server deployment this is acceptable. If horizontally scaling, use Redis store (`rate-limit-redis`).

#### Concern RL-3: No per-user rate limiting
Rate limiting is per IP only. An attacker on a residential IP with dynamic addressing can rotate IPs. No per-account (email or UID) rate limiting exists.

**Mitigation:** Would require Firebase UID-based rate limiting after authentication. Complex to implement; deferred.

#### Concern RL-4: Global limit (500/15min) may be too generous
500 GET requests per 15 minutes per IP is 33/minute — appropriate for normal usage. A moderate DDoS from a botnet with distinct IPs (common) would not be stopped by this limit.

**Mitigation:** Cloudflare or nginx-level rate limiting for DDoS scenarios; this is an operational infrastructure decision.

---

## Mass Registration / Account Creation

`POST /auth/signup` — under `authLimiter` (20/15min per IP). Combined with Firebase's own rate limiting on new user creation, this significantly reduces account farming.

---

## Mass Import Abuse

`POST /candidates/multiplecandidate`, `POST /contacts/multiplecontact` — under `writeLimiter` (100/15min) AND require auth. Each call can import a batch of contacts/candidates.

**Concern:** No per-batch size limit validated in middleware. A single request could contain thousands of candidates. The `Promise.allSettled` fix handles concurrency, but no limit on array size.

**Recommendation:** Add max array length validation (e.g., 500 candidates/request max) in the controller.

---

## Summary

| Control | Status | Notes |
|---|---|---|
| Global rate limit | PASS | 500/15min/IP |
| Auth rate limit | PASS | 20/15min/IP |
| Write rate limit | PASS | 100/15min/IP |
| Sensitive endpoint limit | PASS | 10/hour/IP |
| Webhook excluded from rate limit | PASS | Correct |
| IP spoofing (X-Forwarded-For) | MEDIUM | Depends on nginx being in path |
| In-memory store (restart reset) | ACCEPTED | Single server; acceptable |
| Per-user (UID) rate limiting | NOT IMPLEMENTED | Low priority |
| Mass import batch size limit | NOT IMPLEMENTED | P3 recommendation |
