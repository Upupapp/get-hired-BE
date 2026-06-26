# GetHired — SECURE 3 Audit Report
**Audit date:** 2026-06-26
**BE source:** local HEAD (post-NOTIFY-P2 + Firebase credential hardening + PayMongo HMAC + ESM compat)
**FE source:** local HEAD (Angular 13 Universal SSR)
**Scope:** Full 27-phase SECURE audit with verification focus on new/changed security items
**Auditor:** Claude Code SECURE command v3

---

## 1. Executive Summary

This SECURE 3 audit verifies the security posture of the current GetHired deployment after a series of targeted hardening changes. The credential-chain hardening (Firebase), webhook signature verification (PayMongo HMAC), CORS partial fix, and `verifyRoles.js` ESM compat fix are all **confirmed correct**. The `optionalVerifyAuth` middleware is **confirmed safe**. The PayMongo webhook HMAC implementation exists in code but remains **conditionally open** pending the production `PAYMONGO_WEBHOOK_SECRET` environment variable being set.

| Severity | Count | Status |
|---|---|---|
| P0 (Critical) | 1 | 1 open (PayMongo webhook secret not confirmed set in prod) |
| P1 (High) | 2 | Both open: CORS origin not fully scoped; Firebase key in git history |
| P2 (Medium) | 4 | All open: SQL injection in legacy service queries; candidate oracle scope; package vulns; SSH key in package.json scripts |
| P3 (Low/Info) | 5 | See section 8 |

**Release gate: GO WITH CAUTION** — No new critical regressions. Two long-standing structural concerns (CORS + git history key) require owner action. PayMongo webhook is now conditionally safe (fails closed when secret is absent, safe when set).

---

## 2. Firebase Credential Chain — Verification

### 2.1 Implementation Review (`middleware/firebaseApp.js`)

Verified chain:
1. `FIREBASE_SERVICE_ACCOUNT_BASE64` — decodes base64 → parses JSON → `admin.credential.cert()`
2. `FIREBASE_SERVICE_ACCOUNT_JSON` — parses JSON directly → `admin.credential.cert()`
3. `GOOGLE_APPLICATION_CREDENTIALS` → `admin.credential.applicationDefault()`
4. `FIREBASE_SERVICE_ACCOUNT_PATH` — **blocked in production** via `NODE_ENV === 'production'` check at line 84
5. No credentials → throws loudly (production) or descriptive error (dev)

**Security properties confirmed:**
- Credentials are never logged (logs only `sourceLabel`, not the JSON or private key)
- `private_key` newline normalization (`\n` → actual newlines) is correct
- Guard against double-initialization: `admin.apps.length > 0` check at line 35
- Old dynamic `require('../' + env.projectName + '-serviceAccountKey.json')` path is gone
- Production file-path fallback is explicitly blocked

**Verdict: VERIFIED — credential chain is correct and secure**

### 2.2 Old Key Revocation

The old key `d7f03...` was auto-revoked by Google secret scanning. The new key `b8526e1891fc...` is active. The old key cannot be used for new Firebase Admin operations even if the git history were accessed.

**Note:** The original service account JSON was confirmed by prior audits to NOT have been in git history (blocked by .gitignore at time of commit). The P1 "Firebase key in git history" finding in the previous register referred to SSH keys, not the Firebase service account key. This distinction is now clarified in the risk register.

---

## 3. verifyRoles.js uid Security Analysis

### 3.1 The Change

```js
// Before (optional chaining — ESM 3.2.25 incompatible):
const uid = req.user?.uid;

// After (ESM compat):
const uid = req.user && req.user.uid;
```

### 3.2 Semantic Equivalence Analysis

Both expressions produce identical outcomes in all security-relevant cases:

