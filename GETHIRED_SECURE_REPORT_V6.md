# GETHIRED SECURE REPORT — LinkedIn OIDC + Full System V6
**Date:** 2026-07-01 | **Baseline:** V5 (2026-07-01) | **Delta:** LinkedIn OIDC surface + Company Setup Success Modal

---

## Executive Summary

This V6 audit covers the new LinkedIn OIDC integration (6 endpoints, 2 new DB tables, stateless JWT state, DB-backed one-time tickets), the EmployerCompanySetupSuccessModal, and verifies all V5 findings still hold.

The LinkedIn OIDC architecture is substantially sound: state is a signed short-lived JWT preventing CSRF, tickets are DB-backed single-use preventing replay across PM2 cluster workers, and LinkedIn tokens never leave the server. Three security findings are raised:

- **LI-SEC-001 (P1-High):** The `linkedinPendingToken` issued for the `role_required` path is a second ticket JWT but is NOT stored in `oauth_tickets` — it can be replayed multiple times during its 5-minute window, allowing a race to create duplicate accounts or probe the `choose-role` endpoint without a true single-use guarantee.
- **LI-SEC-002 (P2):** State JWT and ticket JWTs share the same signing secret (`env.secret`) as the main app JWT. While the payloads are structurally distinct (state JWTs have `cv`/`nc` claims, tickets have `jti`/`uid`), a crafted ticket JWT with forged claims could potentially be submitted as a `state` parameter and vice versa. Recommend separate `LINKEDIN_STATE_SECRET` env var.
- **LI-SEC-003 (P2):** ID token from LinkedIn is decoded without signature verification (`jwt.decode` not `jwt.verify`) at line 203. The comment notes that `userinfo` is the authoritative source, which mitigates this — but the nonce check (replay protection) is conditional (`if (nonce && p.nonce && p.nonce !== nonce)`). Both conditions must be true for the check to fire. If LinkedIn does not include a nonce in the ID token, this silently passes.
- **LI-SEC-004 (P3):** `linkedinChooseRole` falls back to `pendingPayload.email/firstName/lastName` fields — but `makeTicketJwt` at line 408 of the controller only passes `uid`, `status`, `intent`, `returnTo`, and `roleRequired` to the JWT payload. No email/firstName/lastName are embedded. The fallback at lines 508–510 will always get empty strings for these fields, meaning new users created via `choose-role` will have blank name/email in the DB until corrected.

The Company Setup Success Modal is clean: no backend calls, `window.open` uses `noopener`, `router.navigate` uses internal paths only, `sessionStorage` write is in a try/catch.

**PayMongo webhook signature verification is now implemented** (verifyPaymongoSignature function verified, timing-safe comparison, replay window check, idempotency ledger). The P0 from V4/V5 is RESOLVED subject to `PAYMONGO_WEBHOOK_SECRET` being set in production `.env`.

**Release Gate: GO WITH CAUTION** — LinkedIn OIDC is functionally safe for launch with LI-SEC-001 fix applied (low-effort). LI-SEC-002/003/004 are P2/P3 and can follow in a fast-follow release.

---

## V6 Finding Summary

| ID | Severity | Area | Title | Status |
|---|---|---|---|---|
| LI-SEC-001 | P1-High | LinkedIn OIDC | `linkedinPendingToken` not stored in oauth_tickets (replayable) | OPEN |
| LI-SEC-002 | P2 | LinkedIn OIDC | Shared JWT secret for state, tickets, and app sessions | OPEN |
| LI-SEC-003 | P2 | LinkedIn OIDC | ID token nonce check is doubly conditional (can silently skip) | OPEN |
| LI-SEC-004 | P3 | LinkedIn OIDC | choose-role fallback email/name fields always empty | OPEN |
| GA-SEC-001 | P1 | Google Auth | requestUri: 'http://localhost' | FIXED in V5 |
| GA-SEC-002 | P1-Low | Google Auth | In-memory IP rate limit resets on restart | OPEN (documented) |
| GA-SEC-003 | P2 | Google Auth | No provider column in user_credentials | OPEN (backlog) |
| PREV-P0-PAYMONGO | P0 | Payments | Webhook signature verification | RESOLVED (code present, env var required) |
| PREV-P1-CORS | P1 | App | Wide-open CORS | STILL OPEN |
| PREV-P0-GIT-SECRETS | P0 | Secrets | Firebase SA + SSH keys in git history | STILL OPEN |

---

## LinkedIn OIDC Security Design Review

### Architecture Overview
```
Browser
  → GET /api/auth/linkedin/start         (generates state JWT, redirects to LinkedIn)
  → GET /api/auth/linkedin/callback      (validates state, exchanges code, issues one-time ticket)
  → FE /linkedin/complete?ticket=...     (FE extracts ticket from URL)
  → POST /api/auth/linkedin/complete     (exchanges ticket for Firebase custom token → ID token)
  → (if role_required) POST /api/auth/linkedin/choose-role
  → Firebase ID token returned to FE     (LinkedIn tokens never leave BE)
```

