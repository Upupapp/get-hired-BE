# GETHIRED SECURE FIX LOG — V6
**Date:** 2026-07-01

This log records only fixes APPLIED in the V6 run. Findings identified but not fixed are in the risk register.

---

## Fixes Applied in V6

No code fixes were applied in V6. The V6 audit identified findings (LI-SEC-001 through LI-SEC-004) that require fixes, but these were not applied because:

1. **LI-SEC-001** requires storing the `linkedinPendingToken` in `oauth_tickets` — this is a correctness change in `linkedinComplete` and `linkedinChooseRole`. It should be reviewed and applied by the developer in context.
2. **LI-SEC-003** requires a one-line change to the nonce check. Deferred to fast-follow to avoid touching the live callback during audit.
3. **LI-SEC-004** requires embedding user profile fields in the pending token payload. Requires design decision (embed in JWT vs embed in DB via LI-SEC-001 fix).

---

## V5 Fix Applied (carried forward for reference)

| Fix ID | Description | File | Applied |
|---|---|---|---|
| GA-SF-001 | requestUri: 'https://gethiredonline.app' in signInWithIdp | googleAuthController.js:56 | V5 — DONE |
| RAWBODY-SF-001 | Preserve rawBody for PayMongo webhook signature | server.js | V5 — DONE |

---

## Recommended Fixes for Next Sprint

### FIX-V6-001: LI-SEC-001 — Make pending token single-use (P1-High)
**File:** `controllers/linkedinAuthController.js`
**In `linkedinComplete` (status === 'role_required' branch):**
After creating `linkedinPendingToken`, decode its JTI and store in `oauth_tickets`:
```javascript
var pendingDecoded = jwt.decode(linkedinPendingToken);
await storeTicket(pendingDecoded.jti, 'pending:linkedin:' + ticketData.liSub, 
  { type: 'pending_role', ...ticketData }, 
  new Date(pendingDecoded.exp * 1000).toISOString());
```
**In `linkedinChooseRole`:**
After decoding `pendingPayload`, extract JTI and call `consumeTicketDb(pendingPayload.jti)`. If null, return 400.

### FIX-V6-002: LI-SEC-003 — Strengthen nonce check (P2)
**File:** `controllers/linkedinAuthController.js`, line ~210
Change:
```javascript
if (nonce && p.nonce && p.nonce !== nonce) return redirectError('invalid_nonce');
```
To:
```javascript
if (nonce && p.nonce !== nonce) return redirectError('invalid_nonce');
```

### FIX-V6-003: LI-SEC-004 — Embed user data in pending token (P3)
**File:** `middleware/linkedinSession.js`, `makeTicketJwt` function
For pending tokens, pass email/firstName/lastName in the payload so `linkedinChooseRole` can use them as fallback.

### FIX-V6-004: Apply authLimiter to LinkedIn auth routes (P1)
**File:** `routes/linkedinAuthRoutes.js`
Apply the existing `authLimiter` middleware to `/complete`, `/choose-role`, and `/start`.
