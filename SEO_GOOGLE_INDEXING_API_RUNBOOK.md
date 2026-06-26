# SEO: Google Indexing API Runbook

**Status:** DISABLED. The service exists (`services/googleIndexing.service.js`) and trigger points are wired in `controllers/jobsController.js`, but `GOOGLE_INDEXING_API_ENABLED` is `false` in all environments.

**Do not enable until all prerequisites are met.**

---

## What This Does

When enabled, the service calls Google's Indexing API to notify Googlebot immediately when:
- A job is **published** → `URL_UPDATED` notification
- A job is **deleted or unpublished** → `URL_DELETED` notification

This can reduce the time it takes for new job postings to appear in Google for Jobs from days to hours.

The API has a quota of **200 URL notifications per day** (per GCP project). With typical job volumes this is sufficient.

---

## Prerequisites (All Required)

### Step 1: Verify Search Console Property

Follow `SEO_SEARCH_CONSOLE_AND_SITEMAP_RUNBOOK.md`. The property `https://gethiredonline.app` must be verified before the Indexing API will accept notifications for it.

### Step 2: Create a GCP Service Account

1. Go to https://console.cloud.google.com/
2. Select (or create) a GCP project — use the same project where Firebase is configured
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
   - Name: `gethired-indexing`
   - Description: `GetHired Google Indexing API`
5. Click **Create and Continue** → skip role assignment → **Done**
6. Click the new service account → **Keys** tab → **Add Key** → **JSON**
7. Download and save the JSON key file securely (do NOT commit it)

### Step 3: Grant Indexing API Access in Search Console

1. Open https://search.google.com/search-console/
2. Go to **Settings** → **Users and permissions**
3. Click **Add user**
4. Enter the service account email (format: `name@project.iam.gserviceaccount.com`)
5. Role: **Owner** (required for Indexing API — Editor is not sufficient)
6. Click **Add**

### Step 4: Enable the Indexing API in GCP

1. Go to https://console.cloud.google.com/apis/library
2. Search for "Web Search Indexing API"
3. Click **Enable**

### Step 5: Store the Service Account Key

Base64-encode the service account JSON (single line, no newlines):

```bash
# On Linux/Mac:
base64 -w 0 path/to/service-account.json

# On Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\service-account.json"))
```

Set in the Linode deployment environment (NOT in .env file or git):

```
GOOGLE_INDEXING_API_ENABLED=true
GOOGLE_INDEXING_SERVICE_ACCOUNT_BASE64=<base64-encoded-json>
PUBLIC_SITE_URL=https://gethiredonline.app
```

### Step 6: Enable in Production

After setting environment variables:

```bash
ssh root@139.162.11.242 "pm2 restart all --update-env"
```

Verify by publishing a test job and checking BE logs for:
```
[googleIndexing] URL_UPDATED notified: https://gethiredonline.app/jobs/details/JBxxxxxx
```

---

## Trigger Points (already wired)

| Event | Controller | Notification type |
|-------|-----------|-------------------|
| Job created | `createJobs` | `URL_UPDATED` |
| Job status → published (2) | `updateStatusOfJob` | `URL_UPDATED` |
| Job status → any other | `updateStatusOfJob` | `URL_DELETED` |
| Job deleted | `deleteJob` | `URL_DELETED` |

All calls are **fire-and-forget** (not awaited in the request handler). Failures are logged but never affect the API response to the employer.

---

## Safety Guardrails

- `GOOGLE_INDEXING_API_ENABLED=false` by default — the service is a hard no-op until explicitly enabled
- URL validation: only URLs starting with `PUBLIC_SITE_URL` (`https://gethiredonline.app`) can be submitted — private dashboard routes can never be accidentally indexed
- Errors are caught and logged (redacted to 120 chars) — never surfaced to the API caller
- The googleapis package is already in `package.json` — no new dependencies needed

---

## Quota & Cost

- Google Indexing API is **free** for sites with verified Search Console property
- Default quota: 200 URL notifications per day
- If quota is exceeded, notifications are silently dropped (logged as non-fatal error)
- Quota increase: https://console.cloud.google.com/apis/api/indexing.googleapis.com/quotas

---

## Rollback

To disable without code changes:

```bash
ssh root@139.162.11.242 "pm2 set get-hired-BE:GOOGLE_INDEXING_API_ENABLED false && pm2 restart all"
```

Or simply ensure `GOOGLE_INDEXING_API_ENABLED` is `false` or absent — the service becomes a no-op immediately.
