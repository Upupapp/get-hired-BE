# GETHIRED OBJECT-LEVEL AUTHORIZATION AUDIT (BOLA/IDOR) — V6
**Date:** 2026-07-01 | **Focus:** LinkedIn OIDC new objects

---

## New Objects Introduced — LinkedIn OIDC

### auth_identities Table
| Operation | Route | Scoping | Finding |
|---|---|---|---|
| INSERT identity | linkedinCallback (public) | Scoped to authenticated LinkedIn sub + email — no user-supplied uid | PASS |
| UPDATE identity (last_login_at) | linkedinCallback (public) | Scoped to `provider='linkedin' AND provider_subject=$1` (liSub from LinkedIn) | PASS |
| SELECT identity | linkedinChooseRole (pending token) | Scoped to `provider='linkedin' AND provider_subject=$1` (liSub from pending token) | PASS |
| DELETE identity | linkedinUnlink (verifyAuth) | Scoped to `user_uid=$1 AND provider='linkedin'` where $1=req.user.uid | PASS |
| SELECT identity | linkedinLinkStatus (verifyAuth) | Scoped to `user_uid=$1` where $1=req.user.uid | PASS |

No BOLA found on auth_identities. The unlink and link-status routes correctly scope to the authenticated user's uid from the Firebase token, not from user-supplied input.

### oauth_tickets Table
| Operation | Route | Scoping | Finding |
|---|---|---|---|
| INSERT ticket | linkedinCallback (public) | JTI is server-generated (crypto.randomBytes(24)) | PASS |
| SELECT+UPDATE ticket (consume) | linkedinComplete (ticket JWT) | Scoped to `jti=$1` where jti comes from JWT payload (signed) | PASS |

No BOLA found on oauth_tickets. The JTI is not user-guessable and the JWT signature prevents forgery.

### user_credentials / users Tables (LinkedIn-created)
| Operation | Route | Scoping | Finding |
|---|---|---|---|
| INSERT user | createLinkedinUser | uid derived as `sha256('linkedin:'+liSub)` — deterministic, not user-supplied | PASS |
| SELECT user | linkedinComplete | uid from ticket data (DB-retrieved, server-side) | PASS |

---

## Previously Audited BOLA Findings (V5) — Status

| Finding | Status |
|---|---|
| Employer job BOLA (getUserCompanyForRequest pattern) | FIXED V2 — HOLDING |
| Application BOLA (applicant scoping) | FIXED V2 — HOLDING |
| Company settings BOLA | FIXED V2 — HOLDING |

---

## Summary
No new BOLA/IDOR vulnerabilities found in the LinkedIn OIDC implementation. All object-level authorization is properly scoped to the authenticated principal (Firebase uid or LinkedIn sub from server-verified sources).
