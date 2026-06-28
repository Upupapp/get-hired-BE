# GETHIRED_SECURE_REPORT_RECENT_V2.md
Security review scoped to SEO V3 deployment: BE commit 26ca25a / FE commit bf5bd08.
Reviewed 2026-06-25.

Previous V2 report (BE 8a2a205) has been superseded by this file.

---

## FINDING 1 — RESOLVED: Webhook rate-limit skip path (from prior V2 report)

**Prior severity: P0 — now FIXED**

The prior report (BE 8a2a205) found that `writeLimiter`'s skip predicate used
`"/payment/webhook"` which never matched the actual route `"/payment/paymongowebhook"`.

Current `server.js` line 73:
```js
req.path === "/payment/paymongowebhook",
```
This matches correctly. The fix was applied and is confirmed present in the SEO V3 codebase.
Status: CLOSED.

---

## FINDING 2 — CLEAN: sitemap.xml SQL injection risk

**Severity: N/A (safe)**

The `/sitemap.xml` route interpolates `schema` into the SQL query:
```js
`SELECT job_id, updated_at FROM ${schema}.jobs WHERE job_status_id = 2 ORDER BY updated_at DESC;`
```

`schema` is read from `envConfig.schema` which is `env.js` → `process.env.SCHEMA`
(production branch, `is_staging == "false"`). It is a static server-startup value loaded
from the `.env` file via `dotenv`. There is no user-supplied input in this query.
The parameterised `[]` array is empty (no bind variables needed). No injection surface exists.

Note: the dynamic `import("./env.js")` inside the route handler is a no-op relative to
the module-level `import env from "./env.js"` already in scope — it re-uses Node's module
cache and returns the same already-parsed config object. This is a minor code style issue,
not a security problem.

Status: SAFE. No action required.

---

## FINDING 3 — LOW: sitemap.xml information disclosure (job_id enumeration)

**Severity: P3 (accepted risk)**

The sitemap exposes `job_id` values for all published (`job_status_id = 2`) jobs in the
format `https://gethiredonline.app/jobs/details/{job_id}`. Only `job_id` and `updated_at`
are fetched and emitted.

BOLA risk assessment:
- `/jobs/details/{id}` is the public job board — intentionally public.
- Unpublished jobs (`job_status_id != 2`) are excluded from the query.
- The only BOLA concern would be whether a job_id from the sitemap can be used to
  probe private data. The `GET /job/details` endpoint (SEC-02, still open from prior audit)
  already accepts a uid parameter from `req.query` — that is the open BOLA door, not the
  sitemap. The sitemap discloses no additional attack surface beyond what the public job
  list already exposes.

Status: ACCEPTED RISK. The job_id enumeration is an intentional feature of a public
sitemap. SEC-02 (`GET /job/details` uid param probing) remains the relevant open item.

---

## FINDING 4 — LOW: sitemap.xml rate limiting

**Severity: P2 (non-critical)**

`GET /sitemap.xml` is NOT under `/api`, so the `writeLimiter` and `authLimiter` do not apply.
However, the `globalLimiter` IS applied via `app.use(globalLimiter)` at line 115, which
runs BEFORE route mounting and covers every route including `/sitemap.xml`.

Global limit: 500 requests / 15 minutes per IP.

The route hits the DB (one `SELECT` on the `jobs` table) and is cached at the HTTP level
(`Cache-Control: public, max-age=3600`). A well-behaved crawler fetches sitemap.xml once
per hour. A malicious IP would exhaust its 500-request global budget before causing
significant DB load (the query is a simple indexed select on `job_status_id`).

Concern: the global limiter is per-IP. A distributed botnet of many IPs could collectively
flood the DB endpoint. Legitimate crawlers (Googlebot) operate from multiple IPs and could
collectively exceed per-IP limits in theory, though in practice Googlebot honours
`Cache-Control` and robots.txt crawl-delay.

Recommended improvement (P2, not P0): add a dedicated sitemap limiter (e.g. 10 req/hour)
and/or serve the sitemap as a statically pre-generated file (cron job writes sitemap.xml
every hour to the FE `dist/` folder). The current DB-live approach is acceptable for
current traffic volume.

Status: ACCEPTABLE for now. Document and revisit when traffic scales.

---

## FINDING 5 — CLEAN: robots.txt security coverage

**Severity: N/A (complete)**

`src/robots.txt` Disallow entries:
```
/admin/   /admin
/recruiter/   /recruiter
/user/   /user
/owner/   /owner
/investor/   /investor
/api/
/payment/   /payment
/subscription/   /subscription
/signin   /signup   /reset-password   /change-password   /verify
```

Coverage check against known authenticated routes:
- Employer/recruiter routes: covered by `/recruiter/`
- Admin: covered by `/admin/`
- Auth flows: covered by `/signin`, `/signup`, `/reset-password`, `/change-password`, `/verify`
- API endpoints: covered by `/api/`
- Payment pages: covered by `/payment/` and `/payment`
- Subscription: covered by `/subscription/` and `/subscription`
- `/owner/` and `/investor/` — included even though no current routes with these prefixes
  are known; defensive and correct.

No sensitive routes are missing from Disallow. Sitemap URL correctly points to
`https://gethiredonline.app/sitemap.xml` (BE-served dynamic endpoint).

Status: COMPLETE. No gaps found.

