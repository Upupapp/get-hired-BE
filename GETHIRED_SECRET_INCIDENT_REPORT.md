# GETHIRED SECRET INCIDENT REPORT — QA Cycle 11
Generated: 2026-06-25 | Classification: INTERNAL ONLY

---

## Status Summary

| Secret Type | Location | Status |
|------------|---------|--------|
| Firebase service account key (GetHired project) | `get-hired-BE/gethired-serviceAccountKey.json` | UNROTATED — tracked in git, OPEN since QA1 |
| Firebase service account key (JobHunt project) | `get-hired-BE/jobhunt-serviceAccountKey.json` | UNROTATED — tracked in git, OPEN since QA1 |
| DB credentials | `.env` file (not committed) | OK — env file in .gitignore |
| PayMongo secret key | `.env` via `PAYMONGO_SK` | OK — not hardcoded in source |
| SendGrid API key | `.env` via `MAILER_KEY` | OK — not hardcoded in source |

---

## Incident: Service Account Keys Committed to Repository

### Discovery
Discovered during QA Cycle 1 SWEEP. Files `gethired-serviceAccountKey.json` and `jobhunt-serviceAccountKey.json` exist in the BE repo root. Git history has not been scrubbed — these keys may appear in historical commits.

### Risk Assessment
- **Impact:** Full Firebase project access under the service account's IAM role. Can read/write Firestore, Firebase Auth, Firebase Storage, and any other service granted to the role.
- **Exploitability:** Anyone with read access to the GitHub repo (Upupapp/get-hired-BE) can extract and use these keys immediately without any brute force.
- **Blast radius:** Both production (GetHired) and secondary (JobHunt) projects are affected.

### Actions Required (External — not automatable by Claude Code)

1. **ROTATE GetHired service account key immediately:**
   - Go to GCP Console → IAM & Admin → Service Accounts
   - Find the service account used by this application
   - Delete all existing keys → create a new key
   - Update the new key in the production server's environment (not in a file, use GCP Secret Manager or env var injection)

2. **ROTATE JobHunt service account key immediately** (same process)

3. **Remove key files from repo:**
   - `git rm --cached gethired-serviceAccountKey.json jobhunt-serviceAccountKey.json`
   - Add both filenames to `.gitignore`
   - Commit and push

4. **Purge from git history:**
   - Use `git filter-repo --path gethired-serviceAccountKey.json --invert-paths` (and same for jobhunt key)
   - Force-push all branches
   - Notify all contributors to re-clone (old clones retain the history)

5. **Audit Firebase/GCP access logs** for any access using these service accounts from non-production IPs in the past 90 days.

6. **Move to environment-based secret injection** going forward — never store credentials as files in the application directory.

### No Secret Values Printed in This Report
Per absolute safety rules: no key content, no credential values are printed here.

---

## Other Secret Hygiene

- `.env` file: correct — not committed to git per `.gitignore`
- `paymongo_sk` referenced via `env.paymongo_sk` (from process.env) — correct
- `mailerKey` referenced via `env.mailerKey` — correct
- Firebase config (apiKey, appId, etc.) referenced from env — correct; note Firebase public API keys (apiKey, authDomain) are meant to be semi-public and are safe in client-side code, but should still not be in server-side .env committed to git
