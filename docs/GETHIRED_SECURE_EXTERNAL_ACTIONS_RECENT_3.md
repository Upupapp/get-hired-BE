# GetHired — External Actions Required (SECURE 3)
**Date:** 2026-06-26
**These actions cannot be performed by Claude Code — they require SSH access, Firebase Console, or GitHub access**

---

## PRIORITY 1 — Do First (Blocking for secure payment processing)

### EA-1: Confirm PAYMONGO_WEBHOOK_SECRET is set in production

**Why:** The HMAC implementation in `paymentController.js` is correct but fails closed without the secret. If the secret is not set, all PayMongo webhooks are rejected with 400 — payment confirmations via webhook will not process.

**Command:**
```bash
ssh root@139.162.11.242 "grep -c 'PAYMONGO_WEBHOOK_SECRET' /var/www/_work/get-hired-BE/.env"
```
Expected output: `1`

**If not set:** Obtain the webhook signing secret from the PayMongo Dashboard (Settings → Webhooks → your webhook endpoint → Signing Secret), then:
```bash
ssh root@139.162.11.242 "echo 'PAYMONGO_WEBHOOK_SECRET=whsec_xxxxx' >> /var/www/_work/get-hired-BE/.env && pm2 restart gethired"
```
(Replace `whsec_xxxxx` with the actual value from PayMongo Dashboard)

---

## PRIORITY 2 — Do Before Public Launch

### EA-2: Verify .env file permissions on Linode

**Why:** The `.env` file contains `FIREBASE_SERVICE_ACCOUNT_BASE64` (the encoded service account JSON). If world-readable, any OS user can extract the credential.

**Command:**
```bash
ssh root@139.162.11.242 "ls -la /var/www/_work/get-hired-BE/.env"
```
Expected: `-rw------- 1 root root ...` (600 permissions, owned by root or PM2 user)

**If too permissive:**
```bash
ssh root@139.162.11.242 "chmod 600 /var/www/_work/get-hired-BE/.env"
```

### EA-3: Confirm APP_URL is correct in production .env

**Why:** CORS is now `cors({ origin: env.app_url })`. If `APP_URL` is wrong or missing, CORS will break for the real domain.

**Command:**
```bash
ssh root@139.162.11.242 "grep APP_URL /var/www/_work/get-hired-BE/.env"
```
Expected output: `APP_URL=https://gethiredonline.app`

### EA-4: Audit git history for SSH private key commits

**Why:** Package.json references `keys/eucanna-ssh` and `keys/gethired_rsa`. If these were committed to git before `.gitignore` blocked them, they remain extractable from git history.

**Command (run locally):**
```bash
git log --all --full-history -- 'keys/*'
git log --all --full-history -- '*.pem' '*.key' '*.rsa'
git log --all --full-history --name-only | grep -E '\.(pem|key|rsa|ssh)$'
```

**If any commits show key files:** Rotate/revoke those keys, then scrub history with `git-filter-repo`. Coordinate force-push with all contributors.

---

## PRIORITY 3 — Recommended Before Scaling

### EA-5: Run npm audit and assess upgrade path

```bash
cd /var/www/_work/get-hired-BE
npm audit
```

Focus on:
- `jsonwebtoken` — upgrade to 9.x (multiple CVEs in 8.x)
- `axios` — upgrade to 1.x (CSRF/SSRF fixes)
- `request` — migrate away (deprecated; use axios or node-fetch)
- `babel-polyfill` — evaluate removal (EOL)

### EA-6: Verify nginx is in front of Express (for rate-limit IP trust)

**Why:** `app.enable('trust proxy')` trusts one proxy hop for `X-Forwarded-For`. If nginx is not in the request path, attackers can spoof this header to bypass per-IP rate limiting.

**Command:**
```bash
ssh root@139.162.11.242 "nginx -v 2>&1; ps aux | grep nginx"
```

If nginx is not running, rate limiting is based on the actual connection IP, which is still correct but note that the global limiter of 500/15min applies per IP.

### EA-7: Register PayMongo webhook endpoint in PayMongo Dashboard

**Why:** The webhook endpoint `POST /payment/paymongowebhook` will only receive events if it is registered in PayMongo Dashboard. The HMAC signing secret obtained in EA-1 comes from this registration.

**Steps:**
1. Log in to PayMongo Dashboard
2. Go to Settings → Webhooks
3. Register `https://api.gethiredonline.app/api/payment/paymongowebhook`
4. Subscribe to: `payment.paid`, `payment.failed`, `link.payment.paid`
5. Copy the Signing Secret for EA-1

### EA-8: Confirm GOOGLE_INDEXING_API_ENABLED=false in production .env

```bash
ssh root@139.162.11.242 "grep GOOGLE_INDEXING_API_ENABLED /var/www/_work/get-hired-BE/.env"
```
Expected: `GOOGLE_INDEXING_API_ENABLED=false` or the line is absent (service is a no-op when absent).

---

## Tracking Summary

| ID | Priority | Action | Blocking for | Owner |
|---|---|---|---|---|
| EA-1 | P1 | Confirm PAYMONGO_WEBHOOK_SECRET set | Payment processing | Paul |
| EA-2 | P1 | Verify .env permissions (600) | Credential security | Paul |
| EA-3 | P2 | Confirm APP_URL in prod .env | CORS correctness | Paul |
| EA-4 | P2 | Audit git history for SSH keys | Key rotation | Paul |
| EA-5 | P3 | npm audit upgrade sprint | Dependency security | Developer |
| EA-6 | P3 | Verify nginx in request path | Rate limit integrity | Paul |
| EA-7 | P3 | Register webhook in PayMongo Dashboard | Webhook delivery | Paul |
| EA-8 | P3 | Confirm GOOGLE_INDEXING_API_ENABLED=false | SEO indexing control | Paul |
