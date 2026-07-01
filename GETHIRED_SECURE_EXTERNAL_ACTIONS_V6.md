# GETHIRED SECURE EXTERNAL ACTIONS — V6
**Date:** 2026-07-01
**Definition:** Actions that require human intervention outside the codebase — credentials, cloud console operations, infrastructure config.
**Rule:** No secret values are printed here. Only action descriptions.

---

## P0 External Actions (blocking)

### EXT-001 — Rotate Firebase Service Account Key
- **Priority:** P0
- **Where:** Google Cloud Console → IAM & Admin → Service Accounts → GetHired project → Keys
- **Action:** Delete the compromised key, generate a new JSON key, update the production server's environment with the new key (do not commit to git)
- **Status:** OPEN

### EXT-002 — Revoke and Rotate SSH Keys
- **Priority:** P0
- **Where:** All servers that had the compromised key in `authorized_keys`
- **Action:** Remove old key, add new key
- **Status:** OPEN

### EXT-003 — Purge Git History
- **Priority:** P0
- **Tool:** BFG Repo Cleaner or `git filter-repo`
- **Action:** Remove Firebase SA JSON and SSH key from all commits. Force-push to GitHub. Notify all collaborators to re-clone.
- **Status:** OPEN

### EXT-004 — Set PAYMONGO_WEBHOOK_SECRET in Production .env
- **Priority:** P0
- **Where:** PayMongo Dashboard → Webhooks → your endpoint → Signing Secret
- **Action:** Copy signing secret value, add to production `.env` as `PAYMONGO_WEBHOOK_SECRET=<value>`
- **Status:** OPEN (code is ready; env var just needs to be set)

---

## P1 External Actions (important)

### EXT-005 — Configure CORS Allowlist
- **Priority:** P1
- **Where:** BE `server.js` cors() configuration
- **Action:** Replace `app.use(cors())` with explicit origin list: `https://gethiredonline.app`, `https://www.gethiredonline.app`. No code printed here; the actual domains must be confirmed by the team.
- **Status:** OPEN

### EXT-006 — Set LinkedIn OAuth App Credentials
- **Priority:** P1
- **Where:** LinkedIn Developer Portal → Your App → Auth → OAuth 2.0 settings
- **Action:** Ensure `LINKEDIN_REDIRECT_URI` matches the callback URI registered in the LinkedIn app (must be exact match including protocol and path). Set `LINKEDIN_AUTH_ENABLED=true` in production `.env`.
- **Status:** OPEN (must verify)

### EXT-007 — Add Rate Limit on LinkedIn Auth Routes
- **Priority:** P1
- **Where:** BE `routes/linkedinAuthRoutes.js`
- **Action:** Apply `express-rate-limit` (already installed) to `/start`, `/complete`, and `/choose-role` endpoints — e.g., 10 requests per 15 minutes per IP. This is a code action but requires team sign-off on the limit values.
- **Status:** OPEN

---

## P2 External Actions (recommended)

### EXT-008 — Add LINKEDIN_STATE_SECRET Environment Variable
- **Priority:** P2
- **Action:** Generate a separate strong secret (32+ random bytes, base64url-encoded). Set as `LINKEDIN_STATE_SECRET` in `.env`. Update `linkedinSession.js` to use this secret for state and ticket JWTs instead of `env.secret`.
- **Status:** OPEN (LI-SEC-002)

### EXT-009 — Schedule oauth_tickets Cleanup Cron
- **Priority:** P2
- **Action:** Add a cron job (PM2 cron or PostgreSQL pg_cron) to delete `oauth_tickets` rows where `expires_at < NOW() - INTERVAL '1 hour'` — prevents unbounded table growth.
- **Status:** OPEN

### EXT-010 — Verify Production Node.js Version
- **Priority:** P2
- **Action:** Confirm production Linode server runs Node.js 18+ (LTS). Node 14 (used locally per memory) is EOL.
- **Status:** OPEN

---

## Previously Closed External Actions

| Action | Status |
|---|---|
| Create new Google OAuth Web Client | DONE (V5 session) |
| Set PAYMONGO_WEBHOOK_SECRET_DEV in staging env | PARTIAL (code wired, env var status unknown) |
