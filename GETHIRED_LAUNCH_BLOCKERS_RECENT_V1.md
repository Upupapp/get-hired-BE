# GetHired Launch Blockers — Post-Deployment (V1 UPDATED)
**Scope:** Recent deployment findings + full known backlog combined
**Date:** 2026-06-25

---

## Deployment Status

The following P0 items from the prior launch-blocker list have been RESOLVED by the recent deployment:

| Item | Resolution |
|------|------------|
| P0-SEC-02: PayMongo webhook unsigned | FIXED — HMAC-SHA256 + replay prevention implemented (`paymentController.js`) |
| P1-SEC-03: CORS wildcard | FIXED — Restricted to `env.app_url` (`server.js:89`) |
| P2-deleteJob route commented out | FIXED — Route registered with `verifyAuth`, BOLA closed |
| P2-01: basiclist/expiredlist BOLA | FIXED — companyId from JWT in both endpoints |
| F-08: child-table BOLA (question update) | FIXED — company_id subquery in `updateQuestionById` |
| Nginx security headers | FIXED — nosniff, X-Frame-Options, X-XSS-Protection added |
| Rate limiting | FIXED — 4-tier express-rate-limit middleware |

---

## Gate 1: Before ANY Production Traffic Is Trusted

**Status: BLOCKED on P0-01**

| ID | Item | Why it's a gate | Effort |
|----|------|----------------|--------|
| P0-01 | Firebase service account key rotation + git history purge | Valid credentials allow full Firebase compromise. `middleware/firebaseApp.js:5` still loads from a JSON file by name, and no BFG/filter-repo run is confirmed in the recent commits. | S |

Until P0-01 is fully resolved (old key revoked, history purged, production loading from env var), this is the only item that must be in place before any additional users touch the system.

---

## Gate 2: Before Beta Launch (Real Users, Invite-Only)

**Status: BLOCKED on P0-01, P1-01, DEC-01, DEC-02**

| ID | Item | Why it's a beta gate | Effort |
|----|------|---------------------|--------|
| P0-01 | Firebase key rotation (carry-over from Gate 1) | Same as Gate 1 | S |
| P1-01 | Verify `PAYMONGO_WEBHOOK_SECRET` on Linode | HMAC code is correct but silently rejects all webhooks if the env var is missing — subscriptions never activate | XS |
| P1-02 | Email enumeration via login errors | Enables email list harvesting before user base grows | XS |
| DEC-01 | Canonical API URL decision (App Engine vs Linode) | FE may be hitting a different backend than Linode — data inconsistency risk | S (rebuild) |
| DEC-02 | CORS allowlist finalization (www + dev origin) | www variant may CORS-block real users | XS |

**Beta can proceed with the following in "known gap" state:**
- P2-02 (deleteJob cascade guard) — inform beta employers not to delete jobs with applicants until the guard is in place
- P2-03 (module-level now) — timestamps slightly wrong but not data-loss
- P2-04 (PII logs) — logged internally, not user-facing
- P3-01 through P3-07 — polish/debt, not launch-blocking

---

## Gate 3: Before First Paid Subscription

**Status: BLOCKED on P0-01, P1-01, P3-06 (subscription tables)**

| ID | Item | Why it's a payment gate | Effort |
|----|------|------------------------|--------|
| P0-01 | Firebase key rotation (carry-over) | Same | S |
| P1-01 | PAYMONGO_WEBHOOK_SECRET on Linode | Without it, payments succeed on PayMongo side but subscriptions never activate in the DB | XS |
| P3-06 | Subscription tables in production DB | Webhook fires, `createCompanySubscription()` runs, INSERT fails — company never gets subscription record | S (DDL apply) |
| DEC-05 | Subscription table deployment decision | Confirm timing of DDL apply | XS |

**Also strongly recommended before any payment link is shared:**
- P3-01 (webhook rate-limit exemption) — prevents 429 throttling of PayMongo during burst
- P2-03 (fix module-level now) — payment_date and created_at will be wrong for every subscription created after server start

---

## Gate 4: Before Hard-Delete Is Used By Employers With Applicants

**Status: BLOCKED on P2-02**

| ID | Item | Why it's a gate | Effort |
|----|------|----------------|--------|
| P2-02 | deleteJob cascade guard or soft-delete | Hard-deleting a job with applicants silently destroys ALL application history, interview answers, and messages. No warning exists in the FE. Route was just enabled. | S–M |

This gate applies as soon as any beta employer has posted a job that received applicants and might want to delete it.

---

## Outstanding Item Status (All P0 and P1)

| ID | Item | Prior Status | Current Status |
|----|------|-------------|---------------|
| P0-01 | Firebase key rotation + history purge | P0 OPEN | P0 OPEN — not confirmed resolved |
| P0-SEC-02 | PayMongo webhook HMAC | P0 OPEN | **RESOLVED** (deployed) |
| P1-01 | PAYMONGO_WEBHOOK_SECRET on Linode | NEW | P1 OPEN |
| P1-02 | Email enumeration in login | P1 OPEN | P1 OPEN (unchanged) |
| P1-SEC-03 | CORS wildcard | P1 OPEN | **RESOLVED** (deployed, now P2-01 to refine) |
| P1-ENV-01 | Canonical API URL decision | P1 OPEN | P1 OPEN (unchanged) |

---

## Quick-Win List (Items < 1 Hour Each)

If time is limited before the next session, these are highest-impact for their size:

1. **P1-01** — SSH into Linode, add `PAYMONGO_WEBHOOK_SECRET=...` to `.env`, restart server. (30 min)
2. **P1-02** — Change login error messages to generic "Invalid email or password." (15 min)
3. **P2-01** — Change CORS single string to allowlist array. (15 min)
4. **P2-04** — Remove 4 `console.log` calls in `userController.js`. (15 min)
5. **P2-08** — Change `max: 1` to `max: 10` in `db/dbQuery.js`. (5 min)
6. **P3-01** — Add webhook skip condition to `writeLimiter`. (10 min)
7. **P3-02** — `npm install helmet; app.use(helmet())`. (30 min)
8. **P2-11** — Remove `bcrypt` from `package.json`, fix imports to `bcryptjs`. (30 min)
9. **P3-05** — Fix IH filter chip contrast color. (15 min)

---

*Updated 2026-06-25. No code changes made.*
