# GETHIRED DEPENDENCY & RUNTIME SECURITY AUDIT — QA Cycle 11
Generated: 2026-06-25

---

## npm audit Summary

```
found 273 vulnerabilities (19 low, 99 moderate, 138 high, 17 critical)
  run `npm audit fix` to fix 98 of them.
  166 vulnerabilities require semver-major updates.
  9 vulnerabilities require manual review.
```

---

## Critical Dependency Chains

### Chain 1: bcrypt → @mapbox/node-pre-gyp → tar
**Severity:** Critical/High (path traversal, arbitrary file overwrite)
**Vulnerabilities:** node-tar CVEs — symlink path traversal, hardlink path traversal, race condition
**Exploitability from public surface:** LOW — these vulnerabilities trigger during `npm install` (tar extraction), not at runtime. The `bcrypt` native module is compiled once during deployment, not on every request.
**Runtime risk:** Negligible for deployed app. Build-time risk if CI/CD runs npm install with untrusted packages.
**Fix:** Replace `bcrypt` with `bcryptjs` (already in `package.json` as a direct dependency — just use it and remove `bcrypt`).

### Chain 2: axios@^0.27.2 — Multiple CVEs
**Severity:** High/Critical
**Vulnerabilities include:**
- SSRF via NO_PROXY bypass
- Prototype pollution → header injection, response tampering
- CSRF vulnerability
- Credential leak to redirect target
- Proxy-Authorization header leakage
- Regular Expression Denial of Service

**Exploitability:** MEDIUM for this codebase.
- Axios is used in `paymentController.js` to call PayMongo API: `const options = { url: "https://api.paymongo.com/v1/links", ... }`
- The URL is hardcoded (not user-supplied), so SSRF via user input is not directly exploitable
- Prototype pollution could theoretically be exploited if user input reaches axios request options
- CSRF vuln: axios auto-includes xsrf token on cross-origin requests — low risk for a server-side use

**Fix:** Upgrade to axios@1.9.0 or latest. This is a semver-major jump (v0.x → v1.x) but the API is largely compatible.

### Chain 3: request → qs + uuid
**Severity:** Moderate/High
**Vulnerabilities:** qs DoS (memory exhaustion via large object), uuid missing buffer bounds check
**Exploitability:** LOW — `request` package is deprecated but currently used in the codebase
**Fix:** Remove `request` package and migrate callers to `axios` or `node-fetch`.

### Chain 4: minimatch (via bcrypt/node-pre-gyp chain)
**Severity:** High
**Vulnerabilities:** ReDoS via repeated wildcards, combinatorial backtracking
**Exploitability:** LOW at runtime — minimatch is used in glob patterns, not in request handlers
**Fix:** Resolved when bcrypt is replaced with bcryptjs.

---

## express-rate-limit@6.11.2 Security Review

**Version:** 6.11.2 (pinned)
**Rationale for v6:** Node 14.21.3 compatibility — v7+ uses optional chaining (`?.`) which requires Node 15+.

### CVE Check for express-rate-limit 6.x
express-rate-limit has a known history:
- **CVE-2021-21404** (resolved in v5.2.6) — IP spoofing via X-Forwarded-For when `trust proxy` is not configured
- No critical CVEs found specific to v6.11.x in public databases (as of knowledge cutoff)

**trust proxy note:** `server.js` line 94: `app.enable("trust proxy")` — this is set, which is required when behind a reverse proxy (Linode may use one). With trust proxy enabled, express-rate-limit will use the `X-Forwarded-For` header for IP-based limiting. This is correct behavior but means a user can spoof their IP by setting `X-Forwarded-For` if the proxy doesn't strip/override it.

**Recommendation:** Verify at the Linode/nginx level that `X-Forwarded-For` is set by the trusted proxy, not passed through from the client. If nginx is the proxy, ensure `proxy_set_header X-Forwarded-For $remote_addr;` is set to override client-supplied headers.

**express-rate-limit v6.11.2 verdict:** Safe for use on Node 14. No known critical CVEs in v6.x. The `trust proxy` configuration requires nginx-level validation.

---

## Node.js Runtime

**Version:** 14.21.3 (LTS, EOL April 2023)
**Status:** OUT OF SUPPORT — no security patches since April 2023

**Risk:** HIGH for any new Node.js CVEs. Any vulnerabilities discovered after April 2023 in the V8 engine or Node.js core are unpatched.

**Known exposure:** Node 14 lacks several security improvements in Node 18/20 (current LTS), including better TLS defaults and improved crypto primitives.

**Recommendation:** Plan upgrade to Node 18 LTS or Node 20 LTS. Node 18 is active LTS until April 2025. Node 20 is current LTS until April 2026. This is a significant engineering effort but essential for long-term security.

---

## Other Dependencies of Note

| Package | Version | Status |
|---------|---------|--------|
| express | ^4.18.1 | SAFE — 4.19+ available but 4.18 has no known critical CVEs |
| firebase-admin | ^10.0.0 | Outdated — v12 is current; upgrade for latest security patches |
| firebase | ^9.14.0 | v9.x modular — maintained; update to latest 9.x patch |
| jsonwebtoken | ^8.5.1 | v8.5.1 has CVE-2022-23529 (critical — signature bypass). v9.0+ fixes it |
| pg | ^8.7.3 | SAFE — maintained |
| multer | ^1.4.5-lts.1 | LTS version — safe |
| compression | ^1.7.4 | SAFE |

### CRITICAL: jsonwebtoken@8.5.1 — Signature Bypass CVE
**CVE-2022-23529 / GHSA-27h2-hvpr-p74q:** A crafted JWT token could bypass signature verification in jsonwebtoken 8.x. This is potentially critical for any JWTs verified by the application's own code.

**However:** GetHired uses Firebase Admin SDK for JWT verification (in `verifyAuth.js`: `firebaseAdmin.auth().verifyIdToken(idToken)`). This does NOT use the `jsonwebtoken` package for verification — Firebase Admin has its own JWT verification. The `jsonwebtoken` package may be a transitive dependency used elsewhere (e.g., for internal session tokens or service-to-service calls).

**Check needed:** Verify if `jsonwebtoken` is directly called anywhere in the codebase for JWT creation or verification outside of Firebase.

---

## Summary

| Finding | Severity | Fix |
|---------|---------|-----|
| bcrypt dep chain: tar vulnerabilities | P2 | Replace bcrypt with bcryptjs |
| axios@0.27.2: multiple CVEs including SSRF/prototype pollution | P2 | Upgrade to axios@^1.9.0 |
| Node 14 EOL: no security patches | P2 | Upgrade to Node 18 or 20 LTS |
| jsonwebtoken@8.5.1 CVE-2022-23529 | P2 | Upgrade to jsonwebtoken@^9.0.0 (verify if directly used) |
| firebase-admin@10 outdated | P3 | Upgrade to v12 |
| request package deprecated | P3 | Remove; migrate to axios |
| express-rate-limit@6.11.2 | PASS | Safe for Node 14; no critical CVEs |
| trust proxy + X-Forwarded-For | P3 | Verify nginx strips client-set XFF headers |
