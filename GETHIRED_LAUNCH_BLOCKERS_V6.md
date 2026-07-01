# GETHIRED LAUNCH BLOCKERS — V6
**Date:** 2026-07-01 | **Verdict: BLOCKED FOR PUBLIC LAUNCH**
Safe for: Internal demo, invite-only beta

---

## Active Blockers

### BLOCKER-01 — P0-FIREBASE: Firebase Service Account Key in Git History
**ID:** ACT-013 / P0-FIREBASE
**Priority:** P0
**Type:** Security — user action (cannot be fixed in code)
**Risk:** `jobhunt-serviceAccountKey.json` is present in get-hired-BE git history. Anyone with read access to the repo has valid Firebase Admin SDK credentials, enabling them to impersonate any user, issue custom tokens, and access all Firebase data.
**Owner:** Paul
**Effort:** ~4 hours (multi-step coordination)
**Steps:**
1. Firebase Console → Project Settings → Service Accounts → Revoke existing key
2. Generate new service account key → save as `jobhunt-serviceAccountKey.json` (already in .gitignore)
3. SCP new key to Linode: `scp jobhunt-serviceAccountKey.json root@139.162.11.242:/var/www/_work/get-hired-BE/`
4. Purge from history: `git filter-repo --path jobhunt-serviceAccountKey.json --invert-paths`
5. Force-push: `git push origin main --force` (coordinate with all collaborators)
6. `ssh root@139.162.11.242 "pm2 restart all"`
7. Verify new key works: test a sign-in flow on production
**Blocking:** All public launch / any public announcement

---

### BLOCKER-02 — GH-ACT-091: PayMongo Webhook Signing Secret Not Confirmed on Linode
**ID:** GH-ACT-091 / P1-PAYMONGO-ENV
**Priority:** P0 (elevated from P1 because payment processing is live)
**Type:** Ops — environment variable verification
**Risk:** PayMongo HMAC verification code is shipped (commit 97cd657). If `PAYMONGO_WEBHOOK_SECRET` is absent from the Linode `.env` / PM2 environment, `verifyPaymongoSignature()` returns false and ALL payment webhooks are rejected with HTTP 400 (fail-closed — no payment bypass risk, but subscription events will not be processed, subscriptions will not activate).
**Owner:** Paul
**Effort:** 5 minutes to verify; 10 minutes to fix if missing
**Steps:**
1. `ssh root@139.162.11.242 "pm2 env 0 | grep PAYMONGO"` — must show non-empty value
2. If missing: Go to PayMongo dashboard → Developers → Webhooks → copy signing secret
3. Add to `/root/get-hired-BE/.env`: `PAYMONGO_WEBHOOK_SECRET=whsk_your_key_here`
4. `ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && pm2 restart all"`
5. Send a test PayMongo webhook event → confirm 200 response
**Blocking:** Any paid subscription processing

---

### BLOCKER-03 — P1-OG-IMAGE: Missing OG Social Share Image
**ID:** P1-OG-IMAGE
**Priority:** P1
**Type:** Asset — design action
**Risk:** `SeoService.DEFAULT_OG_IMAGE` and `src/index.html` reference `/assets/brand/gethired-og-default.png` but the file does not exist. All social shares (LinkedIn, Facebook, WhatsApp, Twitter/X) show the generic logo instead of a branded preview card.
**Owner:** Paul / Design
**Effort:** 1-2 hours (asset creation only; code is already wired)
**Spec:** 1200×630px PNG, branded, no private data, GetHired logo + tagline, looks good at 160px thumbnail (LinkedIn preview size). Place at `get-hired-FE/src/assets/brand/gethired-og-default.png`. Update `DEFAULT_OG_IMAGE` constant in `src/app/core/services/seo.service.ts` if path differs.
**Blocking:** Social media sharing quality; not a functional blocker

---

### BLOCKER-04 — P1-RATE-LIMIT: No Tiered Rate Limiting on Write Endpoints
**ID:** P1-RATE-LIMIT
**Priority:** P1
**Type:** Security — code fix (developer)
**Risk:** Auth, contact, candidate, job-apply, and payment endpoints have no per-IP or per-user rate limit beyond the existing global limiter. Brute-force and flooding attacks are possible. Confirmed present: global 500/15min limiter (4-tier is documented as present in server.js per V5 SECURE audit). However, auth-specific throttling (10/15min) and write-specific throttling (100/15min) need verification.
**Owner:** BE developer
**Effort:** 2-4 hours
**Files:** `server.js` or `middleware/rateLimiter.js`, route files
**Steps:** See EXEC-PACK-1 in docs/GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md for implementation details
**Blocking:** Pre-public hardening

---

## Items Cleared Since V5 (No Longer Blocking)

| Item | Cleared | How |
|---|---|---|
| Google OAuth new web client | CLEARED | Session 2026-07-01 |
| requestUri fix deployed | CLEARED | BE=98b4bfb |
| CORS wildcard | CLEARED | Commit d4e34c7 |
| PayMongo HMAC code | CLEARED | Commit 97cd657 |

---

## Launch Readiness Matrix V6

| Category | Gate | Status |
|---|---|---|
| Authentication | Google OAuth | PASS |
| Authentication | LinkedIn OIDC | PASS |
| Authentication | Sign-out | PASS |
| Security | BOLA / JWT scoping | PASS |
| Security | Firebase key | FAIL — BLOCKER-01 |
| Security | PayMongo env var | FAIL — BLOCKER-02 |
| Security | CORS | PASS |
| Security | Rate limiting | CONDITIONAL PASS (global exists; auth-tier needs verify) |
| Product | Job posting | PASS |
| Product | Cert/license requirements | PASS |
| Product | Company setup modal | PASS |
| Product | Employer sign-out | PASS |
| SEO | sitemap.xml | PASS |
| SEO | robots.txt | PASS |
| SEO | JSON-LD job detail | OPEN (ACT-005 not yet done) |
| SEO | OG image | FAIL — BLOCKER-03 |
| Mobile | Public pages | PASS |
| Mobile | Auth dialogs | PASS |
| Ops | GitHub PAT | OPEN — P1-PAT (not a launch blocker, but affects deploy workflow) |

**Public launch requires:** BLOCKER-01 + BLOCKER-02 closed. BLOCKER-03 and rate-limit verification strongly recommended.
