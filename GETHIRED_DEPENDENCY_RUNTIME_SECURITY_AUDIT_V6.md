# GETHIRED DEPENDENCY & RUNTIME SECURITY AUDIT — V6
**Date:** 2026-07-01 | **New dependencies in V6 delta**

---

## New Dependencies Used by LinkedIn OIDC

| Package | Usage | Already in package.json? | Notes |
|---|---|---|---|
| `jsonwebtoken` | State JWT + ticket JWT signing/verification | YES (used by existing auth) | PASS |
| `axios` | LinkedIn token exchange + userinfo call | YES (used throughout BE) | PASS |
| `crypto` | randomBytes, createHash, timingSafeEqual | Node.js built-in | PASS |

No new npm packages added for LinkedIn OIDC. All dependencies are existing.

---

## Runtime Assessment

### Node.js Version
- Local dev: Node 14 (per memory: nvm + Node 14 for GetHired BE)
- Node 14: EOL April 2023 — **P1 finding (carried from V5)**
- Production Linode: version unknown — must verify
- Recommendation: Upgrade to Node.js 18 LTS or 20 LTS

### PM2 Cluster Mode
- 2 workers confirmed
- LinkedIn ticket DB-backed single-use pattern correctly handles multi-worker scenario
- State JWTs are stateless (no worker affinity needed)
- Recommendation: oauth_tickets cleanup must handle cross-worker expiry (currently relies on manual script run)

---

## V5 Dependency Status (carried forward)

| Package | Issue | Status |
|---|---|---|
| All packages | npm audit results | Not re-run this session (no new packages added) |
| Node 14 | EOL runtime | OPEN P1 |
| firebase-admin | Version | Not changed |
| express | Version | Not changed |
