# GetHired — Security Test Plan (SECURE 3)
**Date:** 2026-06-26
**Purpose:** Manual verification test cases for all new/changed security items

---

## T1 — Firebase Credential Chain

### T1.1: Base64 credential loads correctly
**Method:** Check PM2 logs on Linode for initialization message
```bash
ssh root@139.162.11.242 "pm2 logs gethired --lines 20 | grep 'Firebase Admin'"
```
**Expected:** `Firebase Admin: initializing via env-base64`

### T1.2: Invalid token rejected
**Method:** `curl -H "Authorization: Bearer invalidtoken" https://api.gethiredonline.app/api/auth/getprofile`
**Expected:** HTTP 403

### T1.3: Valid token accepted
**Method:** Get a valid Firebase ID token from FE, send to `/api/auth/getprofile`
**Expected:** HTTP 200 with profile data

### T1.4: File-path credential blocked in production
**Method:** Verify in code that `isProduction` check is present at line 84 of `firebaseApp.js`
**Expected:** Throw if `FIREBASE_SERVICE_ACCOUNT_PATH` is set in production

---

## T2 — verifyRoles.js uid Security

### T2.1: No uid → 401
**Method:** Send request to admin route without auth header
**Expected:** HTTP 401 "Authentication required"

### T2.2: Valid token, wrong role → 401
**Method:** Send employer token to admin route
**Expected:** HTTP 401 "User not allowed to access this API"

### T2.3: Valid admin token → 200
**Method:** Send admin token to `/api/admin/userprofile`
**Expected:** HTTP 200

---

## T3 — optionalVerifyAuth

### T3.1: No auth → public response
**Method:** `curl https://api.gethiredonline.app/api/job/details?id=<jobId>`
**Expected:** HTTP 200 with job data, `isApplied: false`

### T3.2: Valid token → personalized response
**Method:** `curl -H "Authorization: Bearer <validToken>" https://api.gethiredonline.app/api/job/details?id=<jobId>`
**Expected:** HTTP 200 with job data; `isApplied` reflects actual application status

### T3.3: Invalid token → 401
**Method:** `curl -H "Authorization: Bearer expiredOrBadToken" https://api.gethiredonline.app/api/job/details?id=<jobId>`
**Expected:** HTTP 401 (not 200 with anonymous response)

### T3.4: BOLA probe — uid param differs from token
**Method:** `curl -H "Authorization: Bearer <validToken>" "https://api.gethiredonline.app/api/job/details?id=<jobId>&uid=differentUID"`
**Expected:** HTTP 403

---

## T4 — PayMongo Webhook HMAC

### T4.1: Request without signature header → 400
**Method:** `curl -X POST https://api.gethiredonline.app/api/payment/paymongowebhook -H "Content-Type: application/json" -d '{"data":{}}'`
**Expected:** HTTP 400 "Invalid webhook signature"

### T4.2: Request with wrong signature → 400
**Method:** Same as T4.1 but with `paymongo-signature: t=12345,li=wrongsig`
**Expected:** HTTP 400

### T4.3: Replayed request (timestamp > 5min old) → 400
**Method:** Send valid HMAC but with timestamp = `now - 400 seconds`
**Expected:** HTTP 400

### T4.4: Valid HMAC signature → 200 (requires secret in prod)
**Method:** Use PayMongo test webhook sender with correct signing secret
**Expected:** HTTP 200

---

## T5 — CORS

### T5.1: Request from allowed origin
**Method:** `curl -H "Origin: https://gethiredonline.app" https://api.gethiredonline.app/api/job/published`
**Expected:** Response includes `Access-Control-Allow-Origin: https://gethiredonline.app`

### T5.2: Request from disallowed origin
**Method:** `curl -H "Origin: https://malicious-site.com" https://api.gethiredonline.app/api/job/published`
**Expected:** No `Access-Control-Allow-Origin` header (or CORS error in browser)

---

## T6 — SQL Injection (Manual)

### T6.1: groupName injection in contact service
**Method:** POST `/api/contacts/addcontact` with `groupName: "' OR '1'='1"`
**Expected:** Should fail with DB error or empty result (not return all groups)
**Note:** Requires auth token; this is a P2 finding — test to confirm exploitability

---

## T7 — Rate Limiting

### T7.1: Auth endpoint rate limit
**Method:** Send 25 POST requests to `/api/auth/signin` within 15 minutes
**Expected:** First 20 succeed (or fail for wrong creds), 21st+ returns HTTP 429

### T7.2: Sensitive endpoint rate limit
**Method:** Send 12 GET requests to `/api/auth/getpwresetlink` within 1 hour
**Expected:** First 10 succeed, 11th+ returns HTTP 429

### T7.3: Webhook not rate-limited
**Method:** Send 150 POST requests to `/api/payment/paymongowebhook` within 15 minutes
**Expected:** All get 400 (bad signature), none get 429 (rate limit)

---

## T8 — Security Headers

### T8.1: All required headers present
**Method:** `curl -I https://api.gethiredonline.app/api/job/published`
**Expected headers:**
- `X-Content-Type-Options: nosniff` ✓
- `X-Frame-Options: DENY` ✓
- `X-XSS-Protection: 0` ✓

**Missing but recommended:**
- `Strict-Transport-Security` — add if HTTPS confirmed
- `Content-Security-Policy` — add to FE

---

## T9 — File Upload Magic Byte Check

### T9.1: PDF masquerading as JPEG rejected
**Method:** POST to `/api/applicant/docs` with `file: "data:image/jpeg;base64,<PDF bytes>"`
**Expected:** HTTP 400 or upload rejected with FILE_CONTENT_MISMATCH

### T9.2: Valid PDF accepted
**Method:** POST with actual PDF bytes declared as application/pdf
**Expected:** Upload succeeds

---

## Test Execution Priority

| Test group | Priority | Blocking for release? |
|---|---|---|
| T1 — Firebase chain | HIGH | Yes |
| T3 — optionalVerifyAuth | HIGH | Yes |
| T4 — PayMongo HMAC | HIGH | Yes (payment processing) |
| T2 — verifyRoles | MEDIUM | Yes |
| T5 — CORS | MEDIUM | Yes |
| T7 — Rate limiting | MEDIUM | No |
| T8 — Security headers | LOW | No |
| T6 — SQL injection | MEDIUM | No (auth-gated; document) |
| T9 — File upload | LOW | No |
