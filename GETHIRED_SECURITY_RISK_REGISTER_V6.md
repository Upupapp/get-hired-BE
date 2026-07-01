# GETHIRED SECURITY RISK REGISTER — V6
**Date:** 2026-07-01 | **Cumulative since V1**

| ID | Severity | Area | Title | Status | Version Found | Version Fixed |
|---|---|---|---|---|---|---|
| LI-SEC-001 | P1-High | LinkedIn OIDC | linkedinPendingToken not stored in oauth_tickets (replayable) | OPEN | V6 | — |
| LI-SEC-002 | P2 | LinkedIn OIDC | Shared JWT secret for state, ticket, and app session JWTs | OPEN | V6 | — |
| LI-SEC-003 | P2 | LinkedIn OIDC | ID token nonce check doubly conditional — can silently skip | OPEN | V6 | — |
| LI-SEC-004 | P3 | LinkedIn OIDC | choose-role fallback fields (email/name) always empty | OPEN | V6 | — |
| GA-SEC-001 | P1 | Google Auth | requestUri: 'http://localhost' in signInWithIdp REST call | FIXED | V5 | V5 |
| GA-SEC-002 | P1-Low | Google Auth | In-memory IP rate limit resets on PM2 restart | OPEN (accepted) | V5 | — |
| GA-SEC-003 | P2 | Google Auth | No provider column — Google vs email accounts indistinguishable | OPEN (backlog) | V5 | — |
| CORS-001 | P1 | App | app.use(cors()) — wide-open, no origin allowlist | OPEN | V1 | — |
| GIT-001 | P0 | Secrets | Firebase SA JSON + SSH keys in git history | OPEN | V1 | — |
| PAYMONGO-001 | P0 | Payments | Webhook signature verification missing | RESOLVED (code done) | V1 | V6 (code) |
| BOLA-001 | P0 | Authorization | Employer BOLA on job/application routes | FIXED | V2 | V2 |
| SQLI-001 | P0 | Database | Raw SQL interpolation in 8 controllers | FIXED | V2 | V2 |
| INVITE-001 | P0 | Auth | Hardcoded invite password | FIXED | V2 | V2 |
| UPLOAD-001 | P1 | File Upload | No MIME magic-byte check | FIXED | V3 | V3 |
| MSG-001 | P2 | Messaging | No message body length cap | FIXED | V3 | V3 |
| RATE-001 | P1 | Abuse | No rate limiting on Easy Job Post AI extraction | OPEN | V4 | — |
| RAWBODY-001 | P1 | Payments | rawBody not preserved for webhook sig check | FIXED | V5 | V5 |

---

## Risk Summary by Severity

| Severity | Total | Open | Fixed/Resolved |
|---|---|---|---|
| P0 | 4 | 1 (GIT-001) | 3 |
| P1 | 6 | 3 (LI-SEC-001, CORS-001, RATE-001) | 3 |
| P2 | 5 | 4 | 1 |
| P3 | 1 | 1 | 0 |

---

## Notes
- PAYMONGO-001: code is complete and correct; requires `PAYMONGO_WEBHOOK_SECRET` env var set in production to be operationally active.
- GIT-001: Firebase SA JSON and SSH private key are in git history. Credentials should be considered compromised until rotated and history purged.
- LI-SEC-001: exploitability is low (attacker needs to intercept the `linkedinPendingToken` from URL or network), but the fix is low-effort and should ship with the feature.
