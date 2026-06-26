# GetHired — Dependency & Runtime Security Audit (SECURE 3)
**Date:** 2026-06-26

---

## Runtime Environment

| Component | Version/Status |
|---|---|
| Node.js | Not specified; PM2 manages process |
| Express | `^4.18.1` |
| ESM | `3.2.25` (pinned) |
| PM2 | Unknown version; manages `gethired` process |
| OS | Linode (Linux), production |

---

## High-Priority Dependencies

### `esm@3.2.25` — Supply Chain Assessment

**Status:** Unmaintained (last release 2019). Bundles Acorn 6.x JavaScript parser internally.

**CVE scan:** No known active CVEs specifically targeting `esm` package. Acorn 6.x has had parsing edge cases but no known remote code execution vulnerabilities.

**Supply chain risk:** The package is pinned at an exact version (3.2.25 via `^`). However, `^3.2.25` allows minor/patch updates which could introduce supply chain attacks if the npm package is compromised. The package has 10M+ weekly downloads (high-value target).

**Recommendation:** Pin exactly (`"esm": "3.2.25"`) with `package-lock.json` committed and verified. Long-term: migrate to native ESM (Node.js 18+ supports it natively).

### `jsonwebtoken@^8.5.1`

Multiple CVEs in 8.x including algorithm confusion attacks. The app uses Firebase JWT verification (not this package directly for auth), but if any code path uses `jsonwebtoken` directly, it should be audited.

**Check:** `jsonwebtoken` appears in dependencies but Firebase JWT verification uses `firebase-admin` SDK, not this package. Confirm no direct `jsonwebtoken` usage in app code.

### `axios@^0.27.2`

**CVE:** CSRF vulnerability in Axios before 1.6.0 (CVE-2023-45857). The BE uses axios for PayMongo API calls (server-side), not user-facing CSRF-sensitive requests. Server-side CSRF is generally not applicable. However, upgrading is still recommended.

### `request@^2.88.2`

Deprecated by maintainers. Known vulnerabilities. Should be replaced with `axios` (already installed) or Node.js native `fetch` (Node 18+).

### `firebase-admin@^10.0.0`

Version 10.x is relatively old. Firebase Admin 11.x+ includes security and performance improvements. Upgrade recommended.

### `firebase@^9.14.0`

Firebase SDK 9.x (modular API). Current as of audit time; no critical CVEs noted.

### `multer@^1.4.5-lts.1`

LTS branch maintained for security fixes. Installed but NOT wired to any route (all uploads use base64-in-JSON). No active attack surface from this package.

### `bcrypt@^5.0.1` + `bcryptjs@^2.4.3`

Both installed (unnecessary duplication). `bcrypt` is the native binding; `bcryptjs` is pure JS fallback. Using both wastes install size. No CVEs noted for these versions.

---

## Dependabot Vulnerability Summary

**Confirmed count from prior report:** 114 vulnerabilities (6 critical, 61 high, as of last GitHub scan)

**Triage approach:**
1. Critical (6): Likely `request`, `jsonwebtoken`, `babel-polyfill` related — assess impact and upgrade
2. High (61): Mix of transitive dependencies — use `npm audit` to identify upgrade paths
3. Medium/Low (47): Transitive; lower priority

**Recommended sprint:**
```bash
npm audit                       # see full list
npm audit fix                   # fix safe auto-upgrades
npm audit fix --force           # force-fixes breaking changes (test carefully)
```

---

## Runtime Security

### PM2 Configuration
- No `ecosystem.config.js` (good — no secrets in committed file)
- PM2 started manually — no auto-restart configuration beyond PM2 defaults
- PM2 logs to `be_out.log` and `be_error.log`

### Node.js Process Isolation
- Single process (no clustering); adequate for current load
- No CPU/memory limits set on PM2 process (DoS risk if memory leak occurs)

### Trust Proxy
`app.enable('trust proxy')` — trusts one proxy hop. Correct if nginx is in front. Risky if Express is directly internet-exposed (see threat model).

---

## Summary

| Package | Risk Level | Action |
|---|---|---|
| `esm@3.2.25` | MEDIUM | Pin exact version; plan migration to native ESM |
| `jsonwebtoken@8.5.1` | MEDIUM | Audit direct usage; upgrade to 9.x |
| `axios@0.27.2` | MEDIUM | Upgrade to 1.x |
| `request@2.88.2` | HIGH | Replace with axios (already installed) |
| `firebase-admin@10.x` | LOW | Upgrade to 12.x |
| `bcrypt` + `bcryptjs` duplication | LOW | Remove one |
| `babel-polyfill@6.x` | MEDIUM | EOL; evaluate removal |
| 114 total Dependabot vulns | HIGH | Sprint needed before public launch |
