# Daily product metrics — Emailer one-pager

Read-only internal endpoint for the daily product digest. It does not send mail, charge a card, or migrate a database. The route stays dark until `DAILY_METRICS_CRON_SECRET` is set on the API process (unset returns **503**).

## Request

```bash
curl -sS \
  -H "x-daily-metrics-cron: $DAILY_METRICS_CRON_SECRET" \
  "$GETHIRED_API_ORIGIN/api/internal/daily-product-metrics"
```

| Piece | Value |
| --- | --- |
| Method | `GET` |
| Path | `/api/internal/daily-product-metrics` |
| Auth header | `x-daily-metrics-cron: $DAILY_METRICS_CRON_SECRET` |
| Default day | **Yesterday**, Asia/Manila, if `day` is omitted |
| Ops day | `?day=today` or `?day=YYYY-MM-DD` |
| CSV | `?format=csv` — header row plus one data row |

```bash
curl -sS \
  -H "x-daily-metrics-cron: $DAILY_METRICS_CRON_SECRET" \
  "$GETHIRED_API_ORIGIN/api/internal/daily-product-metrics?day=today"

curl -sS \
  -H "x-daily-metrics-cron: $DAILY_METRICS_CRON_SECRET" \
  "$GETHIRED_API_ORIGIN/api/internal/daily-product-metrics?day=2026-09-24&format=csv"
```

`$GETHIRED_API_ORIGIN` is the existing GetHired API host (the same origin as `POST /api/internal/job-opening-alerts/digest`). There is no Firebase token and no admin session.

Wrong or missing header → **401**. Secret not configured → **503**. Bad `day` or `format` → **400**.

## Sample JSON

```json
{
  "day": "2026-09-24",
  "timezone": "Asia/Manila",
  "generated_at": "2026-09-25T00:15:00+08:00",
  "revenue_php_day": 0,
  "revenue_php_mtd": 0,
  "live_jobs": 0,
  "new_jobs_day": 0,
  "employers_total": 0,
  "new_employers_day": 0,
  "jobseekers_total": 0,
  "new_jobseekers_day": 0,
  "joa_subscribers_active": 0,
  "joa_subscribers_new_day": 0,
  "joa_available": true,
  "applications_total": 0,
  "applications_day": 0,
  "companies_total": 0
}
```

The HTTP 200 JSON body is that object.

## What each number means

| Field | Meaning |
| --- | --- |
| `revenue_php_day` | Succeeded payments in PHP for that Manila day. Same merge as Admin Finance `revenue_in_range_php`: `payment_transactions`, then orphan `payment_attempts`, then `invoices`. Pending, failed, and refunded are excluded. |
| `revenue_php_mtd` | Same figure from Manila month-start through the end of `day`. |
| `live_jobs` | `jobs.job_status_id = 2` (Published). Includes every company, LGUIDS included. |
| `new_jobs_day` | Jobs whose `created_at` falls on that day, any status. |
| `employers_total` / `new_employers_day` | `user_credentials` role **2**, `is_archive = false`. Accounts, not companies. New uses `created_date`. |
| `jobseekers_total` / `new_jobseekers_day` | Role **3**, `is_archive = false`. New uses `created_date`. |
| `joa_subscribers_active` | Rows in `job_opening_alert_subscriptions` with `active = true` (not distinct users). |
| `joa_subscribers_new_day` | Subscription **rows** created that day, including ones later turned off. |
| `joa_available` | `false` and both JOA counts `0` when that table is not on the database yet. The rest of the payload still returns. |
| `applications_total` / `applications_day` | Every `job_applicants` row. Day stamp is `date_applied`. Archived applications are included. |
| `companies_total` | `COUNT(*)` on `companies`. |

A missing finance table becomes **0** revenue, the same way Admin Finance does. It does not fail the digest.

## Not in this payload

Brevo sends, opens, clicks, Facebook, and site pageviews. This endpoint does not email anyone. Wire the digest in Emailer only after the secret is set on the API.
