# GETHIRED SECRET INCIDENT REPORT — V6
**Date:** 2026-07-01 | **Status:** UNCHANGED FROM V5

---

## Active Incidents

### INC-001 — Firebase Service Account JSON in Git History
- **Severity:** P0
- **First found:** V1
- **Status:** STILL OPEN
- **Details:** Firebase service account private key JSON committed to git history in BE repo. Key material is considered compromised.
- **Required action:** Rotate Firebase service account key in Google Cloud Console. Purge git history (BFG Repo Cleaner). No automated action taken.

### INC-002 — SSH Private Key in Git History
- **Severity:** P0
- **First found:** V1
- **Status:** STILL OPEN
- **Details:** SSH private key committed to git history.
- **Required action:** Revoke key on all authorized_keys targets. Generate new key pair. Purge git history.

---

## New V6 Assessment — LinkedIn Secrets

### LinkedIn Client Secret
- `LINKEDIN_CLIENT_SECRET` is loaded via `process.env.LINKEDIN_CLIENT_SECRET` and used only server-side in token exchange. Never returned to FE. Never logged. PASS.

### LinkedIn Access Token
- Access token used only within `linkedinCallback` to call the userinfo endpoint. Never stored in DB. Never returned to FE. PASS.

### State JWT Secret
- Shares `env.secret` with main app JWT. See LI-SEC-002. Not a secret incident (no leak) but a key hygiene finding.

### Ticket JWT
- Ticket JWTs appear in the redirect URL (`?ticket=...`). This is mitigated by single-use constraint and 5-minute TTL. Not a secret incident per se, but the ticket URL should not be logged on the server (verify: `console.log` in callback only logs uid and status, not the ticket value — PASS).

---

## Hardcoded Secret Check — LinkedIn Files

| File | Finding |
|---|---|
| `middleware/linkedinSession.js` | No hardcoded secrets. Uses `env.secret` from dotenv. |
| `controllers/linkedinAuthController.js` | No hardcoded secrets. All credentials from `process.env.*`. |
| `routes/linkedinAuthRoutes.js` | No secrets. Route definitions only. |
| `scripts/createAuthIdentitiesTable.js` | No secrets. Uses `env.schema` from dotenv. |

---

## Recommendations
1. Rotate Firebase SA key and SSH key immediately.
2. Purge git history after rotation (BFG or git filter-repo).
3. Add `LINKEDIN_STATE_SECRET` env var separate from `SECRET` for state/ticket JWTs (LI-SEC-002 fix).
4. Verify `.env` is in `.gitignore` for BE repo (confirmed from V5 — PASS).
