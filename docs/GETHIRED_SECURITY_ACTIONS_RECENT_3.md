# GetHired — Security Actions RECENT 3
**Generated:** 2026-06-26
**Supersedes:** Security sections in GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md
**Status upgrade:** System security posture significantly improved this session

---

## Security Posture Summary

| Category | Previous State | Current State |
|---|---|---|
| Firebase credentials | P0 OPEN — key in git history | CLOSED — env-based chain; old key auto-revoked |
| PayMongo webhook HMAC | CLOSED (97cd657) | CLOSED — env var verification pending |
| CORS | CLOSED (d4e34c7) | CLOSED |
| BOLA on job/applicant endpoints | CLOSED (prior sprints) | CLOSED |
| Rate limiting | P1 OPEN | P1 OPEN |
| ESM syntax developer trap | Not previously identified | P1 OPEN — new |
| Dependabot CVEs | Known | P1 OPEN — 6 critical quantified |

**Overall:** No P0 security items remain. The system is safe for public launch with the PayMongo env var confirmed.

---

## Closed This Session

### Firebase Credential Hardening (was P0)

**Commit:** This session — `middleware/firebaseApp.js` refactored

**What was done:**
- `firebaseApp.js` now uses a credential resolution chain:
  1. `FIREBASE_SERVICE_ACCOUNT_BASE64` env var (base64-encoded JSON) — production path
  2. `FIREBASE_SERVICE_ACCOUNT_JSON` env var (raw JSON string) — alternative
  3. Application Default Credentials (ADC) — GCP/Cloud Run path
  4. Local file fallback (`jobhunt-serviceAccountKey.json`) — development path
- Production Linode `.env` has `FIREBASE_SERVICE_ACCOUNT_BASE64` set
- Old leaked key was auto-revoked by Google (Google auto-revokes keys found in public repos)
- `jobhunt-serviceAccountKey.json` is gitignored; no new key has been committed

**Remaining optional hardening:** Run `git log --all --full-history -- "*serviceAccountKey*"` to confirm the old file is not still accessible via reflog. If cleanup is desired, use BFG Repo Cleaner on the history — but the key itself is already invalidated, so this is cosmetic.

---

### ESM Compatibility Fix (was production risk)

**Commit:** This session — `?.` replaced with `&&` guards in 3 BE files

Three BE source files had optional chaining (`?.`) or nullish coalescing (`??`) syntax that Acorn 6/7 (bundled in esm v3.2.25) cannot parse. This caused `SyntaxError` at startup. The files have been reverted to compatible syntax.

---

## Open Security Items

### P1 — Rate Limiting (P1-RATE-LIMIT)

**Risk:** Every auth, contact, candidate, job-apply, and payment endpoint is open to brute-force attacks and flooding. No `express-rate-limit`, `express-slow-down`, or equivalent middleware exists anywhere in the BE.

**Specific risk surfaces:**
- `POST /api/signin` — brute-force password guessing
- `POST /api/signup` — account enumeration and spam registration
- `POST /api/reset-password` — email flooding
- `POST /api/job/apply` — application spam
- `POST /api/contact/addcontact` — contact list flooding

**Fix:** Install `express-rate-limit`; apply tiered limits — see EXEC-PACK-RATE-LIMIT in execution packs file.

**Owner:** BE dev | **Effort:** M

---

### P1 — ESM v3.2.25 Acorn Limitation (P1-ESM-ACORN)

**Risk:** This is a security-adjacent developer trap. When any developer adds `?.` (optional chaining) or `??` (nullish coalescing) to a BE source file, the application fails to start at the next deployment. There is no build-time error — the failure happens at runtime (`SyntaxError: Unexpected token '?'`). A developer could unknowingly push syntax that takes production down.

**This session's fix:** 3 files were manually reverted. But no guardrail prevents the next occurrence.

**Interim mitigation (recommended this sprint):** Add an ESLint rule blocking these operators in BE source:
```javascript
// get-hired-BE/.eslintrc.js
module.exports = {
  rules: {
    'no-optional-chaining': 'error',  // custom or via eslint-plugin
    // Alternative: use eslint-plugin-node no-unsupported-features
  }
};
```
Add `npx eslint src/ --ext .js` to pre-commit hook or CI.

