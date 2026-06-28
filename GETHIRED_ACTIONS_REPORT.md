# GETHIRED ACTIONS REPORT
## QA Cycle 11 — ACTIONS Planning Pass

**Generated:** 2026-06-25
**Cycle:** QA Cycle 11
**Source reports used:** Lightweight code scan (no prior SWEEP/TEST/STITCH reports in root; findings derived from direct source read of QA Cycle 11 deployment scope)
**BE HEAD (last known):** fb8fa43 + QA11 changes
**FE HEAD (last known):** 1f25122 + QA11 changes

---

## Phase 0 — Source Load

No pre-existing SWEEP/TEST/STITCH reports found in BE root. Performed lightweight scan of:
- `server.js` (rate-limit tiers)
- `services/message.service.js` (B01 recruiter threads)
- `controllers/interviewController.js` (B03 hub)
- `routes/interviewRoute.js` (hub route)
- `controllers/paymentController.js` (Paymongo webhook)
- `controllers/cvController.js` (deleteCV orphan)
- `controllers/companiesController.js` (addCompanyUserByEmail raw error)
- `routes/userRoute.js` (email enumeration surface)
- All 15 route files

---

## Phase 1 — Finding Consolidation (16 Categories)

### CAT-01: Security — Webhook Signature Missing
**Finding:** `paymongoWebhook` in `controllers/paymentController.js` (line 60) accepts POST from the internet with no HMAC/signature check. Any actor who knows the endpoint URL can forge payment confirmations and trigger subscription creation.
**Severity:** P1 — directly exploitable for fraudulent subscription grants.

### CAT-02: Security — Email Enumeration (checkUserIfExistInFirebase)
**Finding:** `loginUser` returns distinct error messages based on whether a Firebase user exists (`"User does not exist"` vs password/verify errors). `addCompanyUserByEmail` also calls `checkUserIfExistInFirebase` and leaks existence in its response. `checkUserIfExistInFirebase` referenced in `helpers/firebaseFunctions.js`.
**Severity:** P3 — real risk but no PII beyond email exposure; not a launch stopper by itself.

### CAT-03: Security — deleteCV Orphans Firebase Storage
**Finding:** `deleteCV` (cvController.js:132) deletes the DB row but makes no call to Firebase Storage to remove the associated file. Over time this accumulates orphaned blobs and incurs storage cost. No GDPR-delete guarantee either.
**Severity:** P3 cleanup.

### CAT-04: Security — deleteJob Route Commented Out
**Finding:** `routes/jobsRoute.js:27` has `// router.delete("/jobs/delete", deleteJob)` commented out. The `deleteJob` function is still imported. Employers cannot delete jobs at all — must use `changestatus` workaround.
**Severity:** P2 — UX gap, not a security issue, but blocks recruiter self-service and leaves dead import.

### CAT-05: Security — addCompanyUser Raw Error Leak
**Finding:** `addCompanyUserByEmail` (companiesController.js:525) returns `msg: "Failed to Create credentials"` and similar strings to the FE on partial failure paths. The catch block in `addCompanyUser` propagates the raw error through `errorMessage.error`. Internal error details (Firebase error codes, PG error codes) could leak.
**Severity:** P3 cleanup.

### CAT-06: Rate Limiting — In-Memory Store Scalability Gap
**Finding:** `server.js` lines 45-83: 4-tier rate limiter implemented with `express-rate-limit` default in-memory store. Comment on line 41 explicitly defers Redis store. On a single Linode node this is correct; if/when horizontally scaling, rate-limit counters will not be shared across nodes and can be bypassed by round-robin.
**Severity:** P2 (deferred by design for now) — not a launch blocker for single-node.

### CAT-07: Rate Limiting — Auth Tier Completeness
**Finding:** `authLimiter` (20 req/15 min) covers `/api/auth`. However `/api/auth/manualexcelverification` and `/api/auth/getverificationlink` (userRoute.js:23-24) are bulk/utility endpoints not on the sensitive tier. Also `resendVerification` (`/api/auth/resendverificationlink`) is only covered by the auth limiter (20/15min), not by the sensitive limiter. A determined actor could resend verification to spam users 20 times per 15 minutes.
**Severity:** P2 — not critical but tighten before beta.

### CAT-08: Interview Hub — Pagination Cap (B03)
**Finding:** `getInterviewHub` (interviewController.js:295) has `LIMIT 200` with no offset/cursor pagination. For a large company this silently truncates the feed. No `total_count` from DB is returned (only `total: items.length` which reflects the 200 cap, not the true count).
**Severity:** P2 for beta, P3 for launch.

### CAT-09: Interview Hub — applicationStatusId Hardcode (B03)
**Finding:** `recruiter-interview-hub.component.ts:80` has `i.applicationStatusId === 3` hardcoded for "Under review" filter. If the status table ever changes, this silently breaks.
**Severity:** P3 — low risk in stable schema, annotated.

