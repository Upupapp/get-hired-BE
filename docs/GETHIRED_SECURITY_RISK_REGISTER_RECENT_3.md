# GetHired — Security Risk Register (SECURE 3)
**Last updated:** 2026-06-26 (SECURE 3 audit)
**Previous version:** GETHIRED_SECURE_RECENT_DEPLOYMENT_RISK_REGISTER.md (2026-06-26 NOTIFY-P2)

---

## P0 — Critical (Must be externally mitigated before launch)

| ID | Title | Location | Status | Notes |
|---|---|---|---|---|
| P0-1 | PayMongo webhook `PAYMONGO_WEBHOOK_SECRET` not confirmed set in production | `controllers/paymentController.js`, production `.env` on Linode | CONDITIONALLY OPEN | The HMAC implementation is correct and **fails closed** (all webhooks rejected with 400 if secret is absent). If `PAYMONGO_WEBHOOK_SECRET` is not in prod `.env`, payment processing via webhook is broken. If it IS set, the implementation is secure. Must confirm with `ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env | wc -l"` (print count, not value). |

---

## P1 — High (Fix before public launch)

| ID | Title | Location | Status | Notes |
|---|---|---|---|---|
| P1-1 | Firebase/SSH private keys in git history | git history, commit scan | OPEN — EXTERNAL ACTION REQUIRED | Prior audit noted SSH keys committed in history. Firebase service account JSON was NOT committed (blocked by .gitignore). Old SSH keys in history may still be extractable. Requires `git log --all --full-history -- 'keys/*'` to assess scope, then either rotation or history scrub. |
| P1-2 | `.env` file permissions on Linode not verified | `/var/www/_work/get-hired-BE/.env` | UNVERIFIED — EXTERNAL ACTION REQUIRED | File contains `FIREBASE_SERVICE_ACCOUNT_BASE64`. If world-readable (644+), any OS user can extract it. Verify: `ssh root@139.162.11.242 "ls -la /var/www/_work/get-hired-BE/.env"`. Fix: `chmod 600 .env` |
| P1-3 | CORS allowed-origin relies on `APP_URL` env var correctness | `server.js` line 90 | MONITORING | `cors({ origin: env.app_url })` replaces prior wildcard. Safe IF `APP_URL=https://gethiredonline.app` in prod. Verify: `ssh root@139.162.11.242 "grep APP_URL /var/www/_work/get-hired-BE/.env"` (print line, confirm value). |

---

## P2 — Medium (Fix before scaling / before handling sensitive data at volume)

| ID | Title | Location | Status | Notes |
|---|---|---|---|---|
| P2-1 | SQL injection via string interpolation in contact service | `services/contact.service.js` lines ~43, ~95, ~144, ~188, ~224, ~285, ~449, ~465, ~481 | OPEN — NEW FINDING | 9 locations use `` `WHERE field='${userSuppliedValue}'` `` pattern. Auth-gated (only authenticated employers can trigger), but a malicious employer can execute arbitrary SQL. Replace all with `$n` parameterized form. |
| P2-2 | SQL injection via string interpolation in candidate service | `services/candidate.service.js` line ~73 | OPEN — NEW FINDING | `` `WHERE candidate_id='${candidateId}'` `` — same risk as P2-1. |
| P2-3 | `checkEmailIfExistInCandidate` global scope (cross-tenant oracle) | `services/candidate.service.js` line 57 | OPEN — PRE-EXISTING | Now correctly scoped: `WHERE candidates.email = $1 AND company_id = $2`. Marked closed below — update reflects correct current code. SEE FIXED SECTION. |
| P2-4 | 114 Dependabot vulnerabilities (6 critical, 61 high) | `package.json`, `node_modules` | OPEN | Includes deprecated `request`, old `jsonwebtoken`, old `axios`, EOL `babel-polyfill`. Run `npm audit fix --force` in a branch; test before merging. |
| P2-5 | SSH key references in `package.json` scripts | `package.json` lines 12-13 | OPEN — LOW RISK | Scripts reference `keys/eucanna-ssh` and `keys/gethired_rsa` at stale old IP. `keys/` is gitignored. Remove stale scripts from package.json. |

---

## Fixed / Closed (SECURE 3 Verification)

| ID | Title | Fixed in | Verified? | Notes |
|---|---|---|---|---|
| F-1 | BOLA on createContact (companyId from body) | QA8 FIX-7 | YES | getUserCompany from JWT |
| F-2 | BOLA on multipleContact/multipleCandidate | QA8/QA10 | YES | JWT companyId overrides body; confirmed in controllers |
| F-3 | No auth middleware on contact/candidate/cv routes | STITCH GH-ACT-011 | YES | All routes have verifyAuth |
| F-4 | SEC-02: /job/details anonymous access IDOR | SEC-02 | YES | optionalVerifyAuth confirmed correct |
| F-5 | /job/applicants exposed full PII without auth | SECURE pass | YES | verifyAuth + ownership check in controller |
| F-6 | Hardcoded password emailed to invited users | STITCH GH-ACT-004 | YES | Random + Firebase reset link |
| F-7 | Firebase dynamic credential via projectName | SECURE 2 | YES | 4-strategy chain, no dynamic require |
| F-8 | ESM compat: verifyRoles.js optional chaining | commit e10a44f | YES | `&&` form verified semantically equivalent |
| F-9 | PayMongo webhook HMAC implementation | SECURE 3 target | YES — IMPL CORRECT | Fails closed; production secret must be confirmed |
| F-10 | CORS wildcard `app.use(cors())` | server.js change | YES — IMPROVED | Now `cors({ origin: env.app_url })`; single-origin |
| F-11 | Application routes (create/update/delete) unprotected | SECURE pass | YES | verifyAuth on all 3 |
| F-12 | Subscription payment intent unprotected | STITCH fix | YES | verifyAuth added |
| F-13 | Interview recipients/templates unprotected | STITCH fix | YES | verifyAuth added |
| F-14 | PII in PayMongo webhook logs | QA11 FIX-03 | YES | console.log replaced with id-only log |
| F-15 | MIME spoofing in file upload | SECURE pass | YES | magic-byte check in helpers/fileSignature.js |
| F-16 | deleteContact/deleteGroup no ownership check | QA7 FIX-5 | YES | WHERE company_id=$2 in DELETE |
| F-17 | forEach(async) race in multipleContact/multipleCandidate | NOTIFY-P2 | YES | Promise.allSettled |
| F-18 | X-Content-Type-Options nosniff missing | QA11 FIX-04 | YES | Header set in server.js middleware |
| F-19 | checkEmailIfExistInCandidate global scope | Candidate service fix | YES | company_id=$2 filter confirmed present at line 61 |

---

## Low / Informational

| ID | Title | Status | Notes |
|---|---|---|---|
| L-1 | `console.log(dbResponse)` in candidateList logs full list | OPEN | Server-side only; no external exposure |
| L-2 | FE `console.log(data)` in import-add-user constructor | OPEN | Browser-side only |
| L-3 | `esm@3.2.25` supply chain risk | OPEN — ACCEPTED | Unmaintained, bundles old Acorn parser. No known active CVE. Migration to native ESM is long-term path. |
| L-4 | PM2 started manually (no ecosystem.config.js) | ACCEPTED | Safe as-is. If ecosystem file ever created, add to .gitignore FIRST. |
| L-5 | `server` field in `environment.prod.ts` points to defunct Heroku URL | INFO | `https://ssr-back.herokuapp.com` appears to be a dead endpoint. Low risk if not actively used. |
