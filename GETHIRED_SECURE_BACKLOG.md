# GETHIRED SECURE BACKLOG — RECENT DEPLOYMENT

No new security items from this deployment.

## From prior SECURE runs (still open):
- PayMongo webhook signature verification — P0 (needs real webhook secret from PayMongo dashboard)
- Open CORS (app.use(cors()) no restriction) — P1 (needs per-brand domain list from user)
- Node.js 14 EOL runtime — P1 (known, esm package constraint)
- Git history leaked secrets — P1 (needs git filter-repo from owner)
- SendGrid add_user template edit — P1 (dashboard access needed)

None of these are introduced by the recent deployment — they predate it.
