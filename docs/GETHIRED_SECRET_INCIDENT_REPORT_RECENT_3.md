# GetHired — Secret Incident Report (SECURE 3)
**Date:** 2026-06-26
**Prepared by:** Claude Code SECURE 3 audit

---

## Incident 1: Firebase Service Account Key — Auto-Revoked by Google

**Status:** RESOLVED (credential rotated)

### Timeline
- A Firebase service account key (project: get-hired-363107, key prefix `d7f03...`) was detected by Google's secret scanning service
- Google automatically revoked the key
- The root cause was a dynamic `require('../' + env.projectName + '-serviceAccountKey.json')` in the original `middleware/firebaseApp.js` that loaded a JSON file that may have been accessible or scanned
- **The JSON file itself was NOT committed to git** — `.gitignore` blocked it. The key was revoked by Google's secret scanning on a different surface (likely the file was present on disk and scanned, or was shared through another channel)
- A new key (prefix `b8526e1891fc...`) was generated and stored as `FIREBASE_SERVICE_ACCOUNT_BASE64` in the production `.env` on Linode

### Remediation Applied
- `middleware/firebaseApp.js`: Removed dynamic `require()` path; replaced with 4-strategy chain (base64 env var → JSON env var → ADC → local file dev-only)
- `.gitignore`: Added patterns to block all service account JSON filename variants
- Production `.env`: `FIREBASE_SERVICE_ACCOUNT_BASE64` set with new key

### Residual Risk
- The old key `d7f03...` is revoked and cannot be used. RESOLVED.
- The new key is stored in `.env` on Linode. `.env` file permissions must be verified (see P1-2 in risk register).

---

## Incident 2: SSH Keys in Repository

**Status:** OPEN — REQUIRES ASSESSMENT

### Background
A prior audit (see `project_gethired.md` memory entry) flagged that SSH keys may have been committed to git history. The `package.json` still contains scripts referencing `keys/eucanna-ssh` and `keys/gethired_rsa`, and the `keys/` directory is in `.gitignore`.

### Current Status
- `keys/` directory is in `.gitignore` — no new key files can be committed
- The git history has not been audited to confirm whether SSH private keys were committed in the past
- The referenced IP address (`206.81.16.32`) is stale (current Linode IP is `139.162.11.242`)

### Required Action
```bash
# Run locally to assess historical commits:
git log --all --full-history -- 'keys/*'
git log --all --full-history -- '**/*.pem' '**/*.key' '**/*.rsa'
```

If any SSH private key was committed:
1. Rotate/revoke the key on all servers it accessed
2. Remove from git history (`git filter-repo` or BFG)
3. Force-push (coordinate with all contributors)
4. Invalidate any cached versions on GitHub

### Severity: P1 — if confirmed in history; Low — if history scan shows no commits

---

## Incident 3: Stale SSH IP Reference in package.json

**Status:** LOW — Administrative cleanup

The `package.json` npm scripts reference `root@206.81.16.32` (old IP). The current production server is `root@139.162.11.242`. These scripts are not used in CI/CD (deployment is via SSH git remote + PM2). Recommend removing the stale scripts to avoid confusion.

---

## Secret Scanning Coverage

The `tools/check-secrets.sh` script covers:
- `BEGIN PRIVATE KEY` / `RSA PRIVATE KEY` headers
- Firebase `"private_key":` field
- Service account JSON filename patterns
- Credential/secrets JSON filename references
- Suspiciously long base64 blobs (>200 chars)

**Gap:** The script does not scan for:
- PayMongo secret key patterns (`sk_live_`, `sk_test_`)
- SendGrid API key patterns (`SG.`)
- PostgreSQL connection string with embedded password
- Generic AWS/GCP patterns

**Recommendation:** Extend `check-secrets.sh` to include these patterns.
