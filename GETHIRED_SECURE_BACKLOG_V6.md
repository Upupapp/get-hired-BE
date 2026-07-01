# GETHIRED SECURE BACKLOG — V6
**Date:** 2026-07-01 | **Cumulative — all open security items**

---

## P0 — Must Fix Before Launch

| ID | Title | File | Action |
|---|---|---|---|
| GIT-001 | Firebase SA JSON + SSH key in git history | BE repo git history | Rotate credentials; purge history with BFG |

---

## P1 — Fix Before LinkedIn OIDC Launch

| ID | Title | File | Action |
|---|---|---|---|
| LI-SEC-001 | linkedinPendingToken not stored in oauth_tickets (replayable) | linkedinAuthController.js, linkedinComplete | Store pending token JTI in oauth_tickets; consume in choose-role |
| CORS-001 | Wide-open cors() | server.js | Replace app.use(cors()) with allowlist |
| RATE-LI-001 | No authLimiter on LinkedIn auth routes | routes/linkedinAuthRoutes.js | Apply authLimiter to /start, /complete, /choose-role |
| RATE-001 | No rate limit on Easy Job Post AI extraction | jobController.js (or routes) | Add per-IP rate limit |
| NODE-001 | Node.js 14 (EOL) on local/production | infrastructure | Upgrade to Node 18 LTS |

---

## P2 — Fix in Fast-Follow Sprint

| ID | Title | File | Action |
|---|---|---|---|
| LI-SEC-002 | Shared JWT secret for state, tickets, and app sessions | middleware/linkedinSession.js, env.js | Add LINKEDIN_STATE_SECRET env var; use it in createLinkedinState/makeTicketJwt |
| LI-SEC-003 | ID token nonce check doubly conditional | linkedinAuthController.js line ~210 | Change `if (nonce && p.nonce && ...)` to `if (nonce && p.nonce !== nonce)` |
| GA-SEC-002 | In-memory IP rate limit in Google Auth (resets on restart) | googleAuthController.js | Replace manual Map with express-rate-limit |
| GA-SEC-003 | No provider column in user_credentials | user_credentials table | Add migration to add provider column ('email'|'google'|'linkedin') |
| LOG-001 | No structured security audit log | (new service needed) | Create security_events table or structured log |
| LOG-003 | Repeated /complete failures not tracked | linkedinAuthController.js | Add counter or alert on repeated failures per IP |
| PD-001 | oauth_tickets.data stores full PII blob | oauth_tickets table | Consider encrypting data field or minimizing stored fields |
| PD-002 | LinkedIn full name stored redundantly | auth_identities.provider_name | Acceptable for now; document for future data minimization |
| AUDIT-001 | oauth_tickets cleanup not automated | createAuthIdentitiesTable.js | Add pg_cron or PM2 cron to clean expired rows hourly |
| PAYMONGO-ENV | PAYMONGO_WEBHOOK_SECRET not confirmed set in prod | .env (production) | Ops: set env var |
| PAYMONGO-TABLE | payment_webhook_events not confirmed migrated | DB | Run db/payment_webhook_events_ddl.sql |

---

## P3 — Future Hardening

| ID | Title | Action |
|---|---|---|
| LI-SEC-004 | choose-role fallback names always empty | Embed user profile in pending token payload |
| PD-003 | Unlink hard-deletes (no audit trail) | Soft-delete: set unlinked_at instead of DELETE |
| LOG-002 | unlinked_at never set | Use soft-delete for linkedinUnlink |
| CSP-001 | No Content-Security-Policy header | Add helmet CSP configuration |
| NOSNIFF-001 | X-Content-Type-Options: nosniff not verified | Verify helmet is configured |
| SRI-001 | No Subresource Integrity on FE assets | Add SRI hashes to index.html CDN imports |
| VIDEO-001 | No video upload magic-byte check | Add MIME check for video uploads |
| SUPPLY-001 | npm audit not in CI | Add npm audit --audit-level=high to GitHub Actions |
| SUPPLY-002 | Package versions use caret (^) | Pin exact versions for auth-critical packages |
| PKCE-DOC | PKCE removal not documented in route file | Add comment to linkedinAuthRoutes.js explaining confidential client |

---

## Completed / Resolved (V1–V6)

| ID | Title | Fixed In |
|---|---|---|
| BOLA-001 | Employer BOLA on job/application routes | V2 |
| SQLI-001 | SQLi in 8 controllers | V2 |
| INVITE-001 | Hardcoded invite password | V2 |
| UPLOAD-001 | No MIME magic-byte check | V3 |
| MSG-001 | No message body length cap | V3 |
| RAWBODY-001 | rawBody not preserved for PayMongo | V5 |
| GA-SEC-001 | requestUri: 'http://localhost' | V5 |
| PAYMONGO-001 | Webhook signature verification code | V6 (code complete) |
