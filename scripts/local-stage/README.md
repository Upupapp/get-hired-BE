# Local subscription staging

Runs the prepared frontend with real backend subscription-summary, catalog, storage-summary and billing HTTP handlers. Synthetic identities replace Firebase. Controllers are transpiled in a sandbox with an injected in-memory PGlite database and narrowly stubbed company/job lookup dependencies; production env.js is never loaded. No credentials or production rows are copied. This is not the full production server.

Database starts from the captured schema fixture and billing, engagement, internal-access and storage migrations. Staging adds a uuid_generate_v4 wrapper around gen_random_uuid and an empty job_applicants key table to satisfy storage foreign keys; this is not PostgreSQL 16 migration certification. Internal and ordinary-trial accounts are synthetic. Invoice listing is an empty stage response. Billing-profile editing and other portal workflows are outside scope and unsupported API paths return 404. Provider is simulated; no email worker runs.

Build frontend using scripts/local-stage/README.md in codex/internal-access-frontend, then launch from backend root (dependencies must be installed or available via NODE_PATH):

```sh
GETHIRED_STAGE_FRONTEND=/tmp/gethired-subscription-stage node scripts/local-stage/server.cjs
```

Bound only to 127.0.0.1:4317. Open http://127.0.0.1:4317/?scenario=internal or ?scenario=trial. The banner clearly identifies synthetic staging. All API calls require x-stage-case: internal or trial; this is deliberately a local test identity, not production authentication. Do not expose this server publicly.

GET /stage/evidence reports simulated-provider calls and persisted payment count. Stop the process with Ctrl-C; the database is discarded.

Verified 2026-09-21: actual Chrome page showed Premium Internal / Complimentary, 40 jobs, 15 seats, 200 GB, 400 video responses, no purchase controls; billing history showed no transactions. Ordinary trial showed seven days, trial capacities and normal upgrade options. Seven HTTP checks passed: internal legacy and V4 summaries, trial summary, both blocked checkout routes, missing identity rejection and zero provider calls/payments. No production grant, deployment, payment, or LGUIDS changes.
