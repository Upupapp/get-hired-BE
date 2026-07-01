# GETHIRED LOGGING & AUDITABILITY AUDIT — V6
**Date:** 2026-07-01 | **Focus:** LinkedIn OIDC logging

---

## LinkedIn OIDC Logging Review

| Event | Logged? | Log Content | PII Logged? | Assessment |
|---|---|---|---|---|
| LinkedIn callback received | YES | `[linkedin/callback] uid=<12char> status=<status>` | NO (uid truncated) | PASS |
| LinkedIn user created | YES | `[linkedin] created user uid=<12char> role=<n>` | NO | PASS |
| LinkedIn complete authenticated | YES | `[linkedin/complete] authenticated uid=<12char>` | NO | PASS |
| LinkedIn choose-role created | YES | `[linkedin/choose-role] created uid=<12char> role=<n>` | NO | PASS |
| LinkedIn unlink | YES | `[linkedin/unlink] uid=<8char>` | NO | PASS |
| LinkedIn callback error | YES | Error type + LinkedIn API status/data (truncated to 200 chars) | Possible (LinkedIn error data) | LOW RISK |
| LinkedIn complete error | YES | Error message truncated to 120 chars | Possible | LOW RISK |
| State invalid | NO | Redirect to error URL only | N/A | PASS |
| Ticket invalid | NO | HTTP 400 only | N/A | PASS |

---

## Auditability Gaps

### LOG-001 (P2) — No Structured Security Audit Log
All logging uses `console.log`/`console.error`. There is no structured security event log (e.g., a DB table or external SIEM). Events that should be auditable include:
- LinkedIn account creation (who, when, role)
- LinkedIn account linking to existing account
- LinkedIn account unlinking
- Repeated failed ticket redemptions (potential replay attack)

### LOG-002 (P3) — No unlink_at Audit Trail in DB
`linkedinUnlink` hard-deletes the identity row. The schema has an `unlinked_at` column in `auth_identities` but it's never set. Recommend soft-delete: `UPDATE auth_identities SET unlinked_at=NOW() WHERE user_uid=$1 AND provider='linkedin'`.

### LOG-003 (P2) — Repeated `/complete` Failures Not Tracked
If an attacker floods `/complete` with random ticket JWTs, each attempt logs a `[linkedin/complete] error` but there is no structured counter or alerting. The global rate limiter provides some protection.

---

## V5 Logging Status (carried forward)

| Finding | Status |
|---|---|
| No structured audit log | STILL OPEN P2 |
| console.log PII truncation | VERIFIED in LinkedIn code |
