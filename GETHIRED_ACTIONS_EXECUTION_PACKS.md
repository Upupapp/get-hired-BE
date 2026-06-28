# GETHIRED ACTIONS EXECUTION PACKS
## QA Cycle 11 — 10 Ready-to-Execute Work Packs

**Generated:** 2026-06-25
**Format:** Each pack is a self-contained unit of work a single developer can pick up and complete in one session. Dependencies are explicit.

---

## PACK-01 — Webhook Security (P0 — DO FIRST)
**Session time:** 3-4 hours
**Depends on:** Paymongo webhook secret from dashboard (prerequisite: log in to Paymongo dashboard first)
**Files to change:**
- `server.js` — add `express.raw()` middleware on webhook route before `express.json()`
- `controllers/paymentController.js` — add HMAC check at top of `paymongoWebhook`
- `.env.example` — document `PAYMONGO_WEBHOOK_SECRET`
- `.env` (local + production) — add the real secret

**Step-by-step:**
1. Get webhook secret from Paymongo dashboard → Webhooks → Secret key
2. Add `PAYMONGO_WEBHOOK_SECRET=xxx` to production `.env` via SSH
3. In `server.js`, before the global `express.json()` middleware:
   ```javascript
   app.use('/api/payment/paymongowebhook', express.raw({ type: 'application/json' }));
   ```
4. In `paymongoWebhook`:
   ```javascript
   const signature = req.headers['paymongo-signature'];
   const rawBody = req.body; // Buffer when express.raw() is used
   const expected = crypto.createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET)
     .update(rawBody).digest('hex');
   if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
     return res.status(401).end();
   }
   const { data } = JSON.parse(rawBody); // parse manually after verification
   ```
5. Test with a forged POST — confirm 401
6. Test with Paymongo test event — confirm 200 and subscription created

**Gate:** Deploy and verify in staging before production.

---

## PACK-02 — Security Hardening Bundle (P1)
**Session time:** 2-3 hours
**Depends on:** Know the production FE hostname
**Files to change:**
- `server.js` (3 changes)

**Changes:**
1. **CORS:** Replace `app.use(cors())` with:
   ```javascript
   const corsOption = {
     origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:4200').split(','),
   };
   app.use(cors(corsOption));
   ```
   Add `ALLOWED_ORIGINS=https://gethired.ph,http://localhost:4200` to `.env`

2. **Body limit:** Change both express.json and express.urlencoded limits from `"50mb"` to `"1mb"`

3. **Rate limits:** Add before route mounting:
   ```javascript
   app.use("/api/auth/resendverificationlink", sensitiveLimiter);
   app.use("/api/auth/manualexcelverification", sensitiveLimiter);
   ```

4. **nosniff header:** Add after compression middleware:
   ```javascript
   app.use((_, res, next) => {
     res.setHeader('X-Content-Type-Options', 'nosniff');
     res.setHeader('X-Frame-Options', 'DENY');
     next();
   });
   ```

**Gate:** After deploy, verify with `curl -I /api/job/published`:
- `access-control-allow-origin` not present for unlisted origins
- `x-content-type-options: nosniff` present
- Send 1.1MB JSON body → 413

---

## PACK-03 — B01 Read-State Migration (P1)
**Session time:** 4-5 hours (includes migration + service + FE)
**Depends on:** None
**Files to change:**
- DB migration (new SQL file or run directly)
- `services/message.service.js`
- `controllers/messageController.js`
- `routes/messageRoutes.js`
- FE `message.service.ts`
- FE `recruiter-messages.component.ts` + HTML

**Steps:**
1. Migration: `ALTER TABLE <schema>.message_threads ADD COLUMN recruiter_last_read_at TIMESTAMPTZ DEFAULT NULL;`
2. BE: Add `markThreadRead(threadId, callerUid)` function to `message.service.js` — UPDATE `recruiter_last_read_at = now()` WHERE id=$1 AND company_id = callerCompany.companyId
3. BE: New controller function `patchThreadRead` in `messageController.js`
4. BE: `router.patch("/messages/thread/:id/read", verifyAuth, patchThreadRead)` in `messageRoutes.js`
5. BE: `listRecruiterThreads` adds `isUnread: row.recuriterLastReadAt === null || row.updatedAt > row.recruiterLastReadAt`
6. FE: `RecruiterThreadSummary` interface adds `isUnread: boolean`
7. FE: On thread select in `recruiter-messages.component.ts`, call `messageService.markThreadRead(thread.threadId)`
8. FE: Sidebar badge shows count of threads where `isUnread=true`

**Gate:** QA-08 end-to-end test.

---

