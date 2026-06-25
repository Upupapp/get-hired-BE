# GetHired Rate Limiting Sprint Log

**Date:** 2026-06-25  
**Sprint:** P1 blocker — express-rate-limit (invite-only beta gate)

---

## Package Installed

| Package | Version | Node compatibility |
|---|---|---|
| express-rate-limit | 6.11.2 | Node 12+ (v8 requires Node 16+; v6 chosen for Node 14 prod server) |

Note: v8 was initially installed but failed on Node 14.21.3 due to optional-chaining (`?.`) syntax not supported by that V8 build. Downgraded to v6 which has no optional-chaining and passes a clean syntax check.

---

## Entry File Modified

`server.js` — Express entry loaded via `start.js` through the `esm` shim (babel-polyfill + ESM `import`/`export` syntax).

`start.js` is the npm start target (`node start.js`); it's a 2-line shim that enables ESM for `server.js`. All middleware and route mounting lives in `server.js`.

---

## Middleware Stack Position

Rate limiters are inserted **after** body-parser/cors/compression but **before** all route mounting. This ensures:
- Limits apply to every request before any business logic runs
- `trust proxy` is already enabled (line 94), so IP extraction from `X-Forwarded-For` is correct for the Linode deployment behind a proxy

Middleware order in `server.js`:
1. compression
2. cors
3. express.json / express.urlencoded
4. trust proxy
5. **globalLimiter** ← Tier 1
6. **authLimiter** on `/api/auth` ← Tier 2
7. **writeLimiter** on `/api` ← Tier 3
8. **sensitiveLimiter** on specific paths ← Tier 4
9. Route mounting (userRoutes, applicationRoutes, …)

---

## 4 Tiers

### Tier 1 — Global Catch-All

| Setting | Value |
|---|---|
| windowMs | 900,000 ms (15 minutes) |
| max | 500 |
| Routes | All routes (`app.use(globalLimiter)`) |
| skip | None |
| Headers | `RateLimit-*` (RFC 6585); no `X-RateLimit-*` |
| Purpose | Catch sustained abuse (scrapers, DDoS) without impacting legitimate users |

### Tier 2 — Auth Endpoints

| Setting | Value |
|---|---|
| windowMs | 900,000 ms (15 minutes) |
| max | 20 |
| Routes | `/api/auth` (covers all: signin, signup, logout, email verify, resend, pw reset link) |
| skip | None |
| Purpose | Brute-force / credential-stuffing defence on all auth entry points |

### Tier 3 — Write Operations

| Setting | Value |
|---|---|
| windowMs | 900,000 ms (15 minutes) |
| max | 100 |
| Routes | `/api` (all routes) |
| skip | GET, HEAD, OPTIONS — only POST/PUT/DELETE count against limit |
| Purpose | Prevent mass creation/modification (job spam, bulk application stuffing, etc.) |

### Tier 4 — Sensitive Individual Endpoints

| Setting | Value |
|---|---|
| windowMs | 3,600,000 ms (1 hour) |
| max | 10 |
| Routes | `/api/auth/changepassword`, `/api/auth/getpwresetlink`, `/api/auth/archive` |
| skip | None |
| Purpose | Account takeover / deletion abuse. 10 attempts per hour is generous for legitimate use, strict for attackers |

---

## Store

**In-memory (default MemoryStore)** — appropriate because:
- Single-server Linode deployment (no horizontal scaling)
- No Redis infrastructure in the stack
- Memory store resets on server restart, which is acceptable for rate-limit windows

**Deferred:** If the deployment moves to multiple nodes, replace with `rate-limit-redis` cluster store so limits are shared across instances.

---

## Response Format

All limiters return `{ "message": "..." }` JSON — matching the existing BE error envelope used across all controllers.

---

## Verification

Syntax/load check performed:  
`node start.js` on Node 14.21.3 — **PASS** (no import errors, no rate-limit initialization errors)

The server exited with `EADDRINUSE :3000` because another server instance was already running on port 3000. This is not a rate-limit issue — it confirms the module loaded and initialized all 4 limiters without error before reaching the `listen()` call.

The one other message (`API key does not start with "SG."`) is a SendGrid init warning unrelated to rate limiting.

---

## No Changes Outside server.js

- No controller files changed
- No route files changed
- No auth behavior changed
- No payment/subscription behavior changed
- No route guards weakened
- Health check: no dedicated health endpoint exists in this codebase; no skip needed
