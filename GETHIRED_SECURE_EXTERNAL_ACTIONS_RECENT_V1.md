# GETHIRED_SECURE_EXTERNAL_ACTIONS_RECENT_V1.md
Generated: 2026-06-25 (this session) | Actions requiring operator/owner intervention

Claude cannot perform these. They require access to production infrastructure, external service dashboards, or deployment decisions.

---

## EA-1 — DEPLOY: Push getPublishedJobs SQLi fix to production
**Priority:** P0 — DO THIS FIRST  
**Owner:** Developer (deploy access)

**What was fixed:** `services/job.service.js` — `getPublishedJobs()` now uses parameterised queries instead of string interpolation. Changed in this session; not yet committed or deployed.

**Steps:**
1. Review the diff in `services/job.service.js`
2. Commit: `fix(security/P0): parameterise getPublishedJobs to close SQLi on public job endpoint`
3. Push to GitHub
4. Deploy to Linode: `git pull && pm2 restart all`
5. Smoke test: `GET /api/job/published` returns all published jobs; `GET /api/job/published?id=JB123456` returns that company's jobs; `GET /api/job/published?id=x' OR '1'='1'--` returns empty array

**Why urgent:** The endpoint is unauthenticated and publicly reachable. Before this fix, any caller could dump the entire jobs table via SQL injection.

---

## EA-2 — ENV: Set PAYMONGO_WEBHOOK_SECRET in production .env
**Priority:** P1  
**Owner:** Operator (server access + PayMongo dashboard access)

**Problem:** `paymentController.js` `verifyPaymongoSignature()` reads `env.paymongo_webhook_secret`. If this env var is not set, the function returns `false` immediately and ALL webhook events are rejected with HTTP 400. Payment flows (subscription activation via `createCompanySubscription`) will not complete until this is set.

**Steps:**
1. Log in to PayMongo dashboard → Developers → Webhooks
2. Find your registered webhook for `gethiredonline.app/api/payment/paymongowebhook`
3. Copy the webhook signing secret
4. SSH to Linode production server
5. Add to `.env`: `PAYMONGO_WEBHOOK_SECRET=whsec_...`
6. Restart BE: `pm2 restart all`
7. Send a test event from PayMongo dashboard and confirm HTTP 200 response

**Why urgent:** Until this is set, PayMongo webhooks are rejected — subscription payments succeed at PayMongo but are not processed in the database.

---

## EA-3 — ENV: Set PAYMONGO_WEBHOOK_SECRET_DEV in staging .env (if staging is used)
**Priority:** P2  
**Owner:** Operator (staging server access + PayMongo test dashboard)

**Problem:** Staging `env.js` branch now maps `paymongo_webhook_secret: process.env.PAYMONGO_WEBHOOK_SECRET_DEV`. If this var is absent in staging `.env`, webhooks are rejected in staging (fail-closed, safe), but webhook testing is impossible.

**Steps:**
1. Get a test webhook secret from PayMongo (test mode dashboard → Webhooks)
2. Add to staging `.env`: `PAYMONGO_WEBHOOK_SECRET_DEV=whsec_test_...`
3. Restart staging BE

---

## EA-4 — KEY ROTATION: Firebase service account keys
**Priority:** P0 (pre-existing, standing action from prior sessions)  
**Owner:** Firebase project admin

**Problem:** `gethired-serviceAccountKey.json` and `jobhunt-serviceAccountKey.json` exist in the repo and likely in git history. These keys give admin access to the Firebase project.

**Steps:**
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key (this invalidates the old one)
3. Replace key file on Linode server (do NOT commit to git)
4. Repeat for `jobhunt-serviceAccountKey.json`
5. Verify BE still functions (Firebase Admin SDK will use the new key)
6. Add both file patterns to `.gitignore`: `*serviceAccountKey*.json`
7. Optionally clean git history (coordinate with team — requires force-push)

---

## EA-5 — BACKLOG: Remove dead ?companyId= param from checkCompanySubscription FE calls
**Priority:** P2  
**Owner:** Developer

**Files:**
- `get-hired-FE/src/app/job/job.service.ts` line 24: `?companyId=${companyId}`
- `get-hired-FE/src/app/company/company.service.ts` line 20: same pattern

**Change needed:** Remove the query param; the BE ignores it (JWT only). Same cleanup as was done to `getJobBasicList` / `getJobExpiredList` in EA-1 commits.

---

## EA-6 — BACKLOG: Fix payment.failed PII logging
**Priority:** P3  
**Owner:** Developer

**File:** `paymentController.js` line 216

**Change:**
```js
// Before:
console.log("Payment Failed");
console.log(data);

// After:
console.log('[paymentController] payment.failed id:', data && data.id);
```

---

## EA-7 — BACKLOG: Migrate interviewController to pure JWT-derivation pattern
**Priority:** P3  
**Owner:** Developer

**Functions to migrate:** `getAllInterviewsOfCompanies`, `getAllInterviewsTemplatesOfCompanies`, `getAllInterviewRecipientsByCompanyId`

**Change pattern:** Replace `callerBelongsToCompany(uid, req.query.companyId)` with pure `getUserCompany(uid)` derivation — eliminates the FE-controlled companyId scope and reduces to one DB call instead of two.

**Caution:** The FE callers send `?companyId=` and the action payloads carry `companyId`. Migrating the BE means the FE's `companyId` is silently ignored — verify no FE component depends on being able to query a *different* companyId than their own (they shouldn't, but check).

---

## EA-8 — STANDING: Re-enable InternalEmployerGuard
**Priority:** P3  
**Owner:** Developer

**File:** `get-hired-FE/src/app/employer-panel/employer-panel.module.ts`

Uncomment `canActivate: [InternalEmployerGuard]` on dashboard and jobs child routes. Test employer happy path end-to-end before deploying.