## PACK-04 — Interview Hub Pagination (P2)
**Session time:** 3 hours
**Depends on:** None
**Files to change:**
- `controllers/interviewController.js`
- FE `recruiter-interview-hub.service.ts`
- FE `recruiter-interview-hub.component.ts` + HTML

**Steps:**
1. BE: `getInterviewHub` reads `limit = parseInt(req.query.limit) || 50` (max 200), `offset = parseInt(req.query.offset) || 0`
2. BE: Add a COUNT query before or use `COUNT(*) OVER()` window function:
   ```sql
   SELECT COUNT(*) OVER() AS total_count, ... FROM ... LIMIT $2 OFFSET $3
   ```
3. BE: Response: `{ items, total: rows[0]?.total_count || 0, limit, offset }`
4. FE service: `getInterviewHub(limit=50, offset=0)` passes as query params
5. FE component: add `currentOffset`, `totalCount`, `pageSize` properties; "Load more" button calls `getInterviewHub(50, currentOffset + 50)` and appends to items

**Gate:** QA-09 end-to-end test with >50 applications in staging.

---

## PACK-05 — Test Runner Setup + Hub Tests (P2)
**Session time:** 4-5 hours
**Depends on:** PACK-04 (hub pagination) for accurate test expectations
**Files to change:**
- `package.json`
- `jest.config.js` (new)
- `.babelrc` or `babel.config.js` (new)
- `tests/interviewController.test.js` (new)
- `tests/messageService.test.js` (new)
- FE `recruiter-interview-hub.component.spec.ts` (new)

See QA-01, QA-02, QA-03, QA-04 for full test case lists.

**Gate:** `npm test` exits 0 with all tests passing.

---

## PACK-06 — Messages Pagination + Error Sanitization (P2)
**Session time:** 2 hours
**Depends on:** None (can run in parallel with PACK-03)
**Files to change:**
- `services/message.service.js` (add LIMIT to listRecruiterThreads)
- `controllers/messageController.js` (pass query params)
- `controllers/companiesController.js` (sanitize addCompanyUserByEmail errors)

**Steps:**
1. `listRecruiterThreads(callerUid, { limit=100, offset=0 } = {})` — add LIMIT/OFFSET to SQL
2. `getRecruiterThreads` controller: read `req.query.limit` / `req.query.offset`, pass to service
3. `addCompanyUserByEmail`: normalize all return `msg` values to `"invited"`, `"already_registered"`, `"failed"` only
4. `addCompanyUser` catch block: log `error` but return `{ message: "Operation failed." }` only

---

## PACK-07 — deleteJob Route + Soft Delete (P2)
**Session time:** 3-4 hours
**Depends on:** Confirm `deleteJob` function in `controllers/jobsController.js`
**Files to change:**
- `routes/jobsRoute.js`
- `controllers/jobsController.js`
- FE employer-joblist component

**Steps:**
1. Check `deleteJob` in jobsController — add BOLA guard (verify caller owns job via getUserCompany)
2. Change to soft-delete: `UPDATE jobs SET is_deleted=true, deleted_at=now() WHERE job_id=$1 AND company_id=$2`
3. Uncomment route in jobsRoute.js
4. FE: Add "Delete job" button with confirmation dialog; on success remove from list

---

## PACK-08 — Fix getListByUser + Implement Applicant Interview List (P2)
**Session time:** 4 hours
**Depends on:** Confirm interview schema tables
**Files to change:**
- `services/interview.service.js`
- `controllers/interviewController.js`

**Steps:**
1. Read `interview_recipients` table schema — find columns linking to `uid` / applicant
2. Write `getInterviewsOfUser(uid)` service function with appropriate JOINs
3. Uncomment the call in `getListByUser` controller
4. Ensure empty case returns `[]` not `null`

---

## PACK-09 — Fix paid_at Timestamp Bug (P2 — Correctness)
**Session time:** 30 minutes
**Depends on:** None
**Files to change:**
- `controllers/paymentController.js`
- `controllers/interviewController.js`

**Steps:**
1. In `paymentController.js`: remove `const now = new Date()` from module level (line 7). Inside `paymongoWebhook`, anywhere `now` is used in a DB query parameter, replace with `new Date()`
2. In `interviewController.js`: same — `const now = new Date()` at line 20 is module-level; move inside any function that uses it

**Gate:** Verify `paid_at` timestamps are current time, not server-start time.

---

## PACK-10 — nosniff + Security Headers Verification
**Session time:** 1 hour
**Depends on:** PACK-02 deployed
**Action:** Manual verification pass:
- `curl -I https://api.gethired.ph/` — check all security headers
- `curl -I https://gethired.ph/` (FE) — check Angular SSR or static hosting headers
- Document any remaining gaps in GETHIRED_SECURITY_ACTIONS.md
- Add helmet if manual header approach is insufficient