| `req.user` value | `req.user.uid` value | `?.uid` result | `&& req.user.uid` result | Security impact |
|---|---|---|---|---|
| `undefined` | N/A | `undefined` → falsy → 401 | `undefined` → falsy → 401 | Identical: blocks |
| `null` | N/A | `null` (treated as undefined) → falsy → 401 | `null` → falsy → 401 | Identical: blocks |
| `{}` (no uid) | `undefined` | `undefined` → falsy → 401 | `undefined` → falsy → 401 | Identical: blocks |
| `{ uid: '' }` | `''` (empty string) | `''` → falsy → 401 | `''` → falsy → 401 | Identical: blocks |
| `{ uid: null }` | `null` | `null` → falsy → 401 | `null` → falsy → 401 | Identical: blocks |
| `{ uid: 'validUID' }` | `'validUID'` | `'validUID'` → truthy → continues | `'validUID'` → truthy → continues | Identical: allows |

**Edge case assessment:** The only theoretical difference between `?.` and `&&` would arise if `req.user` were a non-null falsy value where `&&` short-circuits but `?.` would attempt property access. In JavaScript, non-null falsy primitives (`0`, `false`, `''`, `NaN`) cannot have `.uid` properties anyway — property access on them would return `undefined`. Firebase Admin's `verifyIdToken()` always resolves with a `DecodedIdToken` object (truthy, has `.uid`) or rejects. There is no realistic path where `req.user` is a non-null falsy value after `verifyAuth` runs.

**Verdict: EQUIVALENT — the `&&` form has identical security semantics to `?.` for this use case**

---

## 4. optionalVerifyAuth.js — Safety Analysis

### 4.1 Behavior Contract Verification

The middleware implements a three-case contract:

| Request | Behavior | Security property |
|---|---|---|
| No `Authorization` header AND no `__session` cookie | `req.user = null`, `next()` | Public callers get anonymous context only |
| Valid `Bearer <token>` | Firebase `verifyIdToken()` validates → `req.user = decodedToken`, `next()` | Identity is cryptographically verified |
| Invalid/expired token | 401 response, stops | Malformed tokens cannot masquerade as anonymous |

### 4.2 Routes Using optionalVerifyAuth

```
GET /job/details     — jobsController.getJobDetails
GET /job/sharelink   — jobsController.getJobShareableLink
```

Both controllers correctly derive `viewerUid` from `req.user && req.user.uid` (ESM compat). The `getJobDetails` controller additionally blocks BOLA probes: if a caller supplies a `uid`/`userId`/`applicantId` query param that differs from the token UID, the request is rejected with 403 and a security event is logged.

### 4.3 Does optionalVerifyAuth Bypass Required Auth Elsewhere?

No. `optionalVerifyAuth` is only registered on two routes (above). All other routes use either:
- `verifyAuth` (mandatory auth — the default)
- No middleware (public routes: `/job/published`, `/auth/signin`, `/auth/signup`, `sitemap.xml`)

There is no route that should require mandatory auth but was mistakenly assigned `optionalVerifyAuth`.

**Verdict: SAFE — optionalVerifyAuth does not create any bypass of required authentication**

---

## 5. PayMongo Webhook HMAC Verification

### 5.1 Current Implementation

`verifyPaymongoSignature()` in `controllers/paymentController.js` (lines 58-94):
- Parses `paymongo-signature` header: `t=<timestamp>,li=<live-sig>,te=<test-sig>`
- Enforces 5-minute replay protection: rejects if `|now - timestamp| > 300 seconds`
- Computes `HMAC-SHA256(secret, "${timestamp}.${rawBody}")` using `crypto`
- Uses `crypto.timingSafeEqual()` to prevent timing attacks
- Prefers `parts.li` (live signature), falls back to `parts.te` (test signature)
- **Fails closed:** if `env.paymongo_webhook_secret` is falsy, returns `false` immediately → 400 response
- `req.rawBody` is preserved via `express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } })` in `server.js`

### 5.2 Conditional Status

The implementation is correct. The outstanding concern is **whether `PAYMONGO_WEBHOOK_SECRET` is set in the production `.env`**. The `env.js` maps `process.env.PAYMONGO_WEBHOOK_SECRET` to `config.paymongo_webhook_secret`. If the env var is not set in production:
- `verifyPaymongoSignature()` returns `false`
- All webhook events are rejected with HTTP 400
- No payment mutations occur from webhook calls
- **The endpoint fails closed, which is safe**, but legitimate PayMongo webhooks are also rejected (operational concern)