### Audit Questions Answered

**Q: State JWT shares secret with app JWT — is this a risk?**
A: Moderate risk (P2). The state JWT payload has `cv`, `nc`, `it`, `sc`, `rt` claims. Ticket JWTs have `jti`, `uid`, `status`, `intent`. These are structurally different but the same `HS256` secret signs both. An attacker who can forge a ticket JWT could submit it as a `state` parameter — but `verifyLinkedinState()` would succeed on structural grounds (it only checks `payload.cv` etc., which would be undefined). The `codeVerifier` would be undefined/null and the callback would proceed but fail at token exchange. Net: low exploitability but violates key separation principle.

**Q: Race condition on oauth_tickets across PM2 workers?**
A: NOT PRESENT for the main ticket. `consumeTicketDb` uses `UPDATE ... WHERE jti=$1 AND used_at IS NULL ... RETURNING` — PostgreSQL row-level locking ensures exactly one worker wins. The second worker gets 0 rows and the endpoint returns 400. Correct.

**Q: `linkedinPendingToken` — is it single-use?**
A: NO — this is LI-SEC-001. The pending token at line 408 is created with `makeTicketJwt` but is NOT stored in `oauth_tickets`. It has no DB entry to mark `used_at`. During its 5-minute window it can be submitted to `/choose-role` multiple times. `createLinkedinUser` has `ON CONFLICT DO NOTHING` guards, so the user won't be duplicated — but the endpoint can be called repeatedly, and each call attempts Firebase custom token creation and full session response.

**Q: Deterministic uid collision safety?**
A: `sha256('linkedin:' + liSub).slice(0,28)` — LinkedIn `sub` is a globally unique, stable identifier. SHA-256 over a namespaced string with 28 hex chars = 112 bits of effective uniqueness. No realistic collision risk.

**Q: `/complete` validates ticket correctly?**
A: YES for the main ticket. Order: JWT integrity (`decodeTicketJwt`) → DB existence + `used_at IS NULL` + `expires_at > NOW()` (`consumeTicketDb`). Both must pass. Correct.

**Q: `/unlink` checks identity ownership?**
A: YES. The DELETE query is `WHERE user_uid=$1 AND provider='linkedin'` where `$1 = req.user.uid` (set by `verifyFirebaseIdToken`). A user can only unlink their own LinkedIn identity.

**Q: PKCE removal — intentional?**
A: DOCUMENTED in code comment: "LinkedIn confidential clients authenticate via client_secret, so the PKCE code_verifier causes token exchange to fail with invalid_client." This is correct for confidential clients per OAuth 2.0 spec. The state JWT + client_secret provide equivalent protection.

**Q: Is state the only CSRF protection for the callback?**
A: Yes, and it is sufficient. The state is an HS256-signed JWT that can only be generated by the server. An attacker cannot forge a valid state. LinkedIn will reject callbacks where state doesn't match what was sent. The signed JWT also embeds a 10-minute expiry.

---

## PayMongo Webhook — Status Update

`verifyPaymongoSignature()` function is present and uses timing-safe comparison + replay window check (5 minutes). The idempotency ledger (`payment_webhook_events` table) is implemented with graceful degradation if not yet migrated. The webhook route applies `verifyPaymongoSignature` before processing.

**RESOLVED as code issue.** Remaining action: set `PAYMONGO_WEBHOOK_SECRET` in production `.env`. This is an external/ops action.

---

## V5 Findings Still Holding

| Finding | Status |
|---|---|
| BOLA employer routes (getUserCompanyForRequest pattern) | VERIFIED HOLDING |
| SQLi parameterization (all 8 controllers) | VERIFIED HOLDING |
| Hardcoded invite password | VERIFIED FIXED |
| Upload MIME magic-byte validation | VERIFIED HOLDING |
| Message body length cap | VERIFIED HOLDING |
| GA-SEC-001 requestUri fix | APPLIED in V5 |

---

## Recommended Fixes

### LI-SEC-001 Fix (P1-High — apply now)
Store the `linkedinPendingToken` in `oauth_tickets` the same way the main ticket is stored. In `linkedinComplete`, after creating `linkedinPendingToken`, extract the JTI and store it with `used_at=NULL`. In `linkedinChooseRole`, call `consumeTicketDb(jti)` before processing. This makes the pending token single-use.

### LI-SEC-003 Fix (P2 — apply in fast-follow)
Remove the double-conditional guard. Change:
```js
if (nonce && p.nonce && p.nonce !== nonce)
```
to:
```js
if (nonce && p.nonce !== nonce)
```
This ensures nonce mismatch always fails rather than silently passing when LinkedIn omits `nonce` from the ID token.

### LI-SEC-004 Fix (P3 — apply in fast-follow)
Embed email, firstName, lastName, photoUrl in the `makeTicketJwt` payload for the pending token, or pass them through an alternative mechanism (e.g., re-embed in the pending ticket's `data` field in `oauth_tickets` if LI-SEC-001 fix is applied).