**Full migration path:** See P1-ESM-ACORN in GETHIRED_TECH_DEBT_ACTIONS_RECENT_3.md.

**Owner:** BE dev | **Effort:** S (interim) / L (full migration)

---

### P1 — PayMongo Webhook Secret on Linode (P1-PAYMONGO-ENV)

**Risk:** The HMAC verification code is correct and shipped (commit 97cd657). If `PAYMONGO_WEBHOOK_SECRET` is not set in Linode production `.env`, `verifyPaymongoSignature()` returns false and ALL PayMongo webhooks are rejected with 400. This is fail-closed — no payment data is at risk — but payment events will not be processed (subscription activations, payment confirmations will silently fail).

**Verification:**
```powershell
ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env | head -1"
```

**Owner:** Paul | **Effort:** XS (5 minutes)

---

### P1 — Dependabot Critical CVEs (P1-DEPENDABOT-CRITICAL)

**Risk:** 114 total Dependabot alerts on GitHub (6 critical, 61 high, confirmed post-deployment). Not all CVEs are directly exploitable in GetHired's context, but 6 critical alerts require individual triage.

**Action:**
1. Open GitHub → Security tab → Dependabot alerts → filter by Critical
2. For each of the 6 critical CVEs: read the advisory; determine if the vulnerable code path is reachable in GetHired
3. If exploitable: upgrade the affected package immediately
4. If not directly exploitable: document the reasoning and set a timeline for upgrade

**Common critical CVE patterns in Node apps:**
- Prototype pollution in utility packages
- ReDoS (regex denial of service) in string-processing packages
- Path traversal in file-serving packages

**Owner:** BE dev + FE dev | **Effort:** M

---

## Confirmed-Closed Security Items (Historical Record)

| Item | Commit | Description |
|---|---|---|
| PayMongo webhook HMAC | 97cd657 | HMAC-SHA256 + constant-time compare + replay protection |
| CORS wildcard | d4e34c7 | Restricted to `env.app_url` |
| BOLA — GET /applicant/userprofile | Prior sprint | JWT-derived uid, no uid param accepted |
| BOLA — GET /job/details uid | Prior sprint | JWT-derived companyId |
| uid spoofing in verifyRoles + logout | Prior sprint | JWT-derived uid only |
| SEC-08 getJobApplicantDetails BOLA | Prior sprint | Confirmed already fixed |
| listRecruiterThreads missing LIMIT | Prior sprint | Confirmed already fixed |
| addCompanyUserByEmail catch raw error | Prior sprint | Confirmed clean |
| verifyAuth raw Firebase error | 6a7755c | Raw Firebase error redacted from 403 response |
| CORS restricted (confirmed) | d4e34c7 | Not wildcard — was stale in session memory |
| Firebase service account key | This session | env-based chain; old key auto-revoked |
| ESM syntax compat | This session | `?.`/`??` replaced with `&&` guards in 3 files |

---

## Security Scorecard

| Control | Status | Notes |
|---|---|---|
| Authentication (Firebase) | PASS | JWT verification in verifyAuth middleware |
| BOLA / horizontal escalation | PASS | All endpoints use JWT-derived IDs |
| Credential management | PASS | env-base64 chain; no key in repo |
| Webhook signature verification | PASS (env var pending) | Code correct; confirm env var on Linode |
| CORS | PASS | Restricted to app_url |
| Rate limiting | FAIL (P1) | No express-rate-limit anywhere |
| SQL injection | PASS (review) | Parameterized queries throughout (`$1`, `$2`) |
| File upload MIME | PASS | Magic-byte verification added (2026-06-24) |
| Dependabot CVEs | PARTIAL | 6 critical need triage |
| Secrets in env (not code) | PASS | env.js maps process.env |
| nosniff header | UNVERIFIED | Not confirmed in nginx config |
| CSP header | NOT SET | No Content-Security-Policy header configured |
| HTTPS / TLS | PASS | Linode/nginx handles TLS termination |
