# GETHIRED_SECURE_RISK_REGISTER_RECENT_V1.md
Generated: 2026-06-25 (this session) | Scope: Post-deployment security audit

---

## Risk Classification

| Level | Meaning |
|-------|---------|
| P0 | Actively exploitable, launch blocker, fix immediately |
| P1 | High severity, fix within 48 hours |
| P2 | Medium severity, fix within current sprint |
| P3 | Low/informational, backlog |

---

## RISKS FOUND THIS SESSION

### RR-S1 — SQL Injection in getPublishedJobs() [PUBLIC, UNAUTHENTICATED]
**Severity:** P0  
**Status:** FIXED this session  
**Introduced by:** Pre-existing (not introduced by the audited commits)

**Description:** `services/job.service.js` built a raw SQL string by interpolating `companyId` directly:
```js
const filter = companyId ? `and j.company_id = '${companyId}'` : "";
```
`companyId` came from `req.query.id` via the unauthenticated public handler `getAllPublishedJobs`. No authentication, no sanitisation.

**Attack vector:** `GET /api/job/published?id=x' OR '1'='1'--` — dumps entire `jobs` table. Union injection possible for data exfiltration from any table accessible to the DB role.

**Fix:** Query split into two fully-parameterised paths (with and without `companyId`). Parameter passed via `$1` placeholder; string interpolation eliminated.

**File:** `services/job.service.js` lines 41-95

---

### RR-S2 — FE sends dead ?id= param to basiclist/expiredlist
**Severity:** P2  
**Status:** FIXED this session  
**Introduced by:** Residual from P2-01 commit — BE was fixed but FE cleanup was not done

**Description:** `job.service.ts` methods `getJobBasicList` and `getJobExpiredList` continued to send `?id=${companyId}` to the BE after the P2-01 fix removed the BE's reading of that param. The BE is safe (ignores it); the risk is that the dead param creates a misleading API contract that could cause a future BE developer to restore the vulnerability.

**Fix:** Removed query param from both FE methods. Arg renamed `_companyId?` to preserve caller compatibility.

---

### RR-S3 — Staging env.js branches missing paymongo_webhook_secret mapping
**Severity:** P2  
**Status:** FIXED (code side) — operator must set env vars  
**Introduced by:** Omission in the `97cd657` PayMongo HMAC commit

**Description:** The `jobhunt` and `eucannajobs` staging branches in `env.js` did not include `paymongo_webhook_secret`. This caused `env.paymongo_webhook_secret` to be `undefined` in staging, making `verifyPaymongoSignature()` return `false` immediately — webhooks are rejected in staging (fail-closed, safe), but webhook testing is impossible.

**Fix:** `paymongo_webhook_secret: process.env.PAYMONGO_WEBHOOK_SECRET_DEV` added to `jobhunt` branch; `..._EUCANNAJOBS` added to eucannajobs branch.

---

### RR-S4 — checkCompanySubscription sends dead ?companyId= in FE
**Severity:** P2  
**Status:** OPEN (backlog)  
**Introduced by:** Pre-existing residual — same pattern as RR-S2

**Description:** `job.service.ts` line 24 and `company.service.ts` line 20 send `?companyId=${companyId}` to `/getsubscriptionrestrictions`. BE ignores it (JWT only). Not exploitable.

**Remediation:** Remove `?companyId=${companyId}` from both callers.

---

### RR-S5 — payment.failed logs full data object (potential PII)
**Severity:** P3  
**Status:** OPEN (backlog)  
**Introduced by:** Pre-existing — not in the audited commits

**Description:** `paymentController.js` line 216: `console.log(data)` on `payment.failed` events. PayMongo may include billing PII in the event payload. The QA11 fix correctly removed PII logging from `payment.paid` but missed `payment.failed`.

**Remediation:** Replace with `console.log('[paymentController] payment.failed id:', data && data.id)`.

---

### RR-S6 — interviewController uses verify+match pattern (vs pure JWT derivation)
**Severity:** P3 (informational)  
**Status:** OPEN (backlog)  
**Introduced by:** Pre-existing design

**Description:** `getAllInterviewsOfCompanies`, `getAllInterviewsTemplatesOfCompanies`, `getAllInterviewRecipientsByCompanyId` accept `companyId` from `req.query` and verify via `callerBelongsToCompany(uid, companyId)`. This is not a BOLA gap — ownership is verified against the JWT. But it is a weaker pattern than pure `getUserCompany(uid)` derivation: it requires two DB round-trips, and the FE drives which companyId scope is requested.

**Remediation:** Migrate to pure JWT derivation in a future sprint.

---

## STANDING RISKS (from prior sessions, not new)

### RR-P1 — Leaked Firebase service account keys in git history
**Severity:** P0  
**Status:** OPEN — awaiting owner action  
`gethired-serviceAccountKey.json` and `jobhunt-serviceAccountKey.json` exist in repo and git history. Rotate both keys in Firebase console immediately.

### RR-P2 — Draft/unpublished job data readable via public endpoint
**Severity:** P2  
**Status:** OPEN — backlog  
`GET /api/job/details?id=<jobId>` returns data for any status including draft/unpublished. Requires knowing the job ID. Low exploitability.

### RR-P3 — InternalEmployerGuard disabled on employer routes
**Severity:** P2  
**Status:** OPEN — backlog  
`employer-panel.module.ts` has `canActivate: [InternalEmployerGuard]` commented out. Employers without completed company setup can access all employer routes.

---

## RISKS MITIGATED (this session + prior sessions)

| ID | Risk | Fix |
|----|------|-----|
| RR-S1 | SQLi in getPublishedJobs | Parameterised queries — this session |
| RR-S2 | FE dead ?id= param | Removed — this session |
| RR-S3 | Staging env missing webhook secret | Mapped in env.js — this session |
| P2 deleteJob | No delete route registered, BOLA in post-delete response | Route registered, JWT-derived scope — `9c0666b` |
| P2-01 basiclist/expiredlist | req.query.id for ownership | JWT-derived — `ba6b31b` |
| CORS wildcard | `cors()` wide-open | `cors({ origin: env.app_url })` — `d4e34c7` |
| F-08 interview BOLA | Child-table no company scope | Company subquery + Promise.all — `d321447` |
| PayMongo webhook | No signature verification | HMAC + replay window — `97cd657` |
| QA11 BOLA-01 | saveGroupInterview trusted req.body.companyId | JWT override — `a0fca7a` |
| QA11 BOLA-02 | getJobApplicantDetails no ownership check | JWT + company match — `a0fca7a` |
| QA11 PII | console.log(webHookPaid) leaked billing PII | ID-only log — `a0fca7a` |
| SEC-03 | No security headers | nosniff/DENY/XSS-0 — `a0fca7a` |
| SEC-01 | No rate limiting | 4-tier limiters — `7f58650` |
