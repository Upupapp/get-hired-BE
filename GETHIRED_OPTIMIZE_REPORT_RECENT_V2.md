# GetHired Optimize Report — Recent Deployment (V2)
Scope: BE `8a2a205` / FE `a25cb38` | Date: 2026-06-25

---

## 1. Pool Sizing — Missing Timeout Config (ACTION REQUIRED)

**File:** `db/dbQuery.js`

The pool config has `max: 10` but no `idleTimeoutMillis` or `connectionTimeoutMillis`. pg defaults: idle connections are held **forever**, and a checkout that cannot acquire a connection **also waits forever** (no timeout error, just a hung request).

With `max: 10` and four heavy JOINs on `listRecruiterThreads` (see §3), a burst of 10 concurrent recruiter inbox loads will exhaust the pool; the 11th request hangs silently with no timeout, no error, no log.

**Recommended config:**
```js
const pool = new Pool({
  max: 10,
  idleTimeoutMillis: 30000,       // release idle connections after 30 s
  connectionTimeoutMillis: 5000,  // return error after 5 s if pool exhausted
  user: env.user, host: env.host, database: env.database,
  password: env.password, port: env.db_port,
});
```

---

## 2. RecordRTC Bundle Impact — Net Improvement, with One Caveat

**File:** `get-hired-FE/src/app/recorder/recorder.service.ts`

The dynamic `import('recordrtc')` is placed inside the private `record()` method, which is called at the moment the user clicks Record. This is correct webpack-level code splitting. RecordRTC is excluded from the initial bundle and emitted as a separate async chunk (~200 KB min+gz estimated).

**Angular 13 behaviour:** Angular's router-based lazy loading does not apply here (this is a service, not a routed module), but webpack 5 still emits an async chunk for any dynamic `import()`. The chunk is fetched on first `record()` call — not at app boot. This is a net improvement: the initial bundle shrinks by ~200 KB and users who never record never download RecordRTC.

**Caveat:** The `import()` is re-evaluated on every `record()` call. Modern bundlers cache the resolved module, so subsequent calls are synchronous after the first. No correctness issue, but the `await import(...)` on line 98 could be moved to the constructor or a `private ensureRecordRTC()` helper to make the intent explicit. Not a blocking issue.

---

## 3. `listRecruiterThreads` Query — Indexing Unknown, Risk Moderate

**File:** `services/message.service.js` lines 187–221

The query joins `message_threads` → `jobs` → `users` → `user_credentials` + a LATERAL subquery into `messages`. The WHERE is `mt.company_id = $1` and ORDER is `mt.updated_at DESC LIMIT 200`.

No index definitions exist in the BE repo (DDL lives outside). The critical indexes needed:

| Table | Column | Reason |
|---|---|---|
| `message_threads` | `company_id` | Primary filter — full scan without this |
| `message_threads` | `updated_at DESC` | ORDER BY + LIMIT pushdown |
| `messages` | `thread_id, created_at DESC` | LATERAL last-message lookup per thread |
| `users` | `uid` | JOIN condition |
| `user_credentials` | `uid` | JOIN condition |

With pool `max: 10` (§1), concurrent recruiter inbox loads hitting an un-indexed `message_threads.company_id` scan on a large table will saturate the pool. Verify indexes via `\d message_threads` on prod before the next traffic spike.

---

## 4. Factory Function Overhead — Negligible, Confirmed No Deep Clone

**File:** `helpers/status.js` line 14

```js
const successResponse = (data) => ({ status: "success", data });
```

Returns a new plain object wrapping `data` by reference. No cloning, no serialisation, no recursion. Overhead is a single object allocation per response. Confirmed safe.

---

## 5. N+1 Patterns — Two Existing, One New

### applicantsController.js — `Promise.all` patterns (safe)
`saveWorkExp`, `saveEducBg`, `saveCert` all use `await Promise.all(arr.map(async ...))`. These fire parallel queries per item but are gated behind a delete-then-reinsert pattern on small user-owned arrays (work experience, education, certs). Not a production risk at realistic data sizes.

### jobsController.js — `createJobs`: bare `.map(async)` without `await` (BUG)
```js
// line 141–148
const rawQuestions = Promise.all(
  await interviewQuestions.map(async (question) =>
    await createQuestion(question, template.jobInterviewTemplateId)
  )
);
rawQuestions.then((ques) => (questions = ques));
```
`Promise.all(await arr.map(...))` — `arr.map()` returns a plain array (not a Promise), so `await` on it resolves immediately and `Promise.all` wraps sync values. The `.then()` is fire-and-forget; if any `createQuestion` fails, the error is swallowed and `createJobs` returns success with zero questions saved. This pre-dates the deployment under review but is a correctness bug. Fix: `const questions = await Promise.all(interviewQuestions.map(q => createQuestion(q, template.jobInterviewTemplateId)));`

### applicationController.js — No N+1 introduced
Batch queries use `ANY($1::text[])` (§`getApplicantApplicationSnapshotsBatch`). Clean.

---

## Summary

| # | Finding | Severity | Action |
|---|---|---|---|
| 1 | No `idleTimeoutMillis` / `connectionTimeoutMillis` | High | Add both to pool config |
| 3 | `listRecruiterThreads` index coverage unknown | Medium | Verify `company_id`, `updated_at`, `thread_id/created_at` indexes on prod |
| 5a | `createJobs` fire-and-forget question inserts (pre-existing) | Medium | Wrap in `await Promise.all(...)`, remove `.then()` |
| 2 | RecordRTC dynamic import — net improvement | Low | Optional: hoist to constructor for clarity |
| 4 | `successResponse` factory overhead | None | No action needed |
