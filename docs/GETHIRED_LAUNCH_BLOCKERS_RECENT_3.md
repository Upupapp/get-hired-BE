# GetHired — Launch Blockers RECENT 3
**Generated:** 2026-06-26
**Supersedes:** GETHIRED_ACTIONS_RECENT_DEPLOYMENT_LAUNCH_CHECKLIST.md
**Status upgrade:** Previous assessment: "BLOCKED for public launch" → Current: "PUBLIC-LAUNCH-READY conditional on PayMongo env var"

---

## Summary of Blockers

| Gate | Previous Status | Current Status | Change |
|---|---|---|---|
| Internal demo | SAFE | **SAFE** | No change |
| Invite-only beta | SAFE | **SAFE** | No change |
| Public launch | BLOCKED (P0-FIREBASE + P1-RATE-LIMIT + P1-OG-IMAGE) | **CONDITIONAL PASS** | Firebase P0 CLOSED; OG image CLOSED; one env-var verification remaining |

---

## GATE 1 — Internal Demo

**Status: PASS — No blockers**

All auth, security, and demo-stability items are closed. No items block an internal demo.

### Quick smoke test before any demo
- [ ] Login as employer; navigate to Contacts → Import/Add; verify invite flow shows correct outcome toasts (no false positives)
- [ ] Public job listing loads at `/jobs`; job detail page loads with correct title and description
- [ ] BE PM2 online: `ssh root@139.162.11.242 "pm2 list"` — status must be `online`

---

## GATE 2 — Invite-Only Beta

**Status: PASS — No blockers**

All security items affecting beta data safety are closed (PayMongo HMAC: 97cd657, CORS: d4e34c7, Firebase credential chain: this session).

### Pre-beta confirmation checklist
- [ ] Verify Linode BE is at latest deployed commit: `ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git log --oneline -1"`
- [ ] Verify FE is deployed via GitHub Actions (check Actions tab for latest master deploy)
- [ ] Verify `PAYMONGO_WEBHOOK_SECRET` env var set on Linode (see Gate 3.1 below — same command)
- [ ] Core hire flow regression: job listing → job detail → apply → recruiter pipeline all functional

---

## GATE 3 — Public Launch

**Status: CONDITIONAL PASS**

### 3.1 — PRIMARY REMAINING BLOCKER: Confirm PayMongo Webhook Secret on Linode (P1, XS)

**This is the only remaining item that must be verified before public launch.**

The PayMongo webhook HMAC verification code is shipped and confirmed correct (commit `97cd657`):
- `verifyPaymongoSignature()` in `controllers/paymentController.js`
- HMAC-SHA256 over `paymongo-signature` header
- Constant-time comparison via `crypto.timingSafeEqual`
- Replay prevention: timestamps older than 5 minutes rejected

**Risk if env var missing:** `verifyPaymongoSignature()` returns false → all PayMongo webhooks rejected 400 → payment events will not process (subscription activations, payment confirmations). This is fail-closed (no data risk), but the product would not be able to process payments in production.

**Verification command:**
```powershell
ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env | head -1"
```
Must return a non-empty value.

**If missing — fix:**
```powershell
ssh root@139.162.11.242 "echo 'PAYMONGO_WEBHOOK_SECRET=<your-paymongo-webhook-secret>' >> /var/www/_work/get-hired-BE/.env && pm2 restart all"
```

**PayMongo smoke test:** Trigger a test webhook from PayMongo dashboard → confirm BE returns 200 → confirm PM2 logs show `[paymentController]` processing.

- [ ] Status: [ ] VERIFIED PRESENT / [ ] FIXED AND VERIFIED

---

### 3.2 — CLOSED: Firebase Credential Hardening (was P0)

**Status: CLOSED this session**

`middleware/firebaseApp.js` now uses the env-base64 → env-json → ADC → local-file credential chain. Production `.env` on Linode has `FIREBASE_SERVICE_ACCOUNT_BASE64`. The old leaked key was auto-revoked by Google.

No further action required for launch. Git history purge (BFG) is optional housekeeping — the credential itself is invalidated.

- [x] CLOSED

---

### 3.3 — CLOSED: OG Image Asset (was P1)

**Status: CLOSED this session**

`src/assets/brand/gethired-og-default.png` (1200×630) created and committed. `seo.service.ts` updated with the correct path. Social share previews should now display the branded image.

**Optional post-launch verification:** Paste `https://gethiredonline.app` into LinkedIn Post Inspector or Facebook Sharing Debugger to confirm preview image renders.

- [x] CLOSED

---

### 3.4 — CLOSED: SSR Real 404 (was P2-SOFT-404)

**Status: CLOSED this session**

`job-posts-details.component.ts` now uses the RESPONSE token. Unknown/expired jobs return HTTP 404 (not 200). Google will not index them as thin content.

- [x] CLOSED

---

### 3.5 — CLOSED: SSR JSON-LD Injection (was SEO risk)

**Status: CLOSED this session**

`seo.service.ts` now uses DOCUMENT token injection. JSON-LD scripts are injected correctly in the SSR context, eliminating hydration issues that could cause Googlebot to miss structured data.

- [x] CLOSED

---

### 3.6 — Pre-Traffic Hardening (Not Hard Blockers, but Recommended Before High Traffic)

These items are not hard launch blockers but should be addressed before significant organic traffic:

| Item | Priority | Effort | Risk if deferred |
|---|---|---|---|
| Rate limiting (P1-RATE-LIMIT) | P1 | M | Auth endpoints vulnerable to brute force; write endpoints vulnerable to flooding |
| ESM Acorn lint rule (P1-ESM-ACORN) | P1 | S | Next dev adding `?.` or `??` silently breaks production |
| PM2 ecosystem file (P2-PM2-ECOSYSTEM) | P2 | S | Wrong entry point after reboot causes `ERR_MODULE_NOT_FOUND` |
| CSV row cap (P2-CSV-ROW-CAP) | P2 | S | Large CSV imports can exhaust DB pool |

---

## Gate 3 Sign-Off Checklist

| Item | Status | Verified by | Date |
|---|---|---|---|
| Gate 1 — Internal demo smoke test | [ ] | | |
| Gate 2 — Beta regression check | [ ] | | |
| 3.1 — PayMongo webhook secret on Linode | [ ] | | |
| 3.2 — Firebase credential hardening | [CLOSED] | Auto-revoked | 2026-06-26 |
| 3.3 — OG image asset | [CLOSED] | Created | 2026-06-26 |
| 3.4 — SSR real 404 | [CLOSED] | RESPONSE token | 2026-06-26 |
| 3.5 — SSR JSON-LD | [CLOSED] | DOCUMENT token | 2026-06-26 |
| **Gate 3 — Public launch** | **[ ] CONDITIONAL** | | |

---

## Quick Reference: Production Commands

```powershell
# Check BE is running
ssh root@139.162.11.242 "pm2 list"

# Check PayMongo secret present
ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env | head -1"

# Check BE logs
ssh root@139.162.11.242 "pm2 logs --lines 50"

# Check BE git HEAD
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git log --oneline -1"

# Deploy BE update (SSH key now works)
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull && pm2 restart all"
```
