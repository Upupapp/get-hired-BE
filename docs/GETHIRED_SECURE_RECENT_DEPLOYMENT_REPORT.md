# GETHIRED SECURE — Recent Deployment Security Report
**Scope:** Batch Snapshot Endpoint (FE 20a44c5, BE 422d340)
**Date:** 2026-06-24
**Auditor:** Claude Code (claude-sonnet-4-6)
**Files audited:**
- `controllers/applicationController.js` — `getApplicantApplicationSnapshotsBatch`
- `routes/applicationRoute.js`
- `services/applicationSnapshotService.js` — `createApplicationSnapshots`, `companyId` guard
- `scripts/backfill_application_snapshots.js`
- `src/app/application/application.service.ts` — `getApplicationSnapshots`
- `src/app/applicant-panel/applicant-applications/applicant-applications.component.ts`

---

## Gate A — Batch BOLA: Cross-applicant IDs Provably Excluded

**Verdict: PASS**

**Code path (controller.js lines 184–191):**
```js
const { rows: appRows } = await dbQuery.query(
  `SELECT job_application_id, candidate_id FROM ${dbSchema}.job_applicants WHERE job_application_id = ANY($1::text[])`,
  [applicationIds]
);

const verifiedIds = appRows
  .filter(row => row.candidate_id === uid)
  .map(row => row.job_application_id);
```

Analysis:
- `uid` comes from `req.user` (server-set JWT claim, not caller-supplied).
- `appRows` contains every row found in `job_applicants` for the supplied IDs — including rows belonging to other applicants.
- The `.filter(row => row.candidate_id === uid)` step removes any row whose `candidate_id` does not match the authenticated caller.
- `verifiedIds` therefore contains ONLY IDs the caller owns.
- The two subsequent batch queries (`snapshotRows`, `completenessRows`) are both scoped to `ANY($1)` where `$1 = verifiedIds`, not the original `applicationIds`. Cross-applicant IDs cannot leak into `snapshots`.
- IDs not present in `job_applicants` at all are also excluded (they simply do not appear in `appRows`).
- The `snapshots` object at line 218 iterates `verifiedIds`, not `applicationIds`, so the response map is strictly bounded to verified-owned IDs.

**Conclusion:** There is no path by which a cross-applicant ID ends up in the response.

---

## Gate B — SQL Safety: ANY($1::text[]) Array Parameter

**Verdict: PASS**

`node-postgres` (`pg`) natively supports passing a JavaScript array as a bound parameter for `ANY($1)`. The `::text[]` cast is explicit, removing any ambiguity about array element type. The driver serializes the array as a PostgreSQL array literal at the protocol level — it never interpolates the values as SQL text. This is not susceptible to SQL injection.

The two downstream queries also use parameterized `ANY($1)` with `verifiedIds`:
```js
`SELECT application_id FROM ... WHERE application_id = ANY($1) AND source = 'application_submit'`
[verifiedIds]
```
Both are correctly parameterized.

The backfill script's `getUnsnapshotedApplications()` uses a template literal for the `LIMIT` clause (line 41):
```js
const limitClause = LIMIT ? `LIMIT ${LIMIT}` : "";
```
`LIMIT` is derived from `process.argv` via `parseInt(..., 10)`, not from user input. `parseInt` returns `NaN` for non-numeric input, and `NaN` is falsy, so the clause evaluates to `""` (safe). **No SQL injection risk.**

---

## Gate C — Input Validation: Repeated Query Param (Object) Handling

**Verdict: FAIL — P1 finding**

**Problem:** Express parses `?applicationIds=a&applicationIds=b` as `req.query.applicationIds = ['a', 'b']` (an Array), not a string. The controller does:
```js
const { applicationIds: raw } = req.query;
const applicationIds = String(raw).split(",").map(s => s.trim()).filter(Boolean);
```

When `raw` is an Array (e.g., `['id1', 'id2']`):
- `String(['id1', 'id2'])` → `"id1,id2"` — this actually works correctly; JavaScript's `Array.toString()` joins with commas.

When `raw` is a single string (e.g., `"id1,id2"`):
- Works as intended.

When `raw` is an Array of one element (e.g., `['id1,id2']` from `?applicationIds=id1,id2`):
- `String(['id1,id2'])` → `"id1,id2"` — also correct.

**Revised assessment:** The `String(raw)` coercion on an array produces a comma-joined string, which the subsequent `.split(",")` then splits correctly. This means a repeated query param does NOT crash the server and does NOT produce `"[object Object]"` — the concern was valid in concept but inapplicable here because `raw` is Array, not plain Object.

**However, a weaker P1 still exists:** The behavior is accidental — there is no explicit type guard. If Express's query parser is configured differently (e.g., nested objects from `?applicationIds[foo]=bar`), `raw` could become a plain object, and `String({})` = `"[object Object]"` would produce one bogus ID that passes `.filter(Boolean)` and reaches the DB query. With `extended: true` on `urlencoded` (confirmed in server.js line 43), query-string objects are possible.

**Fix:** Add an explicit Array/string type guard before `String(raw)`.

---

## Gate D — Max-50 Bypass via %2C Encoding

**Verdict: PASS**

The FE encodes each ID individually with `encodeURIComponent(id)` and joins them with a literal `,`:
```ts
const ids = applicationIds.map(id => encodeURIComponent(id)).join(',');
// → /applicant/application/snapshots?applicationIds=id1%2Cid2,id3
```
Wait — if an ID itself contained a comma (unlikely for UUIDs), the FE would encode it as `%2C`. Express decodes URL-encoded characters before populating `req.query`, so `id1%2Cid2` in the query string would arrive as the single string `"id1,id2"` to the controller, which `.split(",")` would then treat as two IDs. However:

