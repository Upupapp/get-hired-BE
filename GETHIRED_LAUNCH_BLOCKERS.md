# GETHIRED LAUNCH BLOCKERS
## QA Cycle 11

**Generated:** 2026-06-25

---

## Definition
A launch blocker is any issue where shipping to real paying users or real money processing creates a critical security, data-integrity, or legal risk that cannot be deferred.

---

## ACTIVE LAUNCH BLOCKERS

### LB-01 — Paymongo Webhook Has No Signature Verification
**ID:** GH-ACT-P0-01
**File:** `controllers/paymentController.js` line 60
**Risk:** Anyone who knows the URL `POST /api/payment/paymongowebhook` can POST a forged `link.payment.paid` event. The handler will:
1. Insert a row into `transaction_table`
2. Update `cart_table` to `paid`
3. Call `createCompanySubscription(companyId, subscriptionId)` — granting a free subscription
**Exploit difficulty:** Low — endpoint is public (no auth), URL is discoverable from JS bundle, payload schema is in Paymongo public docs.
**Fix:** Add HMAC-SHA256 signature check using `Paymongo-Signature` header before processing any event. See GH-ACT-P0-01 acceptance criteria.
**Blocks:** Live Paymongo payment processing
**Owner:** BE developer
**Estimated effort:** M (3-4 hours + dashboard secret)

---

## RESOLVED BLOCKERS (fixed in prior QA cycles, verified closed)

### RLB-01 — Unauthenticated routes (STITCH/security fix)
Routes previously missing `verifyAuth`: `/interview/getallrecipients`, `/interview/gettemplatequestions`, entire `cvRoutes.js`, `application/create`, `application/updateJobs`, `application/delete`, `subscription/paymentintent`, `company/update`, `company/removecompanyuser`, `job/applicants`.
**Status:** CLOSED — all routes have `verifyAuth` as of QA9/10 cycles.

### RLB-02 — BOLA on company write operations
`addCompanyUser`, `updateCompany`, `saveQuestionTemplate`, `updateJobInterviewQuestion` trusted client-supplied companyId.
**Status:** CLOSED — all derive companyId from JWT via `getUserCompany()`.

### RLB-03 — Admin role self-grant via signup
`/api/auth/signup` accepted role=1 from request body.
**Status:** CLOSED — `ALLOWED_ROLES = [2, 3]` guard added to `registerUser`.

### RLB-04 — Hardcoded invite password
`addCompanyUserByEmail` used literal `p@ssw0rd1111` for every invited user.
**Status:** CLOSED — `crypto.randomBytes(24).toString("base64")` per invite.

### RLB-05 — MIME spoofing on file uploads
File upload accepted MIME type from `Content-Type` header only.
**Status:** CLOSED — `helpers/fileSignature.js` adds magic-byte verification.

---

## NEAR-BLOCKER ITEMS (not blocking launch but must complete before beta)

| ID | Title | Why Near-Blocker |
|----|-------|-----------------|
| GH-ACT-P1-02 | CORS wildcard | Any origin can call the API — trivial CSRF surface |
| GH-ACT-P1-03 | 50MB body limit | DoS via large payloads to any endpoint |
| GH-ACT-P1-01 | Read-state migration | Recruiters cannot tell new messages from old — beta frustration |
