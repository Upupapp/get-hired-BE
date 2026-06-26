# GetHired — Supply Chain Security Audit (SECURE 3)
**Date:** 2026-06-26

---

## Deployment Supply Chain

```
GitHub repo (Upupapp/get-hired-BE)
  │
  ├─ SSH deploy key (Ed25519, gethired_deploy, read-only)
  │   └─ Configured via /root/.ssh/config → git@github.com:Upupapp/get-hired-BE.git
  │
  └─ Linode /var/www/_work/get-hired-BE/
       └─ git pull → npm install → pm2 restart gethired
```

### Deploy Key Security
- Ed25519 key at `/root/.ssh/gethired_deploy` on Linode
- GitHub key (`gethired-deploy-linode`) is read-only (cannot push)
- SSH config routes github.com to this specific key
- **Risk:** If Linode is compromised, attacker has read access to private repo

### npm install Trust
- `package-lock.json` should be committed and used (`npm ci` in CI instead of `npm install`)
- If `npm install` is used in production deploy, minor version updates can silently introduce new packages
- **Recommendation:** Use `npm ci --only=production` in deployment script

---

## GitHub Repository Security

| Control | Status | Notes |
|---|---|---|
| Deploy key (read-only) | PRESENT | Ed25519 key configured |
| Branch protection on main | UNKNOWN | Cannot verify from local |
| Required PR reviews | UNKNOWN | Cannot verify from local |
| GitHub Actions secrets | UNKNOWN | FE deploy workflow needs secrets (per memory) |
| Dependabot alerts | ACTIVE | 114 alerts confirmed |
| Secret scanning | ACTIVE | Auto-revoked Firebase key demonstrates this works |

---

## Dependency Integrity

| Control | Status |
|---|---|
| `package-lock.json` committed | Should be verified — not confirmed committed |
| Integrity hashes in lock file | Standard npm behavior when lock file present |
| Pinned vs range versions | All use `^` ranges (minor updates allowed) |
| Private registry | None — all packages from public npm |

---

## Third-Party Services

| Service | Data shared | Security controls |
|---|---|---|
| Firebase (Auth + Admin) | User credentials, UIDs | Service account credential chain; key rotation completed |
| Firebase Storage | CV files, images, video CVs | Auth-gated upload; storage rules (unaudited) |
| PayMongo | Payment data | HMAC webhook signature; SK in env var |
| SendGrid | Email addresses, invite content | API key in env var; no email content in code |
| Google Indexing API | Job URLs only | Disabled by default; no PII involved |
| Supabase (PostgreSQL) | All app data | TLS connection; credentials in env var |

---

## esm Package Trust Assessment

`esm@3.2.25` (2019) is the most concerning dependency:
- **Unmaintained** — no security patches if vulnerability is found
- **Deep integration** — used as the `require` hook for ES module support (`node -r esm start.js`)
- **Bundled parser** — contains Acorn 6.x; if Acorn had a parsing DoS CVE, esm inherits it
- **10M+ weekly downloads** — high-value target for supply chain attack

**Mitigations:**
1. `package-lock.json` pins the exact published checksum of `esm@3.2.25`
2. npm's package integrity validation (SHA-512) confirms the downloaded package matches
3. No known active CVE for this exact version

**Long-term action:** Migrate to native Node.js ESM (supported natively since Node 12; stable since Node 16). This eliminates `esm` entirely.

---

## Summary

| Area | Status |
|---|---|
| Deploy key (read-only SSH) | PASS |
| npm ci vs npm install | UNVERIFIED — recommend npm ci |
| package-lock.json committed | SHOULD VERIFY |
| Dependency version pinning | RANGE PINNED (^) — tighter pinning recommended |
| GitHub repo protection | UNVERIFIED |
| Third-party service credentials | PASS (in env vars, not code) |
| `esm` supply chain risk | ACCEPTED — monitor; plan migration |