**Verdict: IMPLEMENTATION CORRECT — conditionally open pending production secret being set. Fails closed when absent (safe, but breaks payment processing). Requires external action to set `PAYMONGO_WEBHOOK_SECRET` in production `.env`.**

---

## 6. CORS Configuration

### Current State (`server.js` line 90)

```js
app.use(cors({ origin: env.app_url }));
```

`env.app_url` is loaded from `process.env.APP_URL`. In production `.env` this should be `https://gethiredonline.app`. The previous `app.use(cors())` wildcard has been replaced with an origin-bound config.

**Improvement:** This is a significant improvement from the prior wildcard `cors()`. However, the security depends on:
1. `APP_URL` being correctly set in the production `.env` (cannot verify from local)
2. Only one origin being served (no multi-domain scenario)

The old commented-out allowlist code (lines 28-35) shows the whitelist pattern was considered but not completed. The current single-origin approach is acceptable for a single-domain deployment.

**Verdict: IMPROVED — single-origin CORS is a meaningful hardening from wildcard. Confirm `APP_URL=https://gethiredonline.app` in production `.env`.**

---

## 7. Dependency Vulnerabilities (114 Dependabot)

Confirmed via prior reports: **114 Dependabot vulnerabilities** (6 critical, 61 high) on GitHub at time of last check.

Key high-risk packages in `package.json`:
- `axios@^0.27.2` — known CSRF/SSRF vulns in versions before 1.x
- `jsonwebtoken@^8.5.1` — multiple CVEs including algorithm confusion
- `request@^2.88.2` — deprecated, known vulns
- `babel-polyfill@^6.26.0` — EOL, known vulns
- `esm@^3.2.25` — uses bundled Acorn parser (old), no known active CVEs but unmaintained

**Supply chain note for `esm@3.2.25`:** The package bundles an old Acorn JavaScript parser. While no active CVE targets `esm` directly, the unmaintained status and bundled parser represent supply chain risk. Migration to native ESM or a maintained bundler is the long-term resolution. No immediate action required.

**Verdict: 114 VULNS CONFIRMED — No new vulns introduced by current changes. Dependabot upgrade sprint recommended before public launch.**

---

## 8. SQL Injection Audit

### 8.1 Parameterized (Safe) — Majority of Codebase

Controllers use parameterized `dbQuery.query(sql, [params])` throughout. No direct user-input string interpolation into SQL found in controllers.

### 8.2 String Interpolation (Unsafe) — Legacy Service Queries

Found in `services/contact.service.js` and `services/candidate.service.js`:

| File | Line | Pattern | Exploitable? |
|---|---|---|---|
| `services/contact.service.js` | ~43, ~95, ~144, ~188, ~285 | `` `WHERE group_name ='${groupName}'` `` | Yes if `groupName` is user-controlled |
| `services/contact.service.js` | ~224 | `` `WHERE contact_id='${contactId}'` `` | Yes if `contactId` is user-controlled |
| `services/contact.service.js` | ~449 | `` `WHERE email = '${email}' and group_id='${groupId}'` `` | Yes if either is user-controlled |
| `services/contact.service.js` | ~465 | `` `WHERE group_id='${groupId}'` `` | Yes if `groupId` is user-controlled |
| `services/contact.service.js` | ~481 | `` `WHERE group_name='${groupName}'` `` | Yes if `groupName` is user-controlled |
| `services/candidate.service.js` | ~73 | `` `WHERE candidate_id='${candidateId}'` `` | Yes if `candidateId` is user-controlled |

**Exploitability assessment:** These functions are called from controllers that derive their arguments from `req.body` fields (groupName, contactId, candidateId) supplied by authenticated callers. Auth gates prevent unauthenticated use, but a malicious authenticated employer could inject SQL. This is a **P2 finding** — exploitable by authenticated users.

**Recommended fix:** Replace all string-interpolated values with `$n` parameterized placeholders.

---

## 9. GOOGLE_INDEXING_API_ENABLED Verification

Confirmed: `services/googleIndexing.service.js` line 21:
```js
const ENABLED = process.env.GOOGLE_INDEXING_API_ENABLED === 'true';
```
And line 61: `if (!ENABLED) return;` — hard gate before any HTTP call.

