# GETHIRED SECURE RELEASE GATE — V6
**Date:** 2026-07-01

---

## Release Gate Decision: GO WITH CAUTION

---

## P0 Gate

| Check | Result |
|---|---|
| No exposed secrets in code | PASS |
| No unauthenticated sensitive data access | PASS |
| No BOLA across users | PASS |
| No SQLi on sensitive tables | PASS |
| Payment webhook signature verified | PASS (code done; requires env var in prod) |
| Broken auth — LinkedIn flow | PASS (main flow; pending token single-use gap is P1 not P0) |
| Git history secrets | FAIL — Firebase SA + SSH key still in history |

P0 gate: **FAIL on git history.** LinkedIn OIDC itself passes P0. Git history issue predates V6 and is an ongoing ops action.

---

## P1 Gate

| Check | Result |
|---|---|
| LI-SEC-001 pending token replayable | OPEN — fix recommended before launch |
| CORS not wildcard | OPEN — ongoing |
| authLimiter on LinkedIn routes | OPEN — fix recommended before launch |
| Node.js EOL | OPEN — ops action |

P1 gate: **CAUTION.** Two P1 items should be resolved before LinkedIn OIDC goes live:
1. LI-SEC-001 (pending token single-use via oauth_tickets)
2. authLimiter on LinkedIn endpoints

---

## P2/P3 Gate

| Check | Result |
|---|---|
| LI-SEC-002 (shared JWT secret) | OPEN P2 — acceptable for launch, fix in fast-follow |
| LI-SEC-003 (nonce double-condition) | OPEN P2 — fix in fast-follow |
| LI-SEC-004 (choose-role empty names) | OPEN P3 — UX issue, not security |
| PD-003 (soft-delete for unlink) | OPEN P3 |
| Structured audit log | OPEN P2 |
| oauth_tickets cleanup cron | OPEN P2 |

P2/P3 gate: ACCEPTABLE for launch with awareness.

---

## Release Decision by Component

| Component | Decision | Condition |
|---|---|---|
| LinkedIn OIDC (core flow) | GO WITH CAUTION | Apply LI-SEC-001 fix + authLimiter before launch |
| LinkedIn OIDC (role_required) | HOLD | LI-SEC-001 affects this path specifically |
| Company Setup Success Modal | GO | No security issues found |
| PayMongo Webhook | GO WITH CAUTION | Requires PAYMONGO_WEBHOOK_SECRET in prod env |
| Overall GetHired Platform | GO WITH CAUTION | Ongoing: CORS, git history, Node.js version |

---

## Definition of Done for LinkedIn OIDC Launch
1. LI-SEC-001 fix applied and tested (pending token stored in oauth_tickets)
2. authLimiter applied to /start, /complete, /choose-role
3. All env vars confirmed set in production
4. auth_identities and oauth_tickets tables confirmed in production DB
5. TC-LI-001 through TC-LI-012 smoke tests passed in staging
