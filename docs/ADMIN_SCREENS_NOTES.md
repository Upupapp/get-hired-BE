# Admin screens — visits and billing notes

For Aryhan to take to Paul. Draft only. No analytics credentials were added.

## Visits

There is no pageview, session, or analytics table in this repo, and no Cloudflare or GA feed wired into the API. `GET /admin/dashboard` therefore returns:

- `visits_total: 0`
- `visits_previous: 0`
- `visits_series`: one `{ date, count: 0 }` per Manila day overlapping the selected range
- `visits_metric_label: "Site visits not collected"`

That label is intentionally not "Unique sessions" and not "Pageviews". Counting nothing as uniques, or labeling a pageview counter as uniques, would be false.

Options, if Paul wants a real number later:

1. Keep this stub until a source exists. The FE can show the label and a flat sparkline.
2. Minimal ingest: one `pageviews` (or `site_events`) table written by a same-origin beacon or by log shipping. Count rows in range and label the KPI **Pageviews**. Do not call that uniques unless the row stores a real session or visitor id and the query counts distinct ids.
3. Do not paste GA or Cloudflare API tokens into this service as part of the admin screens pass.

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
