# GETHIRED_SECURE_RELEASE_GATE_RECENT_V1.md
Generated: 2026-06-25 (this session) | Scope: Commits 97cd657..9c0666b + SQLi fix

---

## OVERALL VERDICT: GO — with one mandatory deploy action

The 7 security commits are all correctly implemented. One additional P0 SQL injection was found and fixed in this session. The `getPublishedJobs` SQLi fix MUST be deployed before the endpoint receives public traffic.

---

## GATE RESULTS

### A — Secret Safety
**Result: PASS**

- No new secrets introduced by any of the audited commits
- `paymongo_webhook_secret` correctly read from `process.env.PAYMONGO_WEBHOOK_SECRET` — not hardcoded
- Staging env branches now have the mapping (env vars must be set separately by operator)
- Pre-existing issue: `gethired-serviceAccountKey.json` in git history — rotation required (EA-RECENT-02, still OPEN from prior session)

### B — Auth Protection
**Result: PASS**

- All 7 audited commits correctly apply `verifyAuth` to any new routes
- `DELETE /job/delete` registered with `verifyAuth` — confirmed line 33 of `jobsRoute.js`
- `/job/basiclist`, `/job/expiredlist` both already had `verifyAuth` (unchanged) — confirmed
- `GET /api/job/published` is intentionally public (public job board) — no auth added (correct)
- No new unauthenticated write endpoints introduced

### C — Object-Level Authorization (BOLA/IDOR)
**Result: PASS**

- All 7 audited commits use `getUserCompany(req.user.uid)` pattern consistently
- deleteJob: ownership enforced in `WHERE company_id=$2` (parameterised, JWT-derived)
- basiclist/expiredlist: companyId derived from JWT, no caller-supplied ID accepted
- updateQuestionById: added defence-in-depth company subquery for child-table BOLA
- No cross-company data access possible through any of these endpoints

### D — SQL Injection Safety
**Result: PASS — one P0 was found and fixed**

| Query | Status |
|-------|--------|
| `deleteJob` DELETE query | PASS — parameterised: `WHERE job_id=$1 AND company_id=$2` |
| `getJobBasicListOfCompany` | PASS — parameterised: `WHERE company_id = $1` |
| `getExpiredJobListOfCompany` | PASS — same as above |
| `getPublishedJobs` | FIXED this session — was string interpolation; now parameterised |
| `updateQuestionById` company subquery | PASS — parameterised: `WHERE company_id=$7` |
| `paymongoWebhook` UPDATE | PASS — all values parameterised |

**DEPLOY BLOCKER: `getPublishedJobs` SQLi fix must be deployed before production traffic.**

### E — PayMongo Webhook Safety
**Result: PASS**

- HMAC-SHA256 verification confirmed
- Constant-time comparison via `crypto.timingSafeEqual()` — no timing oracle
- 5-minute replay window enforced
- rawBody captured at the `express.json` middleware level — byte-exact representation preserved
- Unsigned/forged requests rejected with HTTP 400
- `env.paymongo_webhook_secret` will be `undefined` if env var not set → fail-closed (safe)

**Operator action required:** Set `PAYMONGO_WEBHOOK_SECRET` env var in production `.env`

### F — CORS
**Result: PASS**

- `cors({ origin: env.app_url })` replaces wide-open `cors()`
- `env.app_url` = `https://gethiredonline.app` in prod (via `process.env.APP_URL`)
- Only the Angular SPA origin is whitelisted
- No server-to-server calls affected by CORS

### G — Rate Limiting
**Result: PASS**

- 4 tiers operational: global (500/15min), auth (20/15min), write (100/15min), sensitive (10/hr)
- All tiers applied before route mounting
- `writeLimiter` skips GET/HEAD/OPTIONS correctly
- Standard RFC 6585 headers enabled; legacy `X-RateLimit-*` disabled

### H — Security Headers
**Result: PASS**

- `X-Content-Type-Options: nosniff` — present
- `X-Frame-Options: DENY` — present
- `X-XSS-Protection: 0` — present (correct; disables legacy IE filter which can be exploited)
- Applied globally in `server.js` middleware before route mounting

### I — FE NgRx Delete Chain
**Result: PASS**

- `deleteJobPost()` sends only `{ body: { jobId } }` — no companyId
- NgRx action `deleteJob` carries only `{ jobId: string }`
- Dead `?id=` params removed from `getJobBasicList` / `getJobExpiredList`

### J — Privacy / Data Protection
**Result: PASS**

- PII log (`console.log(webHookPaid)`) removed — now only logs `webHookPaid.id`
- `payment.failed` still logs full `data` object — backlog (INFO-01), low severity

### K — Regression Safety
**Result: PASS**

- `deleteJob` was previously a dead route (commented out in router) — registering it activates a flow that previously fell back to `changeJobStatus(4)` (archive). The archive path still works; delete is now an additional, separate flow.
- `basiclist`/`expiredlist` BE change is backwards-compatible: the ?id= param was previously read, is now ignored. Any FE sending the old param still works.
- FE `getJobBasicList/_ExpiredList` signature change (`_companyId?` optional) — all existing callers still compile; param is accepted and silently ignored.
- `interviewQuestionsUpdate` now uses `Promise.all` instead of `.map(async)` — this means errors that were previously swallowed now propagate. This is a correctness improvement; the only change in observable behaviour is that a question update failure now rejects the parent `updateJob` call instead of silently failing.

---

## SUMMARY TABLE

| Gate | Result | Blocker |
|------|--------|---------|
| A Secret Safety | PASS | Pre-existing key rotation (EA-RECENT-02, standing) |
| B Auth Protection | PASS | None |
| C BOLA/IDOR | PASS | None |
| D SQL Injection | PASS after fix | Deploy getPublishedJobs fix (DONE this session) |
| E PayMongo Webhook | PASS | Set PAYMONGO_WEBHOOK_SECRET in prod .env |
| F CORS | PASS | None |
| G Rate Limiting | PASS | None |
| H Security Headers | PASS | None |
| I FE NgRx Chain | PASS | None |
| J Privacy | PASS | None |
| K Regression | PASS | None |

---

## MANDATORY BEFORE GO-LIVE

1. Deploy `services/job.service.js` SQLi fix to production (this session's code change)
2. Set `PAYMONGO_WEBHOOK_SECRET` in production `.env` (webhook will reject all events until set — fail-closed but breaks payment flow)
3. Set `PAYMONGO_WEBHOOK_SECRET_DEV` in staging `.env` if webhook testing is needed in staging

## RECOMMENDED BEFORE GO-LIVE

4. Rotate Firebase service account keys (EA-RECENT-02 — pre-existing P0, standing action)
