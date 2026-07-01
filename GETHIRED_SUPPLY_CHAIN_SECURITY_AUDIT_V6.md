# GETHIRED SUPPLY CHAIN SECURITY AUDIT — V6
**Date:** 2026-07-01 | **No new supply chain changes in V6 delta**

---

## V6 Delta Assessment

LinkedIn OIDC uses no new npm packages. No changes to `package.json` or `package-lock.json` are required for this feature.

---

## Supply Chain Status (carried from V5)

| Control | Status |
|---|---|
| package-lock.json present | YES — integrity checksums |
| npm audit (critical/high) | Last run V4 — should re-run before production deploy |
| No direct CDN imports in BE | PASS |
| FE Angular — no new dependencies | No new packages added in LinkedIn OIDC FE |
| Dependency pinning | package.json uses `^` (caret) versions — moderate risk |
| Subresource Integrity on FE assets | NOT implemented — P3 |
| GitHub Actions supply chain | Not audited in this run |

---

## Recommendations
- Run `npm audit --audit-level=high` in BE before next production deploy
- Consider pinning exact versions in package.json for auth-critical packages (jsonwebtoken, firebase-admin, express)
- Add npm audit to CI/CD pipeline as a blocking step