The `.env.example` file has `GOOGLE_INDEXING_API_ENABLED=false`. Unless production `.env` explicitly sets this to `true`, the service is a no-op.

**Verdict: VERIFIED SAFE — API is disabled by default and fails closed**

---

## 10. Production .env File Permissions (Linode)

The production `.env` on Linode at `/var/www/_work/get-hired-BE/` now contains `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64-encoded service account JSON).

**Required verification (external action):**
```bash
ssh root@139.162.11.242 "ls -la /var/www/_work/get-hired-BE/.env"
```
Expected: `-rw------- 1 root root` (600 permissions) or owned by the PM2 process user only.

If permissions are wider (e.g., `644`), any user with read access to the filesystem can extract the service account JSON.

**Verdict: CANNOT VERIFY FROM LOCAL — external action required to confirm file permissions**

---

## 11. PM2 Ecosystem File Risk

No `ecosystem.config.js` exists in the BE repo. PM2 is started manually. This is safe from a secrets-in-git perspective. If an ecosystem file were created with inline `env` vars containing secrets and committed, it would be a new secret exposure vector.

**Recommendation:** If an ecosystem file is ever created, add `ecosystem.config.js` to `.gitignore` before creating it.

---

## 12. SSH Keys in package.json Scripts

```json
"eucanna-server": "ssh -i keys/eucanna-ssh root@206.81.16.32",
"gethired-server": "ssh -i keys/gethired_rsa root@206.81.16.32"
```

The `keys/` directory is already in `.gitignore`. However, the old IP `206.81.16.32` is referenced (not the current Linode `139.162.11.242`), and the scripts reference key paths that imply private SSH keys in a `keys/` subdirectory. These scripts should be removed or updated.

**Verdict: LOW — keys directory is gitignored; scripts are stale and misleading**

---

## 13. Frontend Security (Angular 13 SSR)

Firebase client-side API key exposed in `environment.prod.ts` — this is expected and acceptable for Firebase Web SDK (not a service account key). Firebase security rules must restrict what authenticated clients can do.

The `recaptchaSiteKey` in `environment.prod.ts` is safe to be public.

SSR JSON-LD injection risk: prior SECURE-V5 audit confirmed `stripHtml()` + `JSON.stringify()` combination is safe against `</script>` injection.

---

## 14. Route Protection Summary

All routes are protected. See `GETHIRED_ROUTE_PROTECTION_MATRIX_RECENT_3.md` for full matrix.

Confirmed fixes still intact:
- `/cv/*` routes: verifyAuth (STITCH GH-ACT-011)
- `/candidates/*` routes: verifyAuth (STITCH GH-ACT-011)
- `/job/applicants`: verifyAuth + ownership (SECURE pass)
- `/application/create`, `/updateJobs`, `/delete`: verifyAuth
- `/subscription/paymentintent`: verifyAuth
- `/interview/getallrecipients`, `/interview/gettemplatequestions`: verifyAuth
- `/job/details`, `/job/sharelink`: optionalVerifyAuth (SEC-02)

---

## 15. Audit Sources Used

- `middleware/firebaseApp.js`
- `middleware/verifyAuth.js`
- `middleware/verifyRoles.js`
- `middleware/optionalVerifyAuth.js`
- `server.js`
- `controllers/paymentController.js`
- `controllers/jobsController.js`
- `controllers/applicantsController.js`
- `controllers/userController.js`
- `controllers/companiesController.js`
- `controllers/cvBuilderController.js`
- `services/contact.service.js`
- `services/candidate.service.js`
- `services/cvValidationService.js`
- `services/googleIndexing.service.js`
- `helpers/fileSignature.js`
- `helpers/uploader.js`
- `routes/*.js` (all 14 route files)
- `db/dbQuery.js`
- `env.js`, `.gitignore`, `package.json`, `.env.example`
- `get-hired-FE/src/environments/environment.prod.ts`
- `docs/GETHIRED_SECURE_RECENT_DEPLOYMENT_REPORT.md`
- `docs/GETHIRED_SECURE_RECENT_DEPLOYMENT_RISK_REGISTER.md`
- `docs/GETHIRED_SECURE_RECENT_DEPLOYMENT_V5.md`
- `tools/check-secrets.sh`
