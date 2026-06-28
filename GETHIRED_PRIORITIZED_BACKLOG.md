# GETHIRED PRIORITIZED BACKLOG
## QA Cycle 11 — Full Backlog

**Generated:** 2026-06-25

---

## Action Schema
Each action carries: ID | Title | Priority | Category | Effort | Files | Depends On | Acceptance Criteria

---

## P0 — LAUNCH BLOCKERS (must ship before real-money processing)

### GH-ACT-P0-01 — Paymongo Webhook Signature Verification
**Priority:** P0
**Category:** Security / Payment
**Effort:** M (3-4 hours + Paymongo dashboard setup)
**Files:** `controllers/paymentController.js`
**Depends On:** Paymongo webhook secret from dashboard (manual step)
**Acceptance Criteria:**
- [ ] Retrieve `Paymongo-Signature` header from `req.headers`
- [ ] Compute HMAC-SHA256 of raw request body using webhook secret from env
- [ ] Compare signatures in constant-time (`crypto.timingSafeEqual`)
- [ ] Return HTTP 401 with no body on mismatch (do not process event)
- [ ] Return HTTP 200 only after valid signature + successful processing
- [ ] Unit test: forged signature returns 401; valid signature processes event
- [ ] Env var `PAYMONGO_WEBHOOK_SECRET` documented in `.env.example`
**Source:** CAT-01 / prior P3 list (re-classified P0 — blocks real payment go-live)

---

## P1 — CRITICAL (pre-beta, high confidence)

### GH-ACT-P1-01 — B01 BACKLOG-01: Add recruiter_last_read_at to message_threads
**Priority:** P1
**Category:** Feature / Schema
**Effort:** S (2-3 hours — migration + service + FE badge)
**Files:** `services/message.service.js`, FE `message.service.ts`, FE `recruiter-messages.component.ts`
**Depends On:** None (additive column with default NULL)
**Acceptance Criteria:**
- [ ] Migration: `ALTER TABLE message_threads ADD COLUMN recruiter_last_read_at TIMESTAMPTZ DEFAULT NULL`
- [ ] `listRecruiterThreads` marks `isUnread: thread.updated_at > recruiter_last_read_at || recruiter_last_read_at IS NULL`
- [ ] New endpoint or param: `PATCH /api/messages/thread/:id/read` updates `recruiter_last_read_at = now()`
- [ ] FE: unread badge count shown in sidebar and thread list
- [ ] FE: marking thread read on open calls the PATCH endpoint
- [ ] No regression on `needsReply` filter
**Source:** B01 BACKLOG-01 carried from prior cycles

### GH-ACT-P1-02 — Tighten CORS to Allowed Origins
**Priority:** P1
**Category:** Security / Tech Debt
**Effort:** S (30 min)
**Files:** `server.js`
**Depends On:** Know the production FE hostname (move env var `ALLOWED_ORIGINS`)
**Acceptance Criteria:**
- [ ] `corsOption` block is uncommented and applied via `app.use(corsOption)`
- [ ] Whitelist includes production FE domain + localhost:4200 for dev
- [ ] Non-whitelisted origins receive CORS error
- [ ] No regression on existing FE calls from localhost:4200
**Source:** CAT-12

### GH-ACT-P1-03 — Reduce Global JSON Body Limit to 1MB
**Priority:** P1
**Category:** Security / Tech Debt
**Effort:** S (30 min + test for file-upload routes)
**Files:** `server.js`, any route using multer (file uploads)
**Depends On:** Audit file-upload routes to confirm they use multer (not express.json)
**Acceptance Criteria:**
- [ ] `express.json({ limit: "1mb" })` replaces 50mb globally
- [ ] `express.urlencoded({ limit: "1mb" })` replaces 50mb globally
- [ ] File-upload routes verified to use multer (bypass the json parser body limit)
- [ ] Attempt to POST >1MB JSON to `/api/messages/thread/send` returns HTTP 413
- [ ] No regression on normal use cases
**Source:** CAT-13

---

## P2 — IMPORTANT (pre-beta, should complete before opening to real users)

