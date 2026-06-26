# Security Hardening Summary

Completed: 2026-06-26  
Command: `GETHIRED_SECURITY_AND_DEPLOYMENT_HARDENING`

---

## 1. Completed Changes

### Code Changes (deploy to Linode)

| File | What Changed |
|------|-------------|
| `middleware/firebaseApp.js` | Replaced direct `require('../jobhunt-serviceAccountKey.json')` with a 4-strategy credential chain: env-base64 → env-json → ADC → local-file (dev only). Initializes exactly once. Logs source type only. Redacts errors. Named app `'admin'` preserved. All downstream exports (`firebaseAdmin`, `firebaseApp`, `firebaseConfig`) unchanged. |
| `package.json` | Added `"security:secrets": "bash tools/check-secrets.sh"` to scripts |
| `tools/check-secrets.sh` | New: secret scanner — checks for private key headers, private_key JSON fields, credential filename patterns, and suspicious long base64 blobs. Prints filename:line only, never matched value. Exit 0 = clean, exit 1 = found. |

### Config/Gitignore Changes

| File | What Changed |
|------|-------------|
| `.gitignore` | Expanded to cover all credential JSON file patterns (`*serviceAccountKey*.json`, `*service-account*.json`, `*firebase-admin*.json`, `credentials*.json`, `secrets*.json`, `private-key*.json`) |
| `.env.example` | Created with placeholder-only values and setup instructions for all 4 Firebase credential strategies |

### Documentation / Runbooks (informational, no deploy needed)

| File | Purpose |
|------|---------|
| `SECURITY_INCIDENT_FIREBASE_SERVICE_ACCOUNT_KEY.md` | Incident summary, containment steps, owner action to disable leaked key, replacement strategy, validation checklist, prevention, communications |
| `GIT_HISTORY_SECRET_PURGE_RUNBOOK.md` | Manual runbook for git history rewrite (not needed — history review confirmed key was never committed; kept for reference) |
| `DEPLOYMENT_AUTH_RUNBOOK.md` | Three options for restoring Linode git pull auth (SSH Deploy Key preferred, GitHub App, fine-grained PAT fallback) |
| `SECURITY_HARDENING_VALIDATION.md` | Commands run, not run, manual smoke checks, expected log output |

---

## 2. Manual Owner Actions Still Required

These cannot be automated — they require the Google Cloud / GitHub repo owner:

| Priority | Action | Reference |
|----------|--------|-----------|
| **P0 — Do immediately** | Disable / delete the old Firebase service account key in Google Cloud Console | `SECURITY_INCIDENT_FIREBASE_SERVICE_ACCOUNT_KEY.md` Section 3 |
| **P0** | Generate a new service account key (or use ADC) and set `FIREBASE_SERVICE_ACCOUNT_BASE64` on the Linode server | `SECURITY_INCIDENT_FIREBASE_SERVICE_ACCOUNT_KEY.md` Section 4 |
| **P0** | Restart PM2 with `pm2 restart all --update-env` after setting the env var | `DEPLOYMENT_AUTH_RUNBOOK.md` |
| **P1** | Fix Linode git pull auth (implement Option A — SSH Deploy Key) | `DEPLOYMENT_AUTH_RUNBOOK.md` Option A |
| **P1** | Notify all collaborators, ask them to re-clone | `SECURITY_INCIDENT_FIREBASE_SERVICE_ACCOUNT_KEY.md` Section 7 |
| **P2** | Review Google Cloud audit logs for unexpected activity with the compromised account | `SECURITY_INCIDENT_FIREBASE_SERVICE_ACCOUNT_KEY.md` Section 2 |
| **P2** | Add `npm run security:secrets` as a git pre-commit hook | `SECURITY_HARDENING_VALIDATION.md` |
| **P3** | Schedule 90-day key rotation reminder | `SECURITY_INCIDENT_FIREBASE_SERVICE_ACCOUNT_KEY.md` Section 6 |

---

## 3. Tests Run / Not Run

- No automated tests were run — the test suite requires a live Firebase credential
  and the test script currently exits 1 (`echo "Error: no test specified"`).
- `npm run security:secrets` was not run locally (requires bash; run in CI or on Linode).
- Manual smoke checks are documented in `SECURITY_HARDENING_VALIDATION.md`.

---

## 4. Risk Notes

**Pre-deploy risk:** The current production server (`root@139.162.11.242`) still
runs the OLD `firebaseApp.js` that reads from the local JSON key file. The server
continues to work until restarted, because the old code is still running in PM2.

**Post-deploy risk if credential not set:** After the new `firebaseApp.js` is
deployed and PM2 is restarted, the server will **fail to start** unless
`FIREBASE_SERVICE_ACCOUNT_BASE64` (or another credential env var) is set.
The owner MUST set the credential before or immediately after deploying.

**History:** Git history review confirmed `jobhunt-serviceAccountKey.json` was
**never committed** to the repository (gitignored from the very first commit that
referenced it). The git history purge runbook is provided for completeness but
is not required unless further investigation reveals a committed copy.

---

## 5. Rollback Plan

If the new `firebaseApp.js` causes a startup failure on Linode:

```bash
# Emergency rollback — restore previous firebaseApp.js via SCP
# (keep a local copy of the old file before deploying)
scp middleware/firebaseApp.js.bak root@139.162.11.242:/var/www/_work/get-hired-BE/middleware/firebaseApp.js
ssh root@139.162.11.242 "pm2 restart all"
```

The more likely failure mode is a missing credential env var. Fix:

```bash
# Set the credential and restart — no code change needed
ssh root@139.162.11.242 "export FIREBASE_SERVICE_ACCOUNT_BASE64='<value>'"
ssh root@139.162.11.242 "pm2 restart all --update-env"
```

PM2 ecosystem file (if used):

```bash
ssh root@139.162.11.242 "cat /var/www/_work/get-hired-BE/ecosystem.config.js"
# Add FIREBASE_SERVICE_ACCOUNT_BASE64 to the env block in that file
```