---

## FINDING 6 — CLEAN: JSON-LD injection XSS risk

**Severity: N/A (safe)**

`seo.service.ts` line 185:
```ts
script.text = JSON.stringify(data);
```

`script.text` sets the text content of a `<script>` element via the DOM `text` property,
which is equivalent to `Node.textContent`. It does NOT call `innerHTML`. The browser
does not parse the string as HTML; it parses it as script source when the type is
`application/ld+json` (JSON-LD), not executable JavaScript.

`JSON.stringify()` escapes all characters that are dangerous in JSON contexts (`"`, `\`),
and the `application/ld+json` script type means browsers will NOT execute it as JavaScript
— they only expose it to JSON-LD parsers.

The one usage of `div.innerHTML = html` is in the `stripHtml` private helper (line 370).
This creates a throw-away `div`, sets innerHTML to the job description (which may contain
recruiter-supplied HTML), then reads only `div.textContent`. The `textContent` property
returns plain text with all HTML tags stripped. The `div` is never inserted into the DOM,
so no XSS execution path exists.

No `[innerHTML]` bindings were found in any public-portal Angular template — templates
use Angular's safe `{{ }}` interpolation which HTML-encodes all values.

Angular's `Meta.updateTag()` API (used for all OG and Twitter meta tags, title, robots)
sets `content` attribute values through the DOM API — it does not call `innerHTML`.
The `document.querySelector('meta[property="og:title"]').setAttribute('content', title)`
concern mentioned in the SECURE brief does NOT appear in the current codebase; all
meta updates go through Angular's `Meta` service.

Status: SAFE. No XSS vectors found in the SEO V3 changes.

---

## FINDING 7 — VERIFIED: PayMongo HMAC verification

**Severity: N/A (HMAC is fully wired)**

`paymentController.js` lines 58–94: `verifyPaymongoSignature()` is implemented with:
- Reads `env.paymongo_webhook_secret` (from `PAYMONGO_WEBHOOK_SECRET` env var — not hardcoded)
- Fails closed if secret is missing or falsy (line 60: `if (!secret) return false`)
- Validates `paymongo-signature` header format
- Enforces 5-minute replay window (line 75)
- Uses `crypto.timingSafeEqual` to prevent timing attacks (line 90)
- Prefers live signature (`li`) over test signature (`te`) (line 83)

`paymongoWebhook()` line 97: `if (!verifyPaymongoSignature(req)) { return res.status(400)... }`
The verification is called first, before any event processing.

`server.js` line 91–94: `express.json()` has `verify: (req, _res, buf) => { req.rawBody = buf; }`
so `req.rawBody` is correctly populated for HMAC computation.

The hardcoded secret `whsk_eTXN9X4axdzw7n6ro9EqkGbK` mentioned in the SECURE brief does NOT
appear anywhere in the codebase. All grep results for `whsk_` returned zero matches in JS/env files.

The prior open item "PAYMONGO_WEBHOOK_SECRET must be set in production .env" remains an
OPS task — the code is correct. If the env var is absent, the function fails closed (400 all
webhooks) rather than accepting unauthenticated events.

Status: VERIFIED CORRECT. Code is fully wired; ops must confirm env var is set in production.

---

## FINDING 8 — CLEAN: CORS still correctly restricted

**Severity: N/A (no regression)**

`server.js` line 90:
```js
app.use(cors({ origin: env.app_url }));
```

`env.app_url` is `process.env.APP_URL` (production branch) or `http://localhost:4200`
(fallback). The SEO V3 changes added the `/sitemap.xml` endpoint AFTER the cors middleware —
it inherits the same CORS policy.

CORS behaviour on `/sitemap.xml`: CORS headers are sent but sitemap.xml is typically
fetched server-to-server (by crawlers, not browsers). A cross-origin browser request to
`/sitemap.xml` would be rejected by CORS — this is correct because the sitemap is intended
for crawlers, not for cross-origin browser AJAX.

Status: NO REGRESSION. CORS unchanged and correct.

---

## FINDING 9 — LOW: Previously open items (SEC-01, SEC-02) not touched by SEO V3

**Severity: P2 (pre-existing, not introduced by this deployment)**

- **SEC-01**: `GET /applicant/userprofile` reads uid from `req.query` (not JWT). Still open.
- **SEC-02**: `GET /job/details` uid param probing. Still open.

SEO V3 did not modify either endpoint. These items remain in the backlog.

---

## Summary table

| # | Item | Severity | Status |
|---|------|----------|--------|
| 1 | Webhook writeLimiter skip path | P0 | FIXED (confirmed) |
| 2 | sitemap.xml SQL injection via schema interpolation | — | SAFE (static env var) |
| 3 | sitemap.xml job_id enumeration / information disclosure | P3 | ACCEPTED RISK |
| 4 | sitemap.xml rate limiting | P2 | ACCEPTABLE (globalLimiter covers; see recommendation) |
| 5 | robots.txt coverage | — | COMPLETE |
| 6 | JSON-LD XSS (script.text, stripHtml, Meta API) | — | SAFE |
| 7 | PayMongo HMAC verification | — | VERIFIED WIRED |
| 8 | CORS regression check | — | NO REGRESSION |
| 9 | SEC-01 / SEC-02 pre-existing open items | P2 | UNCHANGED (not in SEO V3 scope) |