### GH-ACT-P2-01 — B03 Interview Hub: Add Offset/Limit Pagination
**Priority:** P2
**Category:** Feature / Performance
**Effort:** S (2 hours)
**Files:** `controllers/interviewController.js`, FE `recruiter-interview-hub.service.ts`, FE component
**Depends On:** None
**Acceptance Criteria:**
- [ ] `GET /api/interview/hub?limit=50&offset=0` supported
- [ ] DB query uses `LIMIT $2 OFFSET $3` with parameterized inputs
- [ ] Response includes `{ items, total, limit, offset }` where `total` is a real COUNT
- [ ] Defaults: limit=50, max=200, offset=0
- [ ] FE: "Load more" button or page controls
- [ ] Unit test: offset=0,limit=2 on a seeded DB returns correct page
**Source:** CAT-08 / B03 backlog

### GH-ACT-P2-02 — Add resendVerification to sensitiveLimiter
**Priority:** P2
**Category:** Security / Rate Limiting
**Effort:** XS (10 min)
**Files:** `server.js`
**Depends On:** None
**Acceptance Criteria:**
- [ ] `app.use("/api/auth/resendverificationlink", sensitiveLimiter)` added before route mounting
- [ ] `app.use("/api/auth/manualexcelverification", sensitiveLimiter)` added (bulk utility — should be strict)
- [ ] Manual test: 11th call in 1 hour to either endpoint returns 429 with correct message
**Source:** CAT-07

### GH-ACT-P2-03 — Messages: Add LIMIT to listRecruiterThreads
**Priority:** P2
**Category:** Performance / Tech Debt
**Effort:** XS (30 min)
**Files:** `services/message.service.js`
**Depends On:** None (independent of B01 BACKLOG-01)
**Acceptance Criteria:**
- [ ] Query has `LIMIT 100 OFFSET 0` by default (parameterized)
- [ ] `listRecruiterThreads(callerUid, { limit=100, offset=0 })` signature updated
- [ ] Controller passes params from `req.query`
- [ ] Response includes `total` count from a separate COUNT query (or COUNT(*) OVER())
**Source:** CAT-11

### GH-ACT-P2-04 — Enable deleteJob Route
**Priority:** P2
**Category:** Feature / UX
**Effort:** S (2 hours — uncomment route, add BOLA guard, FE soft-delete UI)
**Files:** `routes/jobsRoute.js`, `controllers/jobsController.js`
**Depends On:** Confirm `deleteJob` function exists and is ownership-checked
**Acceptance Criteria:**
- [ ] `router.delete("/jobs/delete", verifyAuth, deleteJob)` uncommented
- [ ] `deleteJob` verifies caller owns the job via JWT-derived companyId
- [ ] Soft-delete preferred (set `is_deleted` or `status = 'deleted'`) not hard-delete
- [ ] FE: "Delete job" action in job list/edit with confirmation dialog
- [ ] Hard-delete of jobs with applications returns 409 with clear error
**Source:** CAT-04

### GH-ACT-P2-05 — Verify X-Content-Type-Options nosniff Header
**Priority:** P2
**Category:** Security
**Effort:** XS (30 min)
**Files:** `server.js` (add helmet or manual header middleware)
**Depends On:** None
**Acceptance Criteria:**
- [ ] `res.setHeader('X-Content-Type-Options', 'nosniff')` applied globally (or via helmet)
- [ ] curl check on any API response shows `x-content-type-options: nosniff`
- [ ] Also verify `X-Frame-Options: DENY` and `X-XSS-Protection: 0` while here
**Source:** CAT-15

### GH-ACT-P2-06 — Fix getListByUser Stubbed Endpoint
**Priority:** P2
**Category:** Feature / Applicant Experience
**Effort:** M (3-4 hours)
**Files:** `controllers/interviewController.js`, `services/interview.service.js`
**Depends On:** Confirm `getInterviewsOfUser` service function and schema tables
**Acceptance Criteria:**
- [ ] `getInterviewsOfUser(uid)` implemented in interview.service.js
- [ ] Returns scheduled/invited interviews for the authenticated applicant
- [ ] `getListByUser` controller calls service, returns real data (not null)
- [ ] Empty array returned (not null) when no interviews exist
- [ ] HTTP 200 with `{ data: [] }` on no-data case
**Source:** CAT-14

