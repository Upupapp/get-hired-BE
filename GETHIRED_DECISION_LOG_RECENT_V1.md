# GetHired Decision Log — Post-Deployment (V1 UPDATED)
**Scope:** Recent deployment findings + full known backlog combined
**Date:** 2026-06-25

Each entry states: the decision that must be made, why it's pending, the options, the constraints, and what the decision unblocks. Sorted by urgency.

---

## DEC-01 · Canonical API URL: App Engine vs api.gethiredonline.app

**Status:** PENDING — blocks P1-ENV-01

**Context:**
After domain migration, the Linode server runs nginx proxying `api.gethiredonline.app` to `localhost:3000`. However, `environment.prod.ts:6` still points the FE to the App Engine URL (`api-dot-get-hired-363107.et.r.appspot.com/api`). The FE does not use the Linode proxy. This means FE may hit a different backend instance than the Linode-served one.

**Options:**

| Option | Pros | Cons |
|--------|------|------|
| A — Linode canonical | Single source of truth. No GCP cost. All traffic on Linode. | Requires FE rebuild + redeploy. Must verify all env vars on Linode. |
| B — App Engine canonical | No FE rebuild needed. | Ongoing GCP cost. Linode proxy misleading/unused. |
| C — Parallel transition | Lower risk during migration. | Complex, data inconsistency risk if both instances write to same DB. |

**Recommended:** Option A (Linode canonical). Rebuild FE prod bundle pointing to `https://api.gethiredonline.app/api`. Suspend (not delete) App Engine after 2+ weeks of stable Linode operation.

**What this unblocks:** P1-ENV-01 (api_url change), P1-ENV-03 (PayMongo key on Linode), all BE smoke tests.
**Who decides:** Project owner
**Deadline:** Before beta launch

---

## DEC-02 · CORS Allowed Origins — Allowlist Definition

**Status:** PENDING — blocks P2-01

**Context:**
CORS was changed from wildcard to `env.app_url` (single string) in the recent deployment. The exact set of allowed origins must be decided for production.

**Required origins:**
- `https://gethiredonline.app` — confirmed production FE (must include)
- `https://www.gethiredonline.app` — www variant (should include)
- `http://localhost:4200` — Angular dev server (dev/staging only, never production)

**Not CORS concerns (do not include):**
- PayMongo webhook — server-to-server call, not browser
- Firebase Auth SDK calls — go directly to Firebase, not through BE

**Recommended implementation:**
```js
const corsOrigins = process.env.NODE_ENV === 'production'
  ? ['https://gethiredonline.app', 'https://www.gethiredonline.app']
  : ['https://gethiredonline.app', 'https://www.gethiredonline.app', 'http://localhost:4200'];
app.use(cors({ origin: corsOrigins }));
```

**Who decides:** Project owner (confirm if www variant is used)
**Deadline:** Before beta launch

---

## DEC-03 · deleteJob: Soft-Delete vs Hard-Delete with Guard

**Status:** PENDING — blocks P2-02

**Context:**
The newly-active `deleteJob` route hard-deletes jobs with full cascade to applicants, interview answers, messages. Two approaches to fix:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A — Soft-delete | Add `is_deleted` column; filter queries | Preserves all history; supports audit trails | Requires schema migration + query changes across ~10 query sites |
| B — Hard-delete with guard | Block delete if any applicant exists; warn otherwise | Minimal schema change | Loses data on jobs with no applicants; doesn't protect against future applicants post-close |
| C — Archive status | Use `job_status_id = 4` (archive) as "deleted" in FE; actual delete is admin-only | Consistent with existing status system | FE must hide archived jobs from employer view; requires status filter audit |

**Recommended:** Option A (soft-delete) for data integrity. Short-term: implement Option B as a guard while soft-delete is built.

**Who decides:** Project owner (data retention policy)
**Deadline:** Before soft-launch (first real employers posting real jobs)

---

## DEC-04 · Firebase Service Account Key Loading Method

**Status:** PENDING — blocks P0-01

**Context:**
`middleware/firebaseApp.js:5` loads the key via `require('../' + env.projectName + '-serviceAccountKey.json')`. The key file was committed to git history. The decision is how to load the key after rotation.

**Options:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A — JSON env var | `JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)` | No file on disk; secrets manager compatible | Env var can be large; needs quoting in `.env` |
| B — Individual env vars | `credential: admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: ..., privateKey: ... })` | Clean; standard practice | 3 separate env vars |
| C — Google Secrets Manager | Load via GCP Secrets Manager SDK at startup | Zero secrets in env at all | Requires GCP dependency; more complex setup |

**Recommended:** Option B — three individual env vars. Clean, portable, avoids large JSON escaping issues.

**Who decides:** Lead engineer
**Deadline:** Immediately (P0)

---

## DEC-05 · Subscription Table Production Deployment Timing

**Status:** PENDING — blocks P3-06 (and monetization)

**Context:**
`subscription`, `cart_table`, and `companies_subscription` tables are referenced by `subscriptionController.js` and `paymentController.js` but are not confirmed in the production DB's 39-table schema. A real payment today would result in a DB error during webhook processing.

**Options:**
- A — Apply DDL to production now (before any payment link is shared with users)
- B — Defer until monetization sprint is scheduled

**Recommended:** Option A — apply the DDL now. It is non-destructive (CREATE TABLE IF NOT EXISTS). There is no benefit to waiting. The webhook HMAC is now in place; the next step before any real payment is working tables.

**Who decides:** Lead engineer
**Deadline:** Before any subscription payment link is given to a real user

---

## DEC-06 · PayMongo Webhook Rate-Limit Exemption

**Status:** PENDING — blocks P3-01

**Context:**
The Tier 3 `writeLimiter` (100 writes / 15 min per IP) applies to all `/api` POSTs including the PayMongo webhook. Under burst purchases, PayMongo IPs may be rate-limited. Two options:

- A — Exempt the webhook path from `writeLimiter` via `skip` function
- B — Mount webhook route before the `writeLimiter` middleware is applied

**Recommended:** Option A — add `skip: (req) => req.path === '/payment/paymongowebhook'` to `writeLimiter`. Simple, auditable, low risk.

**Who decides:** Lead engineer
**Deadline:** Before monetization goes live

---

*Decision log updated 2026-06-25. No code changes.*
