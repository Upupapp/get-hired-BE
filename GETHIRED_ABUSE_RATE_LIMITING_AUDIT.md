# GETHIRED ABUSE & RATE LIMITING AUDIT — QA Cycle 11
Generated: 2026-06-25 | Focus: Verify 4-tier rate limiting deployment

---

## Rate Limiting Implementation Review

### express-rate-limit@6.11.2 Installed
Confirmed in `package.json`:
```json
"express-rate-limit": "^6.11.2"
```
Imported correctly in `server.js`:
```js
import { rateLimit } from "express-rate-limit";
```

---

## Tier Analysis

### Tier 1 — Global Catch-All
```js
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});
app.use(globalLimiter); // line 99
```

**Assessment:**
- Applied at root (`app.use`) before all routes — correct
- 500 req/15min per IP — appropriate for a job platform
- `standardHeaders: true` — sends RFC 6585 `RateLimit-*` headers — correct
- `legacyHeaders: false` — suppresses deprecated `X-RateLimit-*` — correct
- **VERDICT: CORRECT**

---

### Tier 2 — Auth Endpoints
```js
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again in 15 minutes." },
});
app.use("/api/auth", authLimiter); // line 102
```

**Assessment:**
- Applied to `/api/auth/*` — covers signin, signup, verifyemail, resend, getpwresetlink, changepassword, logout, getverificationlink, manualexcelverification
- 20 req/15min — tight enough to stop brute-force; 20 attempts is still reasonable for legitimate users (e.g., multiple failed login attempts)
- Applied AFTER Tier 1 in middleware stack — additive (requests consume from BOTH Tier 1 and Tier 2 buckets)
- Does Tier 2 "narrow" correctly before Tier 1? NO — it is additive, not nested. The Tier 2 limit (20) is the effective ceiling for `/api/auth/*` since it's much tighter than Tier 1 (500). This is correct behavior.
- **VERDICT: CORRECT**

---

### Tier 3 — Write Operations
```js
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
  skip: (req) =>
    req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
});
app.use("/api", writeLimiter); // line 105
```

**Assessment:**
- Applied to all `/api/*` routes
- Skips GET, HEAD, OPTIONS — allows read-heavy workloads without hitting write limits
- POST, PUT, DELETE, PATCH all consume from this bucket
- 100 writes/15min — appropriate; a legitimate employer won't POST 100 times in 15 minutes
- **Is the GET skip correct?** YES — assuming no mutation uses GET method (verified below)

**Critical Verification: Mutation Endpoints Using GET Method**

Checked all route files for `router.get(...)` with mutation behavior:
- `GET /api/auth/getpwresetlink` — sends a password reset email, does NOT mutate state in DB. This is a safe GET.
- `GET /api/job/details` — read-only public endpoint. SAFE.
- `GET /api/company/details` — read-only. SAFE.
- All other GET routes: read-only by design.

**No mutations found on GET routes. The skip is correct.**

- **VERDICT: CORRECT**

---

### Tier 4 — Sensitive Endpoints
```js
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in an hour." },
});
app.use("/api/auth/changepassword", sensitiveLimiter); // line 108
app.use("/api/auth/getpwresetlink", sensitiveLimiter);  // line 109
app.use("/api/auth/archive", sensitiveLimiter);         // line 110
```

**Assessment:**
- `changepassword` — POST method; covered by Tier 3 (write) AND Tier 4. Combined: 10/hr. Correct.
- `getpwresetlink` — GET method; bypasses Tier 3 (expected). Covered by Tier 4 only. 10/hr is appropriate for password reset spam defense.
- `archive` — PUT method; covered by Tier 3 AND Tier 4. Combined: 10/hr. Correct. Prevents mass account archival attempts.
- **VERDICT: CORRECT**

---

## Middleware Order Verification

```js
// server.js lines 98-110 (extracted)
app.use(globalLimiter);                           // 1: Global
app.use("/api/auth", authLimiter);                // 2: Auth
app.use("/api", writeLimiter);                    // 3: Write
app.use("/api/auth/changepassword", sensitiveLimiter); // 4a: Sensitive
app.use("/api/auth/getpwresetlink", sensitiveLimiter); // 4b: Sensitive
app.use("/api/auth/archive", sensitiveLimiter);        // 4c: Sensitive
// Route mounting comes AFTER (lines 113+)
```

**Order is correct:** All rate limiters applied before routes are mounted. Specific limiters (Tier 4) are registered after general ones (Tier 2/3), which is fine since Express processes all matching middleware for each request. The Tier 4 paths (`/api/auth/changepassword`) also match Tier 1 and Tier 2 prefixes — all applicable limiters fire.

---

## Known Limitations

### Single-Server In-Memory Store
Rate limiting uses the default in-memory store. This means:
- Rate limit state is reset when the server restarts
- If/when horizontally scaled (multiple Linode nodes), each node has independent counters — a single user can bypass limits by distributing requests across servers

**Current risk:** LOW (single server). **Future risk:** MEDIUM on scale.
**Documented in code comments** (line 39-42 in server.js): "Deferred: swap to a Redis store if/when horizontally scaling."

### IP Spoofing via X-Forwarded-For
`app.enable("trust proxy")` is set. If nginx does not override the `X-Forwarded-For` header, a client can spoof their IP to get 500 separate rate limit buckets.

**See:** `GETHIRED_DEPENDENCY_RUNTIME_SECURITY_AUDIT.md` — Nginx must be configured to set `X-Forwarded-For` to `$remote_addr`, overriding any client-supplied value.

---

## Abuse Scenarios Covered

| Abuse Type | Coverage | Limit |
|-----------|---------|-------|
| Brute-force login | Tier 2 | 20/15min per IP |
| Credential stuffing | Tier 2 | 20/15min per IP |
| Signup spam | Tier 2 | 20/15min per IP |
| Password reset spam | Tier 4 | 10/hr per IP |
| Mass job creation | Tier 3 | 100/15min per IP |
| Message flooding (large body + volume) | Tier 3 + 4000-char body cap | 100 sends/15min + 4KB/msg |
| API scraping (public endpoints) | Tier 1 | 500 GET/15min per IP |
| Mass application creation | Tier 3 | 100/15min per IP |
| Mass CV upload | Tier 3 | 100/15min per IP |

---

## Overall Rate Limiting Verdict: CORRECT

The 4-tier implementation is logically correct. All four tiers are properly ordered, correctly additive, and the GET/write skip is safe. The in-memory limitation and X-Forwarded-For trust are known issues with documented mitigations for future scaling.
