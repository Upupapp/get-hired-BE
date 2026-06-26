# GetHired — Threat Model (SECURE 3)
**Date:** 2026-06-26
**Model type:** STRIDE applied to GetHired backend (Node/Express/Firebase/PostgreSQL)

---

## System Boundary

```
Internet
  │
  ├─► FE (Angular 13 SSR, Linode/served)
  │     └─► API (Node/Express, Linode :3000, PM2)
  │             ├─► Firebase Auth (token validation)
  │             ├─► Firebase Admin (user management)
  │             ├─► PostgreSQL (Supabase, schema-isolated)
  │             ├─► Firebase Storage (file storage)
  │             ├─► PayMongo (payment links + webhooks)
  │             └─► SendGrid (email)
  │
  └─► PayMongo (inbound webhook → POST /payment/paymongowebhook)
```

---

## STRIDE Analysis

### S — Spoofing

| Threat | Attack vector | Current control | Residual risk |
|---|---|---|---|
| Caller spoofs authenticated identity | Forged Bearer token | Firebase `verifyIdToken()` in `verifyAuth.js` validates JWT signature against Firebase public keys | LOW — Firebase JWT cannot be forged without Firebase private key |
| Caller spoofs company identity | Body-supplied `companyId` | `getUserCompany(req.user.uid)` in controllers derives company from JWT; body value is ignored or overridden | LOW — Mitigated in all verified controllers |
| PayMongo spoofs webhook event | Forged POST to `/payment/paymongowebhook` | HMAC-SHA256 with `PAYMONGO_WEBHOOK_SECRET`; replay protection (5min window); `timingSafeEqual` | MEDIUM — Conditional on `PAYMONGO_WEBHOOK_SECRET` being set in prod |
| Firebase service account spoofing | Stolen base64 credential | Old key auto-revoked; new key in prod `.env`; no key in git | LOW — Mitigated; depends on `.env` file permissions |

### T — Tampering

| Threat | Attack vector | Current control | Residual risk |
|---|---|---|---|
| SQL injection to tamper DB records | String interpolation in legacy service queries | Auth gate (requires valid JWT) + some functions still use string concat | MEDIUM — Auth-gated but string interpolation present in contact/candidate services |
| Tamper company records cross-tenant | Supply different companyId | JWT-derived companyId, body override pattern | LOW — Mitigated |
| Tamper another user's profile | Supply different userId param | SEC-01/SEC-02 fixes block mismatched uid params | LOW — Mitigated |
| Tamper job listing (wrong company) | Create/update job for wrong company | `getUserCompany(uid)` before any DB write | LOW — Mitigated |

### R — Repudiation

| Threat | Attack vector | Current control | Residual risk |
|---|---|---|---|
| Deny performing security-sensitive action | No audit log | Security events logged to console (SEC-01, SEC-02 probes), PM2 captures to `be_out.log` | MEDIUM — No structured audit log; console logs only |
| Webhook payment dispute | Claim no payment received | `transaction_table` records all webhook-confirmed payments | LOW — DB records exist |

### I — Information Disclosure

| Threat | Attack vector | Current control | Residual risk |
|---|---|---|---|
| Expose applicant PII to wrong employer | GET /job/applicants without ownership | `verifyAuth` + company ownership check in `getJobCompanyId()` | LOW — Mitigated |
| Expose Firebase internal error details | Auth failure leaks internal error | `verifyAuth.js` now returns static 'Authentication failed.' | LOW — Mitigated |
| Expose service account credential | `.env` file on Linode too permissive | Unknown — external verification required | MEDIUM — Cannot verify from local |
| Cross-tenant candidate oracle | `checkEmailIfExistInCandidate` global | Now company_id-scoped at line 61 of candidate.service.js | LOW — Fixed |
| PII in server logs | `console.log()` with billing data | Payment webhook logs only id, not PII | LOW — Mitigated for payment; some residual in candidateList log |
| Firebase Web SDK API key exposed in FE | `environment.prod.ts` in source | Acceptable — Web API keys are public; Firebase rules restrict what clients can do | LOW — Accepted |

### D — Denial of Service

| Threat | Attack vector | Current control | Residual risk |
|---|---|---|---|
| Brute-force auth endpoint | Rapid POST /auth/signin | `authLimiter` (20/15min per IP), `globalLimiter` (500/15min) | LOW — Rate limited |
| Mass write operations | Flood POST endpoints | `writeLimiter` (100/15min per IP) | LOW — Rate limited |
| Account takeover via password reset flood | Flood /auth/getpwresetlink | `sensitiveLimiter` (10/hour) | LOW — Rate limited |
| Sitemap DoS (repeated expensive DB query) | Flood GET /sitemap.xml | In-memory cache (15-min TTL); DB hit at most once per 15 min | LOW — Cached |
| Rate limit bypass via IP spoofing | `X-Forwarded-For` manipulation | `app.enable('trust proxy')` — trusts one proxy hop (Linode/nginx); IP from outermost proxy | MEDIUM — If no nginx in front, malicious `X-Forwarded-For` could bypass rate limiting |

### E — Elevation of Privilege

| Threat | Attack vector | Current control | Residual risk |
|---|---|---|---|
| Job seeker registers as admin | POST /auth/signup with role=1 | `ALLOWED_ROLES = [2, 3]` check in `userController.js` line 102 | LOW — Mitigated |
| Employer accesses admin endpoints | GET /admin/* without admin role | `verifyAuth` + `verifyRoles` on admin routes | LOW — Mitigated |
| Applicant accesses employer-only jobs mgmt | POST /job/create, etc. | `verifyAuth` required; `getUserCompany()` verifies employer has a company | LOW — Mitigated |
| ESM compat change weakens role check | `&&` vs `?.` semantic difference | Verified equivalent in all cases (see SECURE 3 main report section 3) | LOW — No regression |

---

## Top Attack Scenarios

### Scenario 1: Forged PayMongo Webhook (HIGH if secret not set)
**Actor:** External attacker or competitor
**Goal:** Mark orders as paid without actual payment
**Path:** POST `/payment/paymongowebhook` with crafted `link.payment.paid` event body
**Current state:** Rejected with 400 if PAYMONGO_WEBHOOK_SECRET is set; ALL webhooks rejected if secret is absent
**Mitigation status:** Set `PAYMONGO_WEBHOOK_SECRET` in prod `.env`

### Scenario 2: SQL Injection via Contact/Candidate Service (MEDIUM)
**Actor:** Malicious authenticated employer
**Goal:** Exfiltrate data from other tables, drop records, or privilege escalate via SQL
**Path:** POST `/contacts/addcontact` with crafted `groupName` containing SQL injection payload
**Current state:** Auth-gated but string interpolation is present in service layer
**Mitigation status:** Replace string concat with parameterized queries

### Scenario 3: Rate Limit Bypass via X-Forwarded-For (MEDIUM if no nginx)
**Actor:** External attacker
**Goal:** Bypass per-IP rate limits to brute-force auth or flood writes
**Path:** Spoof `X-Forwarded-For` header with rotating IPs
**Current state:** `trust proxy` trusts one hop; if Express is directly internet-facing without nginx, attackers can spoof this header
**Mitigation status:** Confirm nginx proxies requests and strips/rewrites X-Forwarded-For

### Scenario 4: Service Account Credential Theft (P1 if .env is 644)
**Actor:** Compromised OS-level access, co-tenancy risk, insider threat
**Goal:** Extract Firebase service account from `.env` and impersonate any user
**Path:** `cat /var/www/_work/get-hired-BE/.env`
**Mitigation status:** Verify file permissions are 600
