# GETHIRED_BACKEND_EFFICIENCY_AUDIT.md
## QA Cycle 11 — Backend Efficiency Audit

### Pool configuration

```js
// db/dbQuery.js
const pool = new Pool({ max: 1, ... });
```

`max: 1` means a single pg connection. This is the single largest performance constraint on the entire backend. Under concurrent requests, all queries queue behind one another. For the current single-Linode deployment with low traffic, this is functional but a serious bottleneck if traffic increases. A value of `max: 5` or `max: 10` would be appropriate for the hardware. **This is a pre-existing issue — not introduced this cycle, not touched by OPTIMIZE (high-caution item).**

---

### `GET /api/interview/hub` query analysis

**Joins:** 5 JOINs including one derived subquery (interview_answers GROUP BY).

**LIMIT 200:** The LIMIT 200 is the correct guard for current scale. Without it, a company with 5,000 applications would return all of them in one HTTP response, creating:
- Large DB query result
- Large JSON response payload
- Long FE render time for 5,000 cards

**Risk at scale:** A company with exactly 200 applications will always receive all 200. A company with 201 applications silently misses the oldest 1. No pagination cursor is returned in the response — the FE receives `{ items: [...], total: items.length }` where `total` is the count of returned items (not the true total count in the DB). This is a **misleading API design** — `total` implies the true count but is actually the capped result count.

**Recommendation:** Either:
a. Return a `hasMore: boolean` field alongside `total` so the FE knows data was truncated, or
b. Count total separately: `SELECT COUNT(*) ... WHERE j.company_id = $1 AND is_archived IS DISTINCT FROM true` and return it as `totalCount` alongside `items`.

**This is a small, safe, additive change.**

---

### `listRecruiterThreads()` query analysis

**NEW JOIN:** `LEFT JOIN users u ON u.uid = mt.applicant_uid` — added in this cycle to enrich applicant name/photo.

**Performance impact:** The `users` table is indexed on `uid` (primary key or unique). This JOIN adds one lookup per thread row. For 50 threads that's 50 key lookups against an indexed column — fast. The LATERAL subquery for `last_msg` is also efficient (index on `messages.thread_id`, if present).

**Missing LIMIT:** `listRecruiterThreads()` has no LIMIT. A company with 500 message threads returns all 500 in one query. Low immediate risk, but `LIMIT 200 OFFSET $2` with a `page` param should be added in a follow-up.

---

### Rate-limiter efficiency

`express-rate-limit@6.11.2` in-memory store adds O(1) map lookup per request. Overhead: sub-millisecond. The 4-tier stacking means up to 4 map lookups per request — still negligible.

**Stacked middleware hit on auth endpoints:** A POST to `/api/auth/changepassword` runs through `globalLimiter → authLimiter → writeLimiter → sensitiveLimiter` — 4 middleware functions. Each does a map read+write. Total overhead: <2ms. Acceptable.

---

### `interviewController.js` — `callerBelongsToCompany` pattern

Multiple handlers call `callerBelongsToCompany(req.user.uid, companyId)` which internally calls `getUserCompany(uid)`. For `getInterviewHub()`, this is called once at the top of the handler. No repeated calls in the same request. Efficient.

---

### DB query in `updateJobInterviewQuestion` (OPT-QA9-1 fold)

The QA9 fix already collapsed a separate SELECT round-trip into the UPDATE WHERE clause — this is correct and efficient. Already optimized.

---

### Summary of backend efficiency findings

| # | Finding | Severity | Action |
|---|---|---|---|
| BE1 | `pool max: 1` — serial query execution | High | Increase to 5-10 in follow-up. Do not touch in OPTIMIZE. |
| BE2 | `getInterviewHub` returns misleading `total` (capped, not true total) | Medium | Add `hasMore` or true `totalCount` field — small additive fix (backlog) |
| BE3 | `listRecruiterThreads` has no LIMIT | Medium | Add LIMIT 200 pagination (backlog) |
| BE4 | LEFT JOIN users in `listRecruiterThreads` — new this cycle | Low | Acceptable. One indexed lookup per thread row. |
| BE5 | `interview_answers` GROUP BY in derived subquery — unindexed on `applicant_id`? | Medium | Verify `interview_answers.applicant_id` is indexed. Add if missing. |