### GH-ACT-P2-07 — Clean Up addCompanyUserByEmail Error Handling
**Priority:** P2
**Category:** Tech Debt / Security
**Effort:** XS (1 hour)
**Files:** `controllers/companiesController.js`
**Depends On:** None
**Acceptance Criteria:**
- [ ] All catch blocks in `addCompanyUser` return generic `{ message: "Operation failed." }` not raw error
- [ ] Internal status codes (Firebase error codes, PG error strings) not exposed in response
- [ ] Per-email `msg` field uses only approved strings: "invited", "already_registered", "failed"
- [ ] No change to happy-path response shape
**Source:** CAT-05

### GH-ACT-P2-08 — Interview Hub: Resolve applicationStatusId=3 Hardcode
**Priority:** P2
**Category:** Tech Debt / Maintainability
**Effort:** XS (1 hour)
**Files:** `recruiter-interview-hub.component.ts`, FE shared constants or service
**Depends On:** Confirm status table values
**Acceptance Criteria:**
- [ ] `APPLICATION_STATUS.UNDER_REVIEW = 3` constant defined in shared types file
- [ ] Component imports and uses constant, not magic number
- [ ] If status table is DB-driven, fetch status list and filter by name not id
**Source:** CAT-09

### GH-ACT-P2-09 — Unit Tests: Interview Hub Controller + Component
**Priority:** P2
**Category:** QA
**Effort:** M (4-6 hours)
**Files:** new `tests/interviewController.test.js`, new `recruiter-interview-hub.component.spec.ts`
**Depends On:** None
**Acceptance Criteria:**
- [ ] BE: Jest/Mocha test for `getInterviewHub` — mocks dbQuery, verifies JWT company scoping, verifies LIMIT applied, verifies empty-array case
- [ ] BE: Test for FORBIDDEN case (no company)
- [ ] FE: Angular TestBed spec covers loading state, error state, empty state, filter switching
- [ ] FE: `getFilteredItems()` tested for all 3 filter keys
- [ ] Both test files run in CI (package.json test script updated)
**Source:** CAT-16

---

## P3 — DEFERRED CLEANUP (post-launch or low-priority)

### GH-ACT-P3-01 — deleteCV: Clean Up Firebase Storage on Delete
**Priority:** P3
**Category:** Tech Debt / GDPR
**Effort:** M (3 hours — Firebase Admin Storage delete)
**Files:** `controllers/cvController.js`, `helpers/uploader.js`
**Depends On:** Confirm CV file path is stored in DB column
**Acceptance Criteria:**
- [ ] `deleteCV` reads `file_url` from DB before deletion
- [ ] Calls Firebase Admin `bucket.file(path).delete()` after DB delete
- [ ] On Storage delete failure: log error but do not fail the HTTP response (file already un-linked)
- [ ] Test: deleted CV's storage file is gone after 200 response
**Source:** CAT-03

### GH-ACT-P3-02 — Reduce Email Enumeration Leakage
**Priority:** P3
**Category:** Security
**Effort:** S (2 hours)
**Files:** `controllers/userController.js`
**Depends On:** None (Firebase auth is still enumerable via reset flow — partial fix only)
**Acceptance Criteria:**
- [ ] `loginUser` returns same error string for "no user" and "wrong password" cases
- [ ] Response time is not distinguishably different (add artificial delay if needed)
- [ ] `addCompanyUserByEmail` returns generic "failed" without "already a user" distinction in logs exposed to caller
**Source:** CAT-02

### GH-ACT-P3-03 — Redis Store for Rate Limiter (Multi-Node Readiness)
**Priority:** P3
**Category:** Scalability / Ops
**Effort:** L (1 day — Redis infra + rate-limit-redis package + config)
**Files:** `server.js`, infrastructure
**Depends On:** Decision to horizontally scale (deferred by comment in server.js)
**Acceptance Criteria:**
- [ ] `rate-limit-redis` (or `ioredis` adapter) configured
- [ ] All 4 limiters use shared Redis store
- [ ] Fallback to in-memory if Redis is unreachable (to avoid outage on Redis failure)
- [ ] Load test: 2 nodes share rate-limit counters correctly
**Source:** CAT-06
