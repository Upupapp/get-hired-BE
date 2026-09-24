# Admin screens — visits and billing notes

For Aryhan to take to Paul. Draft only. No analytics credentials were added.

## Visits

Paul approved first-party pageview ingest (2026-09-24). No GA or Cloudflare tokens.

Migration (apply on Linode only when Paul authorises the release; not applied by this PR):

`db/20260924_site_pageviews.sql` → `gethired.site_pageviews`

Columns: `id`, `occurred_at`, `path`, `referrer_host`, `session_id`, `is_authenticated`. Indexes on `(occurred_at)` and `(occurred_at, path)`. IP, user agent, uid, email, and query strings are not stored. `session_id` is an opaque client UUID kept for a later uniques upgrade. v1 does not `COUNT(DISTINCT session_id)`.

Retention follow-up, not in this migration: delete rows older than 90 days.

Ingest: `POST /api/public/pageview` (no auth). Mounted before `billingRoutes` so the billing catch-all auth gate does not reject it. Allow-list is explicit: `https://gethiredonline.app`, `https://www.gethiredonline.app`, `http://localhost:4200`, `http://127.0.0.1:4200`. This repo has no Cloudflare Pages preview host pattern, so preview hosts are not allowed until one is named. Origin or Referer must match. Body `{ path, session_id?, referrer?, is_authenticated? }`. Path is reduced to a pathname (max 512). Referrer is stored as hostname only. Rate limit 60/minute/IP (in memory only). Success is **204** with an empty body. A database failure is logged and still returns 204, never 5xx.

Dashboard, when the table exists:

- `visits_total` = `COUNT(*)` in `[fromAt, toAt)`
- `visits_previous` = the equal-length window before that
- `visits_series` = daily counts. Today and custom use Asia/Manila calendar days. 7d and 30d use rolling 24-hour buckets.
- `visits_metric_label` = **"Pageviews"**

If the table is missing (`42P01`), the dashboard keeps zeros and `visits_metric_label` = `"Site visits not collected"`.

Recruiter `GET /api/recruiter/dashboard/analytics` is company job views, not site visits. It is not reused here.

## Billing

Read-only. No charge, refund, plan change, or impersonation.

- Subscriptions come from the latest `companies_subscription` row per company, joined to `"subscription".canonical_slug` when present.
- MRR is a snapshot. Monthly plans use `planCatalogServiceV4` `priceMonthlyPHP`. Annual plans use `effectiveMonthlyPHP` (catalog annual ÷ 12, already rounded). Free trials contribute 0. `internal_complimentary` grants contribute 0. The KPI sums **active** rows only. Grace and past_due still show a catalog contribution on the directory row.
- Revenue in range sums **succeeded** payments only (`payment_transactions.status = 'PAID'`, plus paid invoices whose reference is not already on that ledger). Failed, pending, and refunded rows stay on the payments table and are excluded from revenue.
- The subscriptions directory is not filtered by the date range. The payments table is.
- If `payment_transactions`, `payment_attempts`, `invoices`, or `companies_subscription` is missing (`42P01` / `42703`), the handler returns zeros and empty arrays. It does not synthesize payments from `is_paid` or `amount_paid`.
- Legacy slugs (`enterprise`, unknown names) map to plan slug `other`. `premium` maps to `business`.
- Live Growth caps in `planCatalogServiceV4` are **15 jobs / 5 admins / 100 video responses**. The ticket text said 6/3/100; that matches the superseded `pricing_2026_09_21:growth` row, not the current catalog. A company's `effective_entitlements` overrides the catalog when those keys are stored.
- Admin `plan_label` for slug `business` is **Business**. The catalog product name for that slug is Premium.
- Company history is `subscription_lifecycle_events` plus payment rows. There is no admin unpublish audit table, so job unpublish events are not invented.
- `last_login` on the users list is `MAX(auth_identities.last_login_at)` for linked OAuth identities. Email/password accounts have no login timestamp column and return null. If `auth_identities` is absent, the list still loads with null.

## Time zone

Today and custom `from`/`to` are Asia/Manila calendar dates, inclusive. `7d` and `30d` are rolling hour windows ending at the request clock. Omitted dashboard and finance ranges default to `7d`. `applications_7d` and `applications_30d` stay the existing `NOW() - interval` counts.