### CAT-10: Messages — No Read-State (B01 BACKLOG-01)
**Finding:** `listRecruiterThreads` correctly notes no `is_read` column exists. `needsReply` is the only actionability signal. Recruiters cannot mark threads read. Backlog item clearly documented in code.
**Severity:** P2 for beta UX (shows unread count inaccurately), P3 for launch.

### CAT-11: Messages — No Pagination
**Finding:** `listRecruiterThreads` (message.service.js:187) has no LIMIT clause. For a busy recruiter with hundreds of threads this could be a slow query and large payload.
**Severity:** P2 for beta.

### CAT-12: Tech Debt — CORS Wildcard in Production
**Finding:** `server.js:90` `app.use(cors())` with no origin restriction. The whitelist array on lines 26-27 is defined but the commented-out `corsOption` block is never applied. Any origin can call the API.
**Severity:** P2 — should be tightened for production; currently allows open CORS.

### CAT-13: Tech Debt — 50MB JSON Body Limit
**Finding:** `server.js:92` `express.json({ limit: "50mb" })` is very generous. This enables payload-size abuse for most API routes (e.g. sending a 50MB body to `/api/messages/thread/send`). Message body is capped at 4000 chars by service layer but JSON parse happens first.
**Severity:** P2 — reduce to 1MB global, with a separate 50MB limit only on file-upload routes.

### CAT-14: Tech Debt — getListByUser Stubbed
**Finding:** `interviewController.js:224-235` `getListByUser` always returns `null` with HTTP 200. The underlying service function is commented out. This is the applicant-side interview list.
**Severity:** P2 — applicant experience gap; broken as-is.

### CAT-15: Public Portal — No nosniff Header Verified
**Finding:** From prior session: `X-Content-Type-Options: nosniff` header status unverified post-deploy. Related to MIME spoofing fix (helpers/fileSignature.js).
**Severity:** P2.

### CAT-16: QA — No Unit Tests for Hub/Controller
**Finding:** B03 Interview Hub component and `getInterviewHub` controller have no unit tests. `package.json` test script is `echo "Error: no test specified" && exit 1`.
**Severity:** P2 — critical to establish before further feature work.

---

## Phase 18 — Prioritization Summary

### Priority Counts
- **P0 (Launch Blocker):** 1 (CAT-01 webhook signature)
- **P1 (Critical / pre-beta):** 3
- **P2 (Important / pre-beta):** 9
- **P3 (Cleanup / deferred):** 3
- **Total actions:** 33

### Key Questions Answered

**Q1: Is rate-limiting sufficient for public launch?**
The 4-tier implementation is solid for a single-node deployment. Missing gaps: `resendVerification` should be on the sensitive tier, `/manualexcelverification` is rate-unthrottled for bulk ops. Redis store deferred by design — acceptable for single Linode node. **Rating: 75% ready. Two tightenings needed before launch.**

**Q2: Should B03 get pagination before beta?**
Yes. At LIMIT 200 with no `total` from DB the UX silently deceives users about their data. A simple offset parameter and a COUNT query adds minimal complexity. **Recommend: add pagination (offset+limit) before beta.**

**Q3: What priority is B01 BACKLOG-01 (read-state)?**
**P2 for beta.** Recruiters will immediately notice they cannot tell which threads are new after their first session. The schema migration is one column addition with a non-blocking default. Should be done before recruiter-portal beta.

**Q4: Which P3 cleanup items are launch blockers?**
- Email enumeration (CAT-02): **NOT a launch blocker** — enumerable via Firebase auth anyway, common in the industry.
- deleteCV orphan (CAT-03): **NOT a launch blocker** — storage cost but no user-visible bug.
- addCompanyUser raw error (CAT-05): **P3 — not a blocker** — affects invite flow only, not critical path.

**Q5: Next highest-value recruiter-portal improvements after B01/B02/B03?**
1. CORS tightening (B04)
2. Reduce JSON body limit (B05)
3. Implement `/job/delete` route (B06)
4. Messages pagination (B07)
5. Webhook signature verification (P0 — must ship before processing real payments)

---

## Phase 20 — Final Recommendation

**Recommended next command:** TEST — run the full test pyramid against the QA11 deployment to verify rate-limit headers, hub endpoint behavior, and regression on prior security fixes.

**Top risk to watch:** Paymongo webhook has no signature check. If production payments are live or will go live before this is fixed, a forged webhook can grant any account a subscription for free. This is the single P0.

**Do not start yet:** Do not enable real Paymongo payment processing (move `paymongopaymentlink` off test keys) until `paymongoWebhook` has HMAC signature verification wired. The endpoint is currently a free subscription grant to anyone who knows the URL.
