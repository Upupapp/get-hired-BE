# GETHIRED FUNCTION-LEVEL AUTHORIZATION AUDIT — V6
**Date:** 2026-07-01 | **Focus:** LinkedIn OIDC function access control

---

## LinkedIn OIDC Function Audit

### linkedinStart
- Access: Public (no auth required)
- Risk: Low — only generates a state and redirects to LinkedIn. No sensitive data returned.
- Admin escalation possible? NO — no data returned, no DB writes at this stage.
- Assessment: PASS

### linkedinCallback
- Access: Public (LinkedIn-initiated redirect)
- Risk: Medium — creates users, issues tickets
- Protection: State JWT prevents CSRF; LinkedIn code is single-use
- Admin escalation possible? NO — role mapping enforced in createLinkedinUser
- Assessment: PASS

### linkedinComplete
- Access: Public (ticket-gated)
- Risk: Medium — returns Firebase ID token (auth credential)
- Protection: Ticket JWT verified + DB single-use consumption
- Admin escalation possible? NO — role from DB, not from ticket claims used in auth decision
- Assessment: PASS (subject to LI-SEC-001 fix for pending flow)

### linkedinChooseRole
- Access: Public (pending token-gated)
- Risk: Medium — creates new users, returns Firebase ID token
- Protection: Pending token JWT signed; role mapped server-side
- Admin escalation possible? NO — only roles 2 and 3 accepted
- Weakness: Pending token not DB-backed (LI-SEC-001)
- Assessment: CAUTION — fix LI-SEC-001

### linkedinUnlink
- Access: Protected (verifyFirebaseIdToken)
- Risk: Low — removes LinkedIn identity link
- Protection: Firebase token + scope to req.user.uid
- Could unlink another user? NO — WHERE clause scoped to req.user.uid
- Assessment: PASS

### linkedinLinkStatus
- Access: Protected (verifyFirebaseIdToken)
- Risk: Low — read-only, returns linkage status
- Could read another user's status? NO — WHERE clause scoped to req.user.uid
- Assessment: PASS

---

## Function-Level Authorization Summary

| Function | Auth Type | Admin Block | Own-Only Scope | Result |
|---|---|---|---|---|
| linkedinStart | Public | N/A | N/A | PASS |
| linkedinCallback | LinkedIn state | YES | N/A | PASS |
| linkedinComplete | Ticket JWT | YES | N/A | PASS |
| linkedinChooseRole | Pending JWT | YES | N/A | CAUTION (LI-SEC-001) |
| linkedinUnlink | Firebase token | YES | YES (req.user.uid) | PASS |
| linkedinLinkStatus | Firebase token | YES | YES (req.user.uid) | PASS |

All functions correctly block role-1 (admin) creation. No horizontal privilege escalation found. LI-SEC-001 is the only remaining concern.
