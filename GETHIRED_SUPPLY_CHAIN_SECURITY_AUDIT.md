# GETHIRED SUPPLY CHAIN SECURITY AUDIT — QA Cycle 11
Generated: 2026-06-25

---

## Supply Chain Attack Surface

| Attack Vector | Exposure | Risk |
|--------------|---------|------|
| Malicious npm package (typosquat) | 515 packages scanned | MEDIUM |
| Compromised transitive dependency | bcrypt chain, axios, request | MEDIUM |
| CI/CD pipeline injection | GitHub Actions (deploy workflow recently added) | LOW-MEDIUM |
| GCP service account compromise | Keys in git history | HIGH (EA-01/02) |
| Compromised Firebase project | Firebase Admin key exposed | HIGH (EA-01/02) |
| npm registry tampering | package-lock.json present | LOW (locked versions) |
| Malicious GitHub Actions action | Using 3rd-party actions in FE deploy workflow | MEDIUM |

---

## Package Integrity

### package-lock.json
`package-lock.json` is present — confirmed. This pins exact versions of all transitive dependencies. Running `npm ci` (vs `npm install`) during deployment ensures only locked versions are installed.

**Verification:** Are deployments using `npm ci` or `npm install`?
- `app.yaml` and `start.js` not read in detail — unknown. Recommend switching to `npm ci` in the deploy script.

### No package integrity checking (SRI / npm signatures)
npm does not enforce package signature verification by default. Integrity hashes are in `package-lock.json` (integrity field) and npm verifies these on install.

**Status:** PARTIAL — package-lock.json provides integrity checking via npm's built-in hash verification. This is industry standard for Node.js projects.

---

## GCP/Firebase Service Account Keys

As documented in `GETHIRED_SECRET_INCIDENT_REPORT.md`:
- `gethired-serviceAccountKey.json` and `jobhunt-serviceAccountKey.json` in repo root
- These represent the highest supply chain risk: anyone with repo access can impersonate the service account
- **Status:** OPEN P1 — external action required (EA-01, EA-02)

---

## GitHub Actions Workflow (FE Deploy)

A GitHub Actions workflow was added this session (`1f60f78`). Supply chain risks in GitHub Actions:
1. **Third-party actions:** If the workflow uses `actions/checkout@v3` or similar, pinning by commit hash (not tag) is recommended to prevent tag mutable attacks
2. **Secrets in workflow:** `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY` must be set as GitHub repository secrets (not hardcoded)
3. **Artifact integrity:** If the build artifact is passed between jobs, ensure no tampering between build and deploy steps

**Status:** FE deploy workflow needs secrets configured before it can run. This is documented in `project_gethired_fe_deploy_pending.md`.

---

## Dependency Vetting Status

| Package | Maintained | Source |
|---------|-----------|--------|
| express | YES | OpenJS Foundation |
| firebase-admin | YES | Google |
| firebase | YES | Google |
| @sendgrid/mail | YES | Twilio/SendGrid |
| pg | YES | Active community |
| bcrypt | YES (but has vuln chain) | Community |
| bcryptjs | YES | Community |
| axios | YES | Community |
| multer | PARTIAL — LTS only | Community |
| request | NO — DEPRECATED | Community |
| moment | SOFT DEPRECATED | Community (maintenance only) |
| querystring | DEPRECATED | Built-in Node.js equivalent exists |

---

## Recommendations

1. **EA-01/02:** Rotate service account keys immediately (supply chain critical path)
2. **Replace deprecated packages:** `request` → `axios`; `querystring` → Node.js built-in `URLSearchParams`; `moment` → `date-fns` or native `Intl.DateTimeFormat`
3. **Use `npm ci` in deploy:** Ensures package-lock.json integrity is honored; prevents accidental `package.json` range resolution to unexpected versions
4. **Pin GitHub Actions by commit hash:** Change `uses: actions/checkout@v3` to `uses: actions/checkout@abc123def` (specific commit)
5. **Enable Dependabot** on the GitHub repo to receive automated PRs for dependency security updates
