# GETHIRED_SECURE_FIX_LOG_RECENT_V1.md
Generated: 2026-06-25 (this session) | Fixes applied during this security audit

---

## FIX-01 — P0 SQL Injection: getPublishedJobs() parameterised

**Severity:** P0  
**File:** `services/job.service.js`  
**Function:** `getPublishedJobs(companyId)`

**Before:**
```js
const filter = companyId ? `and j.company_id = '${companyId}'` : "";
const searchQuery = `... WHERE j.job_status_id = 2 ${filter} ...`;
const { rows } = await dbQuery.query(searchQuery, []);
```

**After:**
```js
// companyId branch:
searchQuery = `... WHERE j.job_status_id = 2 AND j.company_id = $1 ...`;
params = [companyId];

// no-companyId branch:
searchQuery = `... WHERE j.job_status_id = 2 ...`;
params = [];
```

**Why it matters:** `getAllPublishedJobs` (the HTTP handler) takes `id` from `req.query` and passes it directly to this function. The route has no authentication. An unauthenticated attacker could send `GET /api/job/published?id=x' OR '1'='1'--` to dump the entire jobs table.

**Test:**
- `GET /api/job/published` — returns all published jobs (no id) — unchanged behaviour
- `GET /api/job/published?id=JB123456` — returns only that company's published jobs (parameterised)
- `GET /api/job/published?id=JB123456' OR '1'='1'--` — now treated as a literal string, no match, returns []

---

## FIX-02 — P2 FE dead query param removed from basiclist/expiredlist

**Severity:** P2 (cosmetic/contract clarity)  
**File:** `get-hired-FE/src/app/job/job.service.ts`

**Before:**
```typescript
getJobBasicList(companyId: string) {
  return this.baseService.get<Model.BasicList[]>(`${this.jobUrl}/basiclist?id=${companyId}`);
}

getJobExpiredList(companyId: string) {
  return this.baseService.get<Model.BasicList[]>(`${this.jobUrl}/expiredlist?id=${companyId}`);
}
```

**After:**
```typescript
// P2-01 FIX: removed dead ?id= param — BE now derives company from JWT
getJobBasicList(_companyId?: string) {
  return this.baseService.get<Model.BasicList[]>(`${this.jobUrl}/basiclist`);
}

getJobExpiredList(_companyId?: string) {
  return this.baseService.get<Model.BasicList[]>(`${this.jobUrl}/expiredlist`);
}
```

**Why it matters:** The BE P2-01 fix correctly ignores the `?id=` param. But the FE was still sending it, making the API contract misleading — any future BE developer might restore the vulnerability thinking the param is expected. The `_companyId?` signature keeps all 3 callers (effects, facade, any direct calls) compatible without breaking anything.

**Callers not broken:**
- `job.effects.ts` line 125: `this.jobService.getJobBasicList(action.companyId)` — companyId now goes to unused param
- `job.effects.ts` line 143: `this.jobService.getJobExpiredList(action.companyId)` — same
- `job.facade.ts` line 88, 92: dispatches action with companyId in store — store/action shape unchanged

---

## FIX-03 — P2 Staging env.js branches: paymongo_webhook_secret added

**Severity:** P2 (operational gap)  
**File:** `env.js` — staging switch cases `jobhunt` and `eucannajobs`

**Before:** No `paymongo_webhook_secret` key in either staging config object.

**After:** 
```js
// jobhunt branch:
paymongo_webhook_secret: process.env.PAYMONGO_WEBHOOK_SECRET_DEV,

// eucannajobs branch:
paymongo_webhook_secret: process.env.PAYMONGO_WEBHOOK_SECRET_EUCANNAJOBS,
```

**Why it matters:** Without the key, `env.paymongo_webhook_secret` is `undefined` in staging, causing `verifyPaymongoSignature()` to immediately return `false` (fail-closed is safe, but means webhook testing is impossible in staging). Adding the mapping allows each staging environment to have its own webhook secret in `.env`.

**Operator action required:** Add `PAYMONGO_WEBHOOK_SECRET_DEV` (and `_EUCANNAJOBS` if that env is active) to the respective `.env` files on the staging servers. The code change alone does nothing until the env var is set.

---

## VERIFICATION — PREVIOUSLY COMMITTED FIXES

These were committed before this session and were verified correct during this audit (no changes needed):

| Commit | Fix | Verified |
|--------|-----|---------|
| `9c0666b` | deleteJob: verifyAuth + ownership-scoped DELETE + 404 on miss | PASS — all 5 checklist items |
| `ba6b31b` | basiclist/expiredlist: JWT-derived companyId, req.query.id removed | PASS |
| `d4e34c7` | CORS: `cors({ origin: env.app_url })` | PASS |
| `d321447` | updateQuestionById: company subquery; interviewQuestionsUpdate threads companyId | PASS |
| `97cd657` | PayMongo: constant-time HMAC, 5-min replay, rawBody capture | PASS |
| `a0fca7a` | saveGroupInterview BOLA fix; getJobApplicantDetails BOLA fix; PII log removal; security headers | PASS |
| `7f58650` | 4-tier rate limiting: global/auth/write/sensitive | PASS |

---

## NOT FIXED THIS SESSION (Backlog)

| ID | Issue | Reason deferred |
|----|-------|----------------|
| FE-02 | checkCompanySubscription sends dead ?companyId= | BE ignores it; safe; cleanup-only |
| INFO-01 | payment.failed logs full data object | Low risk; internal logs only |
| INFO-02 | interviewController: verify+match pattern vs pure JWT derivation | Not a BOLA gap; improvement only |
