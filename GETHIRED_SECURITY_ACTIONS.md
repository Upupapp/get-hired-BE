# GETHIRED SECURITY ACTIONS
## QA Cycle 11

**Generated:** 2026-06-25

---

## Security Action Summary

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| SEC-01 | Paymongo webhook HMAC | P0 | OPEN |
| SEC-02 | CORS wildcard | P1 | OPEN |
| SEC-03 | 50MB JSON body limit | P1 | OPEN |
| SEC-04 | resendVerification rate limit | P2 | OPEN |
| SEC-05 | nosniff header | P2 | OPEN |
| SEC-06 | Email enumeration reduction | P3 | OPEN |
| SEC-07 | deleteCV storage cleanup (privacy) | P3 | OPEN |
| SEC-08 | addCompanyUser raw error leak | P2 | OPEN |
| SEC-09 | Redis rate-limit store | P3 | DEFERRED |

---

## Closed Security Items (prior cycles — verified)

| ID | Title | Fixed In |
|----|-------|---------|
| CSEC-01 | Unauthenticated routes (11 routes) | QA9/10 |
| CSEC-02 | BOLA on company/interview/cv/job writes | QA7-10 |
| CSEC-03 | Admin role self-grant via signup | QA9 |
| CSEC-04 | Hardcoded invite password | QA9 (STITCH) |
| CSEC-05 | MIME spoofing on file uploads | QA10 |
| CSEC-06 | payment/paymentintent unauthenticated | QA9 |
| CSEC-07 | BOLA on template questions | QA9 FIX-5 |
| CSEC-08 | SQL injection in cv/interview queries | STITCH |
| CSEC-09 | Subscription payment trusted client email | QA9 |

---

## Open Security Actions (Detail)

### SEC-01 — Paymongo Webhook HMAC Signature (P0)
See GH-ACT-P0-01 in GETHIRED_PRIORITIZED_BACKLOG.md.
**Implementation note:**
```javascript
// In paymongoWebhook, before any processing:
const signature = req.headers['paymongo-signature'];
const rawBody = req.rawBody; // requires bodyParser.raw() on this route only
const expectedSig = crypto
  .createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');
if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
  return res.status(401).end();
}
```
Note: requires `express.raw()` middleware on the webhook route specifically, BEFORE `express.json()`, to capture the raw body for HMAC verification.

### SEC-02 — CORS Wildcard (P1)
**Current code:** `server.js:90` `app.use(cors())` — allows any origin.
**Fix:** Uncomment the `corsOption` object (lines 28-36) and apply it.
**Required env var:** `ALLOWED_ORIGINS=https://gethired.ph,http://localhost:4200`
**Implementation:**
```javascript
const corsOption = {
  origin: function (origin, callback) {
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',');
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  }
};
app.use(corsOption);
```

### SEC-03 — 50MB JSON Body Limit (P1)
**Current:** `express.json({ limit: "50mb" })` applies to all routes.
**Risk:** Any authenticated user can send a 50MB POST body to message/send, triggering a full parse before the 4000-char body guard in `sendMessage`.
**Fix:** Drop to 1MB globally. File-upload routes use `multer` (confirmed), so they bypass the JSON body parser anyway.
```javascript
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
```

### SEC-04 — resendVerification Not on Sensitive Tier (P2)
**Current:** `/api/auth/resendverificationlink` is covered only by `authLimiter` (20/15min).
**Risk:** 20 verification emails to a victim per 15 minutes = 1.9/minute email spam.
**Fix:** Add `app.use("/api/auth/resendverificationlink", sensitiveLimiter)` in `server.js`.
Also: `/api/auth/manualexcelverification` — bulk import utility — should be on sensitiveLimiter or admin-gated.

### SEC-05 — X-Content-Type-Options nosniff Header (P2)
**Verification step:** `curl -I https://api.gethired.ph/api/job/published | grep -i content-type-options`
**Fix options:**
- Option A (recommended): Install `helmet` and call `app.use(helmet())` — covers nosniff + 8 other headers.
- Option B: Manual: `app.use((_, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); })`

### SEC-06 — Email Enumeration (P3)
**Current:** `loginUser` returns `"User does not exist"` on missing account.
**Partial fix:** Return `"Invalid email or password"` for both missing-account and wrong-password cases.
**Limitation:** Firebase auth password reset flow is still enumerable (standard Firebase behavior). Full resolution requires custom auth flow outside Firebase SDK — not worth the effort at this stage.

### SEC-07 — deleteCV Firebase Storage Orphan (P3 / Privacy)
GDPR-relevant: deleting a user CV should purge the file. See AE-03.

### SEC-08 — addCompanyUserByEmail Raw Error Leak (P2)
**Current:** Failure paths return internal strings (`"Failed to Create credentials"`, Firebase error codes potentially).
**Fix:** Normalize all failure returns to `{ status: "failed", msg: "Invitation could not be sent." }`.
Remove any Firebase SDK error code from API response body. Log internally only.

### SEC-09 — Redis Rate-Limit Store (P3 / Deferred)
In-memory store is correct for single-node Linode. Defer until horizontal scaling decision is made. Note is already in `server.js` comment — document as accepted risk.