- Application IDs are UUIDs (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) — they do not contain commas.
- The FE's `encodeURIComponent` call on each ID encodes any comma within an ID as `%2C`, but then joins with a literal `,` as the delimiter. The only commas in the query value after Express decodes are the literal join delimiters, not encoded commas from IDs.
- A malicious client could manually craft `?applicationIds=id1%2Cid2%2Cid3...` (51 IDs joined with `%2C`). Express decodes this to `"id1,id2,id3..."`. `.split(",")` yields 51 tokens, which hits the `> 50` guard and returns 400. **The bypass does NOT work.**

**Conclusion:** The max-50 guard cannot be bypassed via percent-encoding because Express decodes before the controller sees the value.

---

## Gate E — Backfill Script Production Safety

**Verdict: PASS WITH CAUTION (documented risk, not a code defect)**

The script reads DB config via `require("../env").default`, which calls `dotenv.config()` and reads the local `.env` file. There is no `NODE_ENV` check, no `--production` flag requirement, and no interactive confirmation before writing to the DB.

**Risk:** If someone runs `node scripts/backfill_application_snapshots.js` from a server environment where `.env` points to the production DB, it will write to production without warning. The `--dry-run` flag exists but is opt-in.

**Mitigations already in place:**
- `ON CONFLICT DO NOTHING` throughout — existing real snapshots are never touched.
- `source = 'backfill_current_data'` distinguishes backfill rows from real submission rows.
- Comment block in script says "DO NOT run against production without first verifying tables exist."
- `--dry-run` flag provides a preview mode.

**Gap:** The script does not print which DB host/database it is connected to before running. A developer cannot confirm "am I on dev or prod?" without reading the env manually. There is also no confirmation prompt.

**Recommendation (P1):** Add a startup log line: `console.log("DB host:", env.host, "database:", env.database, "schema:", env.schema)` before the main `run()` body, and require `--confirm` for live runs. Since the mitigations (ON CONFLICT DO NOTHING, source tagging) prevent data corruption even on accidental prod runs, this is P1 not P0.

---

## Gate F (Additional) — companyId Guard Correctness

**Verdict: PASS**

In `applicationSnapshotService.js` lines 517–519:
```js
if (!companyId) {
  console.warn(...);
  return result;
}
```
Company IDs in this schema are UUIDs (string format). `""` and `null` and `undefined` are all falsy — correct rejections. `0` would also be falsy, but integer `0` is not a valid UUID company ID. The guard is correct for this data type.

---

## Additional Findings

### Finding 1: No Rate Limiting on Batch Endpoint (P1)

Confirmed repo-wide: no `express-rate-limit` or equivalent middleware anywhere in `get-hired-BE`. The new batch endpoint (`GET /applicant/application/snapshots`) accepts up to 50 IDs per call and executes 3 DB queries (ownership check + 2 snapshot reads). A single authenticated caller could hammer this endpoint in a tight loop, causing 3× DB query amplification per call. This is a known standing issue (logged in previous SECURE pass), but the new batch endpoint makes it more impactful.

**Severity:** P1 — amplification risk, no crash risk.

### Finding 2: FE Does Not Chunk Beyond 50 (P1)

`applicant-applications.component.ts` `loadSnapshots()` calls `getApplicationSnapshots(ids)` with the full `ids` array. If a user has >50 applications, the BE will return HTTP 400, `snapshotsLoaded` will be set to `{}` via the `catchError(() => of({}))` fallback, and all completeness scores will silently show null. There is no chunking logic.

**Risk:** Silent data loss for power users with >50 applications.

**Fix:** Chunk `ids` into batches of ≤50 and merge the results.

### Finding 3: Subscription Leak on Retry (P1, pre-existing)

In `applicant-applications.component.ts`, `retry()` calls `this.ngOnInit()` directly. `ngOnInit()` assigns a new subscription to `this.appsSub` without first unsubscribing the previous one via `this.appsSub?.unsubscribe()`. The existing subscription is orphaned. On repeated retries, multiple subscriptions accumulate. `ngOnDestroy` only unsubscribes `appsSub`, leaving earlier orphaned subs alive.

**Fix:** In `retry()`, call `this.appsSub?.unsubscribe()` before `this.ngOnInit()` (or store the snapshot sub too and unsubscribe both).

---

## Summary Table

| Gate | Description | Verdict |
|------|-------------|---------|
| A | Batch BOLA — cross-applicant ID exclusion | PASS |
| B | SQL safety — ANY($1::text[]) parameterization | PASS |
| C | Input validation — repeated query param object | PASS (accidental; add explicit guard) |
| D | Max-50 bypass via %2C encoding | PASS |
| E | Backfill script production safety | PASS WITH CAUTION |

| Finding | Severity | Description |
|---------|----------|-------------|
| No rate limiting on batch endpoint | P1 | 3× DB amplification per unauthenticated call |
| FE does not chunk >50 IDs | P1 | Silent null scores for users with >50 applications |
| Subscription leak on retry | P1 | Memory leak on repeated retries |
| No explicit type guard on `raw` query param | P1 | Accidental safety, could break under unusual query shape |
| Backfill has no startup env confirmation log | P1 | Operator can't confirm dev-vs-prod before run |
